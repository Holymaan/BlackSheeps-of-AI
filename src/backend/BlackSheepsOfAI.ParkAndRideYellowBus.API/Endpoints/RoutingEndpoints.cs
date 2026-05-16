using System.Text.Json;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;

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
                var waypoints  = new List<ValhallaLocation>();
                var seenStopIds = new HashSet<int>();

                foreach (var addr in homeAddresses)
                {
                    // PostGIS translates .Distance() to ST_Distance
                    var searchPoint = new Point(addr.Lon, addr.Lat) { SRID = 4326 };

                    var nearest = await db.BusStops
                        .AsNoTracking()
                        .Where(b => b.Geom != null)
                        .OrderBy(b => b.Geom.Distance(searchPoint))
                        .FirstOrDefaultAsync(ct);

                    if (nearest is null || !seenStopIds.Add(nearest.Id))
                        continue;

                    waypoints.Add(new ValhallaLocation
                    {
                        Lat = nearest.Geom.Coordinate.Y,
                        Lon = nearest.Geom.Coordinate.X
                    });
                }

                // 5. Optimized route: bus stops → school
                var valhallaRequest = new ValhallaOptimizedRouteRequest
                {
                    Locations   = waypoints,
                    Destination = new ValhallaLocation
                    {
                        Lat = school.Geom.Coordinate.Y,
                        Lon = school.Geom.Coordinate.X
                    },
                    Costing = "auto"
                };

                var route = await valhalla.GetOptimizedRouteAsync(valhallaRequest, ct);
                return Results.Ok(route);
            })
           .WithName("GetOptimizedRouteToSchool")
           .WithTags("Routing");

        return app;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>Reads a string value from the submission values dictionary.</summary>
    private static string? GetStringValue(Dictionary<string, object?> values, string key)
    {
        if (!values.TryGetValue(key, out var raw)) return null;
        return raw is JsonElement je ? je.GetString() : raw?.ToString();
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
