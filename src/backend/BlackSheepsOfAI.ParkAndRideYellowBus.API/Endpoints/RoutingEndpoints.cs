using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;
using Microsoft.EntityFrameworkCore;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;

public static class RoutingEndpoints
{
    public static IEndpointRouteBuilder MapRoutingEndpoints(this IEndpointRouteBuilder app)
    {
        // POST /routing/school/{id}
        // Uses the school's location as the fixed destination for an optimized
        // route computed by Valhalla.
        app.MapPost("/routing/school/{id:int}",
            async (int id, OptimizedRouteToSchoolRequest request, ApplicationDbContext db,
                   IValhallaClient valhalla, CancellationToken ct) =>
            {
                var school = await db.Schools
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == id, ct);

                if (school is null)
                    return Results.NotFound();

                var valhallaRequest = new ValhallaOptimizedRouteRequest
                {
                    Locations   = request.Waypoints,
                    Destination = new ValhallaLocation
                    {
                        Lat = school.Geom.Coordinate.Y,
                        Lon = school.Geom.Coordinate.X
                    },
                    Costing = request.Costing
                };

                var route = await valhalla.GetOptimizedRouteAsync(valhallaRequest, ct);
                return Results.Ok(route);
            })
           .WithName("GetOptimizedRouteToSchool")
           .WithTags("Routing");

        return app;
    }
}

/// <summary>
/// Waypoints to visit on the way to the school (can be reordered by Valhalla).
/// </summary>
public sealed record OptimizedRouteToSchoolRequest(
    IReadOnlyList<ValhallaLocation> Waypoints,
    string Costing = "auto");
