using System.Text.Json.Serialization;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Request body for the Valhalla /route endpoint.
/// Unlike /optimized_route, Valhalla visits locations in the exact order given.
/// Set <see cref="ValhallaLocation.Type"/> to <c>"break_through"</c> on intermediate
/// stops so the bus cannot reverse direction at a pickup point.
/// </summary>
public sealed class ValhallaRouteRequest
{
    /// <summary>
    /// Ordered locations. Use <see cref="ValhallaLocation.Type"/> = <c>"break_through"</c>
    /// for intermediate bus stops and <c>"break"</c> (or null) for the final destination.
    /// </summary>
    public IReadOnlyList<ValhallaLocation> Locations { get; init; } = [];

    /// <summary>Valhalla costing model, e.g. "auto", "pedestrian", "bicycle".</summary>
    public string Costing { get; init; } = "bus";
}

/// <summary>
/// Internal payload serialised to JSON for POST /route.
/// The response is the same <see cref="ValhallaOptimizedRouteResponse"/> shape.
/// </summary>
internal sealed class ValhallaRoutePayload
{
    [JsonPropertyName("locations")]
    public IReadOnlyList<ValhallaLocation> Locations { get; init; } = [];

    [JsonPropertyName("costing")]
    public string Costing { get; init; } = "bus";

    internal static ValhallaRoutePayload From(ValhallaRouteRequest r) =>
        new() { Locations = r.Locations, Costing = r.Costing };
}
