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
    RouteInfo Route,
    FleetInfo Fleet);

public sealed record SchoolRouteInfo(int Id, string Name, double Lat, double Lon);

public sealed record BusStopInfo(
    string Name,
    double Lat,
    double Lon,
    int StudentCount,
    double EstimatedArrivalMin,
    IReadOnlyList<string> StudentNames);

/// <param name="Legs">
/// One element per Valhalla trip leg. Each element is an ordered list of
/// <c>[longitude, latitude]</c> pairs (GeoJSON coordinate order) decoded from
/// Valhalla's 6-precision encoded polyline.
/// </param>
public sealed record RouteInfo(
    IReadOnlyList<IReadOnlyList<double[]>> Legs,
    double TimeSec,
    double LengthKm);

public sealed record FleetInfo(
    int TotalStudents,
    int BusCapacity,
    int BusesNeeded);

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
            async (int id, int? busCapacity, ApplicationDbContext db, IValhallaClient valhalla, CancellationToken ct) =>
            {
                var capacity = busCapacity is > 0 ? busCapacity.Value : 50;
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

                // Extract home address + child name from each matching submission.
                var studentEntries = allSubmissions
                    .Where(s => GetStringValue(s.Values, "school") == schoolIdStr)
                    .Select(s => new
                    {
                        Address   = GetHomeAddress(s.Values),
                        ChildName = GetStringValue(s.Values, "childName") ?? "—",
                    })
                    .Where(e => e.Address is not null)
                    .ToList();

                if (studentEntries.Count == 0)
                    return Results.UnprocessableEntity(
                        new { message = "No form submissions with home addresses found for this school." });

                // 3 & 4. Nearest bus stop per home address (deduplicated, with student names)
                var waypoints      = new List<ValhallaLocation>();
                var stopNames      = new List<string>();
                var stopCoords     = new List<(double Lat, double Lon)>();
                var studentCounts  = new List<int>();
                var studentNamesList = new List<List<string>>();
                var stopIndexById  = new Dictionary<int, int>(); // busStopId → index

                foreach (var entry in studentEntries)
                {
                    var addr = entry.Address!.Value;
                    var searchPoint = new Point(addr.Lon, addr.Lat) { SRID = 4326 };

                    var nearest = await db.BusStops
                        .AsNoTracking()
                        .Where(b => b.Geom != null)
                        .OrderBy(b => b.Geom.Distance(searchPoint))
                        .FirstOrDefaultAsync(ct);

                    if (nearest is null) continue;

                    if (stopIndexById.TryGetValue(nearest.Id, out var idx))
                    {
                        studentCounts[idx]++;
                        studentNamesList[idx].Add(entry.ChildName);
                    }
                    else
                    {
                        var lat = nearest.Geom.Coordinate.Y;
                        var lon = nearest.Geom.Coordinate.X;
                        stopIndexById[nearest.Id] = waypoints.Count;
                        waypoints.Add(new ValhallaLocation { Lat = lat, Lon = lon });
                        stopNames.Add(nearest.Name ?? "");
                        stopCoords.Add((lat, lon));
                        studentCounts.Add(1);
                        studentNamesList.Add([entry.ChildName]);
                    }
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

                // Reorder stop data to match visit order (arrival times filled after routing).
                var orderedNames        = visitOrder.Select(i => stopNames[i]).ToList();
                var orderedCoords       = visitOrder.Select(i => stopCoords[i]).ToList();
                var orderedStudents     = visitOrder.Select(i => studentCounts[i]).ToList();
                var orderedStudentNames = visitOrder.Select(i => (IReadOnlyList<string>)studentNamesList[i]).ToList();

                // 5c. Re-route with break_through at every intermediate stop so Valhalla
                //     cannot insert a U-turn at any pickup point.
                //     Valhalla caps /route at 20 locations, so we chunk into batches of 18
                //     stops + 1 bridge/destination, stitching the legs afterwards.
                var breakThroughStops = visitOrder
                    .Select(i => new ValhallaLocation
                    {
                        Lat  = waypoints[i].Lat,
                        Lon  = waypoints[i].Lon,
                        Type = "break_through",
                    })
                    .ToList();

                var schoolLocation = new ValhallaLocation
                    { Lat = schoolLat, Lon = schoolLon, Type = "break" };

                List<string> shapes;
                List<double> legTimesSec;
                double timeSec, lengthKm;
                try
                {
                    (shapes, legTimesSec, timeSec, lengthKm) =
                        await GetChunkedRouteAsync(valhalla, breakThroughStops, schoolLocation, ct);
                }
                catch (HttpRequestException ex)
                {
                    return Results.Problem(
                        detail: $"Valhalla routing engine error (route): {ex.Message}",
                        statusCode: 502);
                }

                // 6. Compute estimated arrival at each stop (cumulative leg times).
                //    Stop 0 = departure point (arrival 0 min).
                //    Leg[j] connects stop j → stop j+1, so arrival at stop i = sum(leg[0..i-1]).
                var orderedBusStops = new List<BusStopInfo>();
                double cumulativeSec = 0;
                for (int i = 0; i < orderedCoords.Count; i++)
                {
                    orderedBusStops.Add(new BusStopInfo(
                        Name:                orderedNames[i],
                        Lat:                 orderedCoords[i].Lat,
                        Lon:                 orderedCoords[i].Lon,
                        StudentCount:        orderedStudents[i],
                        EstimatedArrivalMin: Math.Round(cumulativeSec / 60.0, 1),
                        StudentNames:        orderedStudentNames[i]));
                    if (i < legTimesSec.Count)
                        cumulativeSec += legTimesSec[i];
                }

                // 7. Fleet sizing
                var totalStudents = orderedStudents.Sum();
                var busesNeeded   = (int)Math.Ceiling((double)totalStudents / capacity);

                var legs = shapes
                    .Select(s => (IReadOnlyList<double[]>)DecodePolyline(s))
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
                        TimeSec:   timeSec,
                        LengthKm:  lengthKm),
                    Fleet: new FleetInfo(
                        TotalStudents: totalStudents,
                        BusCapacity:   capacity,
                        BusesNeeded:   busesNeeded));

                return Results.Ok(response);
            })
           .WithName("GetOptimizedRouteToSchool")
           .WithTags("Routing");

        return app;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Routes through <paramref name="stops"/> (all typed <c>break_through</c>) ending at
    /// <paramref name="destination"/> (<c>break</c>), splitting into chunks of 18 stops to
    /// stay under Valhalla's 20-location-per-request limit.  Returns per-leg shapes,
    /// per-leg durations, and cumulative totals.
    /// </summary>
    private static async Task<(List<string> Shapes, List<double> LegTimesSec, double TimeSec, double LengthKm)>
        GetChunkedRouteAsync(
            IValhallaClient valhalla,
            List<ValhallaLocation> stops,
            ValhallaLocation destination,
            CancellationToken ct)
    {
        const int chunkSize = 18; // 18 intermediate stops + 1 end = 19 ≤ 20 limit

        var allShapes   = new List<string>();
        var allLegTimes = new List<double>();
        double totalTime   = 0;
        double totalLength = 0;

        for (int i = 0; i < stops.Count; i += chunkSize)
        {
            var chunkStops = stops.Skip(i).Take(chunkSize).ToList();
            bool isLast    = i + chunkSize >= stops.Count;

            ValhallaLocation endLocation;
            if (isLast)
            {
                endLocation = destination;
            }
            else
            {
                var bridge = stops[i + chunkSize];
                endLocation = new ValhallaLocation { Lat = bridge.Lat, Lon = bridge.Lon, Type = "break" };
            }

            var chunkResponse = await valhalla.GetRouteAsync(
                new ValhallaRouteRequest
                {
                    Locations = [.. chunkStops, endLocation],
                    Costing   = "auto",
                },
                ct);

            allShapes.AddRange(chunkResponse.Trip.Legs.Select(l => l.Shape));
            allLegTimes.AddRange(chunkResponse.Trip.Legs.Select(l => l.Summary.Time));
            totalTime   += chunkResponse.Trip.Summary.Time;
            totalLength += chunkResponse.Trip.Summary.Length;
        }

        return (allShapes, allLegTimes, totalTime, totalLength);
    }

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
