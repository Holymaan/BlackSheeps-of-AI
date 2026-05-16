using BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;
using BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.API;

/// <summary>
/// Seeds the database with sample form definitions on startup (development only).
/// </summary>
public static class SeedData
{
    /// <summary>
    /// Well-known id of the sample "Child School Registration" form — shared
    /// across seed data, example JSON files, and the <c>.http</c> file.
    /// </summary>
    public static readonly Guid SampleSchoolFormId =
        Guid.Parse("3f1a7c9e-2b8d-4e6f-a1b2-c3d4e5f60718");

    public static readonly Guid AdminUserId =
        Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    /// <summary>
    /// Inserts the sample school-registration form when it does not yet exist.
    /// </summary>
    public static void EnsureSampleData(ApplicationDbContext db)
    {
        if (!db.AppUsers.Any(u => u.Id == AdminUserId))
        {
            db.AppUsers.Add(new AppUser
            {
                Id = AdminUserId,
                Username = "admin",
                PasswordHash = AuthEndpoints.HashPassword("admin123"),
                Role = "Admin",
            });
            db.SaveChanges();
        }

        if (db.FormDefinitions.Any(f => f.Id == SampleSchoolFormId))
            return;

        db.FormDefinitions.Add(BuildSampleSchoolForm());
        db.SaveChanges();
    }

    private static FormDefinition BuildSampleSchoolForm() => new()
    {
        Id = SampleSchoolFormId,
        Title = "Child School Registration",
        Description = "Park & Ride ŽutiBus — register a child for school transport.",
        Version = 1,
        Fields =
        [
            new FormField
            {
                Key = "parentOib",
                Label = "Parent OIB",
                Type = FieldType.Oib,
                Required = true,
                Placeholder = "12345678901",
                HelpText = "Croatian personal identification number of the parent/guardian — exactly 11 digits.",
                Validation = new FieldValidation
                {
                    Pattern = @"^\d{11}$",
                    MinLength = 11,
                    MaxLength = 11,
                    ErrorMessage = "OIB must be exactly 11 digits.",
                },
            },
            new FormField
            {
                Key = "name",
                Label = "Name",
                Type = FieldType.String,
                Required = true,
                Placeholder = "Ivan",
            },
            new FormField
            {
                Key = "lastName",
                Label = "Last name",
                Type = FieldType.String,
                Required = true,
                Placeholder = "Horvat",
            },
            new FormField
            {
                Key = "childName",
                Label = "Child name",
                Type = FieldType.String,
                Required = true,
                Placeholder = "Marko",
            },
            new FormField
            {
                Key = "school",
                Label = "School",
                Type = FieldType.Select,
                Required = true,
                HelpText = "Select the child's school.",
                Options =
                [
                    new SelectOption { Id = "os-ivana-gundulica", DisplayName = "OŠ Ivana Gundulića" },
                    new SelectOption { Id = "os-antuna-mihanovica", DisplayName = "OŠ Antuna Mihanovića" },
                    new SelectOption { Id = "os-augusta-senoe", DisplayName = "OŠ Augusta Šenoe" },
                ],
            },
            new FormField
            {
                Key = "homeAddress",
                Label = "Home address",
                Type = FieldType.AddressPoint,
                Required = true,
                HelpText = "Pick the pickup address on the map.",
            },
        ],
    };
}
