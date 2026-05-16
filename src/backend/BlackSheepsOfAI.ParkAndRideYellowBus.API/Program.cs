using System.Text;
using System.Text.Json.Serialization;
using BlackSheepsOfAI.ParkAndRideYellowBus.API;
using BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Omit null properties from JSON responses so the wire format stays compact
// and matches the form schema examples (optional fields are simply absent).
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull);

// JWT Bearer authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Admin", policy => policy.RequireRole("Admin"));

// EF Core / PostgreSQL — see Infrastructure/DependencyInjection.cs
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Apply any pending EF Core migrations on startup (development only). In
    // production, run `dotnet ef database update` as a deliberate deploy step.
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.Migrate();
        SeedData.EnsureSampleData(db);
    }

    // OpenAPI document served at /openapi/v1.json
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Liveness probe — also a quick smoke test that the host is running.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
   .WithName("HealthCheck");

// Auth endpoints — see Endpoints/AuthEndpoints.cs
app.MapAuthEndpoints();

// Form definition endpoints — see Endpoints/FormEndpoints.cs
app.MapFormEndpoints();

// Routing endpoints — see Endpoints/RoutingEndpoints.cs
app.MapRoutingEndpoints();

app.Run();
