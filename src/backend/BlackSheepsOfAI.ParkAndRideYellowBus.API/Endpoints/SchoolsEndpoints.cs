using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;

public static class SchoolsEndpoints
{
    public static IEndpointRouteBuilder MapSchoolsEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /schools — returns every school with its centroid coordinates so the
        // frontend can populate a dropdown and know where to pin a marker.
        app.MapGet("/schools", async (ApplicationDbContext db, CancellationToken ct) =>
        {
            var schools = await db.Schools
                .AsNoTracking()
                .Select(s => new
                {
                    s.Id,
                    s.Name,
                    Lat = s.Geom.Coordinate.Y,
                    Lon = s.Geom.Coordinate.X,
                })
                .OrderBy(s => s.Name)
                .ToListAsync(ct);

            return Results.Ok(schools);
        })
        .WithName("ListSchools")
        .WithTags("Schools");

        return app;
    }
}
