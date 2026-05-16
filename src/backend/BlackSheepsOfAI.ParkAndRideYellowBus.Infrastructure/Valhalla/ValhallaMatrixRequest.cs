using System.Text.Json.Serialization;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Request body for the Valhalla /sources_to_targets matrix endpoint.
/// </summary>
public sealed class ValhallaMatrixRequest
{
    [JsonPropertyName("sources")]
    public IReadOnlyList<ValhallaLocation> Sources { get; init; } = [];

    [JsonPropertyName("targets")]
    public IReadOnlyList<ValhallaLocation> Targets { get; init; } = [];

    /// <summary>Valhalla costing model, e.g. "auto", "pedestrian", "bicycle".</summary>
    [JsonPropertyName("costing")]
    public string Costing { get; init; } = "auto";
}

public sealed class ValhallaLocation
{
    [JsonPropertyName("lat")]
    public double Lat { get; init; }

    [JsonPropertyName("lon")]
    public double Lon { get; init; }

    /// <summary>
    /// Valhalla location type: "break" (default stop, U-turns allowed),
    /// "break_through" (stop, but route must continue in the same direction — no U-turns),
    /// "through" (pass-through, no stop), "via" (soft waypoint).
    /// Omitted when null so it does not appear in matrix/optimized-route payloads.
    /// </summary>
    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Type { get; init; }
}
