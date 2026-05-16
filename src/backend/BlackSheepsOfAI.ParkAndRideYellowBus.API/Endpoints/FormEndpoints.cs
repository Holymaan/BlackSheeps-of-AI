using BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;

/// <summary>
/// Minimal API endpoints for managing form definitions and their submissions.
/// </summary>
public static class FormEndpoints
{
    /// <summary>Maps the <c>/form</c> routes onto the application.</summary>
    public static IEndpointRouteBuilder MapFormEndpoints(this IEndpointRouteBuilder app)
    {
        // POST /form — creates a new form definition.
        app.MapPost("/form",
            async (CreateFormRequest request, ApplicationDbContext db, CancellationToken ct) =>
            {
                var form = new FormDefinition
                {
                    Title = request.Title,
                    Description = request.Description,
                    Version = request.Version,
                    Fields = request.Fields ?? [],
                };

                db.FormDefinitions.Add(form);
                await db.SaveChangesAsync(ct);

                return Results.Created($"/form/{form.Id}", form);
            })
           .WithName("CreateForm")
           .WithTags("Forms");

        // GET /form/{id} — returns the form definition for the frontend to render.
        app.MapGet("/form/{id:guid}",
            async (Guid id, ApplicationDbContext db, CancellationToken ct) =>
            {
                var form = await db.FormDefinitions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(f => f.Id == id, ct);

                return form is null ? Results.NotFound() : Results.Ok(form);
            })
           .WithName("GetForm")
           .WithTags("Forms");

        // POST /form/{id}/submission — persists a filled-out form for processing.
        // Returns 404 when the referenced form does not exist.
        app.MapPost("/form/{id:guid}/submission",
            async (Guid id, SubmitFormRequest request, ApplicationDbContext db, CancellationToken ct) =>
            {
                var formExists = await db.FormDefinitions.AnyAsync(f => f.Id == id, ct);
                if (!formExists)
                    return Results.NotFound();

                var submission = new FormSubmission
                {
                    FormId = id,
                    FormVersion = request.FormVersion,
                    Values = request.Values ?? [],
                };

                db.FormSubmissions.Add(submission);
                await db.SaveChangesAsync(ct);

                return Results.Created(
                    $"/form/{id}/submission/{submission.SubmissionId}", submission);
            })
           .WithName("SubmitForm")
           .WithTags("Forms");

        // GET /form/{id}/submission/{submissionId} — reads back a stored submission.
        app.MapGet("/form/{id:guid}/submission/{submissionId:guid}",
            async (Guid id, Guid submissionId, ApplicationDbContext db, CancellationToken ct) =>
            {
                var submission = await db.FormSubmissions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        s => s.SubmissionId == submissionId && s.FormId == id, ct);

                return submission is null
                    ? Results.NotFound()
                    : Results.Ok(submission);
            })
           .WithName("GetSubmission")
           .WithTags("Forms");

        return app;
    }
}

/// <summary>
/// Request body for <c>POST /form</c>. The form id is assigned server-side.
/// </summary>
public sealed record CreateFormRequest(
    string Title,
    string? Description,
    int Version,
    List<FormField> Fields);

/// <summary>
/// Request body for <c>POST /form/{id}/submission</c>. The form id comes from
/// the route; the submission id and timestamp are assigned server-side.
/// </summary>
/// <param name="FormVersion">Version of the form definition that was rendered.</param>
/// <param name="Values">Field values keyed by <see cref="FormField.Key"/>.</param>
public sealed record SubmitFormRequest(int FormVersion, Dictionary<string, object?> Values);
