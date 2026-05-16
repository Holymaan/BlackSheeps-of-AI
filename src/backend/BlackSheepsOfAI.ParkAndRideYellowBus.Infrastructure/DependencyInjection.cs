using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure;

/// <summary>
/// Composition root for the Infrastructure layer — call <see cref="AddInfrastructure"/>
/// from the API's <c>Program.cs</c> to register EF Core / PostgreSQL services.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' was not found in configuration.");

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString, o => o.UseNetTopologySuite())
                   .UseSnakeCaseNamingConvention());

        // Valhalla routing engine — typed HTTP client
        var valhallaOptions = configuration
            .GetSection(ValhallaOptions.SectionName)
            .Get<ValhallaOptions>() ?? new ValhallaOptions();

        services
            .AddHttpClient<IValhallaMatrixClient, ValhallaMatrixClient>(client =>
            {
                client.BaseAddress = new Uri(valhallaOptions.BaseUrl);
            });

        return services;
    }
}
