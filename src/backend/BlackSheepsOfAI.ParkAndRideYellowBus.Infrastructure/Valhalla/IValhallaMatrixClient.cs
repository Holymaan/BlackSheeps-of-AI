namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// Typed client for calling the Valhalla time-distance matrix endpoint.
/// </summary>
public interface IValhallaMatrixClient
{
    /// <summary>
    /// Computes a many-to-many travel time/distance matrix between the given
    /// sources and targets using the specified costing model.
    /// </summary>
    Task<ValhallaMatrixResponse> GetMatrixAsync(
        ValhallaMatrixRequest request,
        CancellationToken cancellationToken = default);
}
