using System.Text.Json.Serialization;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Response from the Valhalla /sources_to_targets matrix endpoint.
/// </summary>
public sealed class ValhallaMatrixResponse
{
    /// <summary>
    /// 2-D matrix: [source_index][target_index] → travel time/distance cell.
    /// </summary>
    [JsonPropertyName("sources_to_targets")]
    public IReadOnlyList<IReadOnlyList<ValhallaMatrixCell>> SourcesToTargets { get; init; } = [];

    [JsonPropertyName("units")]
    public string Units { get; init; } = string.Empty;
}

public sealed class ValhallaMatrixCell
{
    /// <summary>Travel time in seconds. Null if no path was found.</summary>
    [JsonPropertyName("time")]
    public int? Time { get; init; }

    /// <summary>Travel distance in the units returned by the response.</summary>
    [JsonPropertyName("distance")]
    public double? Distance { get; init; }

    [JsonPropertyName("from_index")]
    public int FromIndex { get; init; }

    [JsonPropertyName("to_index")]
    public int ToIndex { get; init; }
}
