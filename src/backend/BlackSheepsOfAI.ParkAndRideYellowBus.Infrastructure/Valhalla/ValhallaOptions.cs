namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Configuration options for the Valhalla routing engine.
/// Bound from the "Valhalla" section of appsettings.json.
/// </summary>
public sealed class ValhallaOptions
{
    public const string SectionName = "Valhalla";

    /// <summary>Base URL of the Valhalla instance, e.g. "http://localhost:8002".</summary>
    public string BaseUrl { get; set; } = "http://localhost:8002";
}
