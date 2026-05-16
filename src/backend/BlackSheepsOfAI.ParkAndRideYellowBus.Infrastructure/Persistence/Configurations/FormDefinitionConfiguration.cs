using System.Text.Json;
using BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core mapping for <see cref="FormDefinition"/>. The <see cref="FormDefinition.Fields"/>
/// list is stored as a single PostgreSQL <c>jsonb</c> column so the entire form
/// schema round-trips as one document.
/// </summary>
public sealed class FormDefinitionConfiguration : IEntityTypeConfiguration<FormDefinition>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public void Configure(EntityTypeBuilder<FormDefinition> builder)
    {
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Id)
            .ValueGeneratedNever();

        builder.Property(f => f.Title)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(f => f.Version)
            .IsRequired();

        // Store the ordered list of form fields as a single jsonb column.
        var fieldsConverter = new ValueConverter<List<FormField>, string>(
            v => JsonSerializer.Serialize(v, JsonOptions),
            v => JsonSerializer.Deserialize<List<FormField>>(v, JsonOptions) ?? new List<FormField>());

        var fieldsComparer = new ValueComparer<List<FormField>>(
            (a, b) => JsonSerializer.Serialize(a, JsonOptions) == JsonSerializer.Serialize(b, JsonOptions),
            v => JsonSerializer.Serialize(v, JsonOptions).GetHashCode(),
            v => JsonSerializer.Deserialize<List<FormField>>(
                     JsonSerializer.Serialize(v, JsonOptions), JsonOptions) ?? new List<FormField>());

        builder.Property(f => f.Fields)
            .HasColumnType("jsonb")
            .HasConversion(fieldsConverter, fieldsComparer);
    }
}
