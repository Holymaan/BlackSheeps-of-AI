using System.Text.Json;
using BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core mapping for <see cref="FormSubmission"/>. The free-form
/// <see cref="FormSubmission.Values"/> dictionary is stored as a single
/// PostgreSQL <c>jsonb</c> column. Table and column names are lower
/// snake_case, applied globally by the naming-convention plugin.
/// </summary>
public sealed class FormSubmissionConfiguration : IEntityTypeConfiguration<FormSubmission>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public void Configure(EntityTypeBuilder<FormSubmission> builder)
    {
        builder.HasKey(s => s.SubmissionId);

        // The id is assigned in the domain (Guid.NewGuid()), never by the database.
        builder.Property(s => s.SubmissionId)
            .ValueGeneratedNever();

        builder.Property(s => s.FormId)
            .IsRequired();

        builder.HasOne<FormDefinition>()
            .WithMany()
            .HasForeignKey(s => s.FormId);

        builder.Property(s => s.FormVersion)
            .IsRequired();

        builder.Property(s => s.SubmittedAt)
            .IsRequired();

        // Store the answer dictionary as jsonb. The value comparer makes EF
        // change-tracking compare the dictionary by content rather than by reference.
        var valuesConverter = new ValueConverter<Dictionary<string, object?>, string>(
            v => JsonSerializer.Serialize(v, JsonOptions),
            v => JsonSerializer.Deserialize<Dictionary<string, object?>>(v, JsonOptions)
                 ?? new Dictionary<string, object?>());

        var valuesComparer = new ValueComparer<Dictionary<string, object?>>(
            (a, b) => JsonSerializer.Serialize(a, JsonOptions) == JsonSerializer.Serialize(b, JsonOptions),
            v => JsonSerializer.Serialize(v, JsonOptions).GetHashCode(),
            v => JsonSerializer.Deserialize<Dictionary<string, object?>>(
                     JsonSerializer.Serialize(v, JsonOptions), JsonOptions)
                 ?? new Dictionary<string, object?>());

        builder.Property(s => s.Values)
            .HasColumnType("jsonb")
            .HasConversion(valuesConverter, valuesComparer);
    }
}
