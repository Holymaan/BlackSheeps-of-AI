using BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;

/// <summary>
/// EF Core database context for the ŽutiBus backend (PostgreSQL).
/// Add <c>DbSet&lt;T&gt;</c> properties here as domain entities are introduced,
/// and place per-entity <c>IEntityTypeConfiguration&lt;T&gt;</c> classes in this
/// assembly — they are picked up automatically by <see cref="OnModelCreating"/>.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    /// <summary>Form definitions renderable by the frontend.</summary>
    public DbSet<FormDefinition> FormDefinitions => Set<FormDefinition>();

    /// <summary>Submitted forms, persisted for further processing.</summary>
    public DbSet<FormSubmission> FormSubmissions => Set<FormSubmission>();

    public DbSet<BusStop> BusStops => Set<BusStop>();
    public DbSet<School> Schools => Set<School>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Applies every IEntityTypeConfiguration<T> defined in this assembly.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
