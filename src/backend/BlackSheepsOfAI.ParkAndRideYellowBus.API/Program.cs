using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// EF Core / PostgreSQL — see Infrastructure/DependencyInjection.cs
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // OpenAPI document served at /openapi/v1.json
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Liveness probe — also a quick smoke test that the host is running.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
   .WithName("HealthCheck");

app.Run();
