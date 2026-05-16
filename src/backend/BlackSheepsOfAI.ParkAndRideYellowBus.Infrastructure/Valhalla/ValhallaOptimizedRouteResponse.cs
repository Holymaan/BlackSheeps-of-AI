using System.Text.Json.Serialization;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Response from the Valhalla /optimized_route endpoint.
/// </summary>
public sealed class ValhallaOptimizedRouteResponse
{
    [JsonPropertyName("trip")]
    public ValhallaTrip Trip { get; init; } = new();
}

public sealed class ValhallaTrip
{
    [JsonPropertyName("locations")]
    public IReadOnlyList<ValhallaTripLocation> Locations { get; init; } = [];

    [JsonPropertyName("legs")]
    public IReadOnlyList<ValhallaTripLeg> Legs { get; init; } = [];

    [JsonPropertyName("summary")]
    public ValhallaTripSummary Summary { get; init; } = new();

    [JsonPropertyName("units")]
    public string Units { get; init; } = string.Empty;

    [JsonPropertyName("language")]
    public string Language { get; init; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; init; }

    [JsonPropertyName("status_message")]
    public string StatusMessage { get; init; } = string.Empty;
}

public sealed class ValhallaTripLocation
{
    [JsonPropertyName("type")]
    public string Type { get; init; } = string.Empty;

    [JsonPropertyName("lat")]
    public double Lat { get; init; }

    [JsonPropertyName("lon")]
    public double Lon { get; init; }

    /// <summary>
    /// Original index from the request — reflects the reordered position
    /// Valhalla chose for this waypoint.
    /// </summary>
    [JsonPropertyName("original_index")]
    public int OriginalIndex { get; init; }
}

public sealed class ValhallaTripLeg
{
    /// <summary>Encoded polyline of the leg's geometry.</summary>
    [JsonPropertyName("shape")]
    public string Shape { get; init; } = string.Empty;

    [JsonPropertyName("summary")]
    public ValhallaTripSummary Summary { get; init; } = new();
}

public sealed class ValhallaTripSummary
{
    /// <summary>Total travel time in seconds.</summary>
    [JsonPropertyName("time")]
    public double Time { get; init; }

    /// <summary>Total travel distance in the response units.</summary>
    [JsonPropertyName("length")]
    public double Length { get; init; }
}
