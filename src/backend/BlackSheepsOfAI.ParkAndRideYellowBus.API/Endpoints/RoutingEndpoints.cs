using System.Text.Json;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;

// ── Response DTOs ─────────────────────────────────────────────────────────────

public sealed record SchoolRouteResponse(
    SchoolRouteInfo School,
    IReadOnlyList<BusStopInfo> BusStops,
    RouteInfo Route);

public sealed record SchoolRouteInfo(int Id, string Name, double Lat, double Lon);
public sealed record BusStopInfo(double Lat, double Lon);

/// <param name="Legs">
/// One element per Valhalla trip leg. Each element is an ordered list of
/// <c>[longitude, latitude]</c> pairs (GeoJSON coordinate order) decoded from
/// Valhalla's 6-precision encoded polyline.
/// </param>
public sealed record RouteInfo(
    IReadOnlyList<IReadOnlyList<double[]>> Legs,
    double TimeSec,
    double LengthKm);

// ── Endpoint ──────────────────────────────────────────────────────────────────

public static class RoutingEndpoints
{
    public static IEndpointRouteBuilder MapRoutingEndpoints(this IEndpointRouteBuilder app)
    {
        // POST /routing/school/{id}
        // 1. Looks up the school by id.
        // 2. Finds all FormSubmissions whose values["school"] matches this school's id.
        // 3. Extracts homeAddress lat/lon from each submission.
        // 4. For every home address, finds the nearest bus stop via PostGIS distance.
        // 5. Runs Valhalla optimized route: unique bus stops as waypoints, school as destination.
        // 6. Returns school info, bus stop coordinates, and decoded route geometry.
        app.MapPost("/routing/school/{id:int}",
            async (int id, ApplicationDbContext db, IValhallaClient valhalla, CancellationToken ct) =>
            {
                // 1. School lookup
                var school = await db.Schools
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == id, ct);

                if (school is null)
                    return Results.NotFound();

                // 2. Form submissions for this school
                var schoolIdStr = id.ToString();
                var allSubmissions = await db.FormSubmissions
                    .AsNoTracking()
                    .ToListAsync(ct);

                var homeAddresses = allSubmissions
                    .Where(s => GetStringValue(s.Values, "school") == schoolIdStr)
                    .Select(s => GetHomeAddress(s.Values))
                    .OfType<(double Lat, double Lon)>()
                    .ToList();

                if (homeAddresses.Count == 0)
                    return Results.UnprocessableEntity(
                        new { message = "No form submissions with home addresses found for this school." });

                // 3 & 4. Nearest bus stop per home address (deduplicated)
                var waypoints   = new List<ValhallaLocation>();
                var busStops    = new List<BusStopInfo>();
                var seenStopIds = new HashSet<int>();

                foreach (var addr in homeAddresses)
                {
                    var searchPoint = new Point(addr.Lon, addr.Lat) { SRID = 4326 };

                    var nearest = await db.BusStops
                        .AsNoTracking()
                        .Where(b => b.Geom != null)
                        .OrderBy(b => b.Geom.Distance(searchPoint))
                        .FirstOrDefaultAsync(ct);

                    if (nearest is null || !seenStopIds.Add(nearest.Id))
                        continue;

                    var lat = nearest.Geom.Coordinate.Y;
                    var lon = nearest.Geom.Coordinate.X;
                    waypoints.Add(new ValhallaLocation { Lat = lat, Lon = lon });
                    busStops.Add(new BusStopInfo(lat, lon));
                }

                var schoolLat = school.Geom.Coordinate.Y;
                var schoolLon = school.Geom.Coordinate.X;

                // 5a. Ask Valhalla for the optimal stop ordering (TSP).
                //     We only care about the reordered location list, not the route geometry.
                var optimizeRequest = new ValhallaOptimizedRouteRequest
                {
                    Locations   = waypoints,
                    Destination = new ValhallaLocation { Lat = schoolLat, Lon = schoolLon },
                    Costing     = "auto",
                };

                ValhallaOptimizedRouteResponse optimized;
                try
                {
                    optimized = await valhalla.GetOptimizedRouteAsync(optimizeRequest, ct);
                }
                catch (HttpRequestException ex)
                {
                    return Results.Problem(
                        detail: $"Valhalla routing engine error (optimise): {ex.Message}",
                        statusCode: 502);
                }

                // 5b. Reconstruct the visit order from Valhalla's original_index values.
                //     trip.locations are already in visit order; original_index maps each back
                //     to the input waypoints array.  Skip the last entry — that is the school.
                var visitOrder = optimized.Trip.Locations
                    .Take(optimized.Trip.Locations.Count - 1)   // drop the destination
                    .Select(l => l.OriginalIndex)
                    .ToList();

                // Reorder busStops to match the visit order so the sidebar list stays in sync.
                var orderedBusStops = visitOrder.Select(i => busStops[i]).ToList();

                // 5c. Re-route with break_through at every intermediate stop so Valhalla
                //     cannot insert a U-turn at any pickup point.
                var routeLocations = visitOrder
                    .Select(i => new ValhallaLocation
                    {
                        Lat  = waypoints[i].Lat,
                        Lon  = waypoints[i].Lon,
                        Type = "break_through",   // stop here, but keep going in the same direction
                    })
                    .Append(new ValhallaLocation { Lat = schoolLat, Lon = schoolLon, Type = "break" })
                    .ToList();

                ValhallaOptimizedRouteResponse route;
                try
                {
                    route = await valhalla.GetRouteAsync(
                        new ValhallaRouteRequest { Locations = routeLocations, Costing = "auto" },
                        ct);
                }
                catch (HttpRequestException ex)
                {
                    return Results.Problem(
                        detail: $"Valhalla routing engine error (route): {ex.Message}",
                        statusCode: 502);
                }

                // 6. Build enriched response
                var legs = route.Trip.Legs
                    .Select(leg => (IReadOnlyList<double[]>)DecodePolyline(leg.Shape))
                    .ToList();

                var response = new SchoolRouteResponse(
                    School: new SchoolRouteInfo(
                        school.Id,
                        school.Name,
                        schoolLat,
                        schoolLon),
                    BusStops: orderedBusStops,
                    Route: new RouteInfo(
                        Legs:      legs,
                        TimeSec:   route.Trip.Summary.Time,
                        LengthKm:  route.Trip.Summary.Length));

                return Results.Ok(response);
            })
           .WithName("GetOptimizedRouteToSchool")
           .WithTags("Routing");

        return app;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Decodes a Valhalla encoded-polyline string (precision 6) into an ordered
    /// list of <c>[longitude, latitude]</c> pairs ready for GeoJSON.
    /// </summary>
    private static List<double[]> DecodePolyline(string encoded, int precision = 6)
    {
        if (string.IsNullOrEmpty(encoded)) return [];

        var factor = Math.Pow(10, precision);
        var result = new List<double[]>();
        int index = 0, lat = 0, lng = 0;

        while (index < encoded.Length)
        {
            // Decode latitude delta
            int shift = 0, delta = 0, b;
            do { b = encoded[index++] - 63; delta |= (b & 0x1F) << shift; shift += 5; }
            while (b >= 0x20);
            lat += (delta & 1) != 0 ? ~(delta >> 1) : delta >> 1;

            // Decode longitude delta
            shift = 0; delta = 0;
            do { b = encoded[index++] - 63; delta |= (b & 0x1F) << shift; shift += 5; }
            while (b >= 0x20);
            lng += (delta & 1) != 0 ? ~(delta >> 1) : delta >> 1;

            // GeoJSON order: [lon, lat]
            result.Add([lng / factor, lat / factor]);
        }

        return result;
    }

    private static string? GetStringValue(Dictionary<string, object?> values, string key)
    {
        if (!values.TryGetValue(key, out var raw)) return null;
        if (raw is not JsonElement je) return raw?.ToString();
        return je.ValueKind == JsonValueKind.Number ? je.GetRawText() : je.GetString();
    }

    /// <summary>
    /// Extracts lat/lon from the <c>homeAddress</c> entry in the submission values.
    /// Returns null if the key is missing or the shape doesn't match.
    /// </summary>
    private static (double Lat, double Lon)? GetHomeAddress(Dictionary<string, object?> values)
    {
        if (!values.TryGetValue("homeAddress", out var raw)) return null;

        try
        {
            var je = raw is JsonElement element
                ? element
                : JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(raw));

            return (je.GetProperty("lat").GetDouble(), je.GetProperty("lon").GetDouble());
        }
        catch { return null; }
    }
}
