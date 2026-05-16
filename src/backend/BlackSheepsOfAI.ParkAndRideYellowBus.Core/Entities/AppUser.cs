namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public required string Role { get; set; }
}
