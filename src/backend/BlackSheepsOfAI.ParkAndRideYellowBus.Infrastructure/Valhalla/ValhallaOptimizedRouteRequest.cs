using System.Text.Json.Serialization;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Request body for the Valhalla /optimized_route endpoint.
/// Valhalla will reorder <see cref="Locations"/> to minimise total travel cost,
/// always ending at the fixed <see cref="Destination"/>.
/// </summary>
public sealed class ValhallaOptimizedRouteRequest
{
    /// <summary>
    /// Waypoints that Valhalla is free to reorder for an optimal path.
    /// </summary>
    public IReadOnlyList<ValhallaLocation> Locations { get; init; } = [];

    /// <summary>
    /// Fixed final destination. Appended as the last entry in the
    /// <c>locations</c> array sent to Valhalla, so it is never reordered.
    /// </summary>
    public ValhallaLocation Destination { get; init; } = new();

    /// <summary>Valhalla costing model, e.g. "auto", "pedestrian", "bicycle".</summary>
    public string Costing { get; init; } = "auto";
}

/// <summary>
/// Internal payload sent to Valhalla — merges waypoints + destination into
/// a single <c>locations</c> array with the destination pinned at the end.
/// </summary>
internal sealed class ValhallaOptimizedRoutePayload
{
    [JsonPropertyName("locations")]
    public IReadOnlyList<ValhallaLocation> Locations { get; init; } = [];

    [JsonPropertyName("costing")]
    public string Costing { get; init; } = "auto";

    internal static ValhallaOptimizedRoutePayload From(ValhallaOptimizedRouteRequest request) =>
        new()
        {
            Locations = [.. request.Locations, request.Destination],
            Costing = request.Costing
        };
}
