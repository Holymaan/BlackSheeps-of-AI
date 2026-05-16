using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.API.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/auth/login",
            async (LoginRequest request, ApplicationDbContext db, IConfiguration config, CancellationToken ct) =>
            {
                var user = await db.AppUsers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Username == request.Username, ct);

                if (user is null || !VerifyPassword(request.Password, user.PasswordHash))
                    return Results.Json(new { error = "Invalid credentials." }, statusCode: 401);

                var token = GenerateToken(user.Id, user.Username, user.Role, config);

                return Results.Ok(new { token, username = user.Username, role = user.Role });
            })
           .WithName("Login")
           .WithTags("Auth")
           .AllowAnonymous();

        return app;
    }

    private static string GenerateToken(Guid userId, string username, string role, IConfiguration config)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(config["Jwt:Key"]!));

        var claims = new Claim[]
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, username),
            new(ClaimTypes.Role, role),
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private static bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var storedHash = Convert.FromBase64String(parts[1]);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(hash, storedHash);
    }
}

public sealed record LoginRequest(string Username, string Password);
