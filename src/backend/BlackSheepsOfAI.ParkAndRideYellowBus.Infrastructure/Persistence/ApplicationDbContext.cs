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

    // Example — add real entities later:
    // public DbSet<Submission> Submissions => Set<Submission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Applies every IEntityTypeConfiguration<T> defined in this assembly.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
