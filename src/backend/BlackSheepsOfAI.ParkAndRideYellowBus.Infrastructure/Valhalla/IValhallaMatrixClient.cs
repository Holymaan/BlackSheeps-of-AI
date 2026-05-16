namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Typed client for the Valhalla routing engine.
/// </summary>
public interface IValhallaClient
{
    /// <summary>
    /// Computes a many-to-many travel time/distance matrix between the given
    /// sources and targets using the specified costing model.
    /// </summary>
    Task<ValhallaMatrixResponse> GetMatrixAsync(
        ValhallaMatrixRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns an optimised route through the given waypoints.
    /// Intermediate locations may be reordered by Valhalla to minimise total cost.
    /// </summary>
    Task<ValhallaOptimizedRouteResponse> GetOptimizedRouteAsync(
        ValhallaOptimizedRouteRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Routes through locations in the exact order given (no reordering).
    /// Set <see cref="ValhallaLocation.Type"/> to <c>"break_through"</c> on
    /// intermediate stops to prevent U-turns at those locations.
    /// Returns the same trip structure as <see cref="GetOptimizedRouteAsync"/>.
    /// </summary>
    Task<ValhallaOptimizedRouteResponse> GetRouteAsync(
        ValhallaRouteRequest request,
        CancellationToken cancellationToken = default);
}
