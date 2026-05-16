using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;

/// <summary>
/// Design-time factory used by the EF Core tools (<c>dotnet ef</c>).
///
/// Because this factory exists, migration commands can target the Infrastructure
/// project on its own — the API project is never needed to add or apply migrations:
///
/// <code>
/// dotnet ef migrations add &lt;Name&gt; \
///   --project        BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure \
///   --startup-project BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure
/// </code>
///
/// The connection string is read from the <c>ZUTIBUS_DB_CONNECTION</c> environment
/// variable when set, otherwise a local-development default is used. The value
/// only has to be reachable for <c>dotnet ef database update</c>; <c>migrations add</c>
/// does not connect to the database.
/// </summary>
public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    private const string DefaultConnectionString =
        "Host=localhost;Port=5432;Database=zutibus;Username=postgres;Password=postgres";

    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var connectionString =
            Environment.GetEnvironmentVariable("ZUTIBUS_DB_CONNECTION")
            ?? DefaultConnectionString;

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new ApplicationDbContext(options);
    }
}
