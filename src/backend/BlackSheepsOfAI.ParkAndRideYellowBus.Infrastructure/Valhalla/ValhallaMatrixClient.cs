using System.Net.Http.Json;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// HTTP client implementation for the Valhalla routing engine.
/// Registered as a typed client via <see cref="IValhallaClient"/>.
/// </summary>
public sealed class ValhallaClient : IValhallaClient
{
    private readonly HttpClient _http;

    public ValhallaClient(HttpClient http)
    {
        _http = http;
    }

    /// <inheritdoc/>
    public async Task<ValhallaMatrixResponse> GetMatrixAsync(
        ValhallaMatrixRequest request,
        CancellationToken cancellationToken = default)
    {
        var response = await _http.PostAsJsonAsync("/sources_to_targets", request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ValhallaMatrixResponse>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Valhalla returned an empty matrix response.");
    }

    /// <inheritdoc/>
    public async Task<ValhallaOptimizedRouteResponse> GetOptimizedRouteAsync(
        ValhallaOptimizedRouteRequest request,
        CancellationToken cancellationToken = default)
    {
        var payload = ValhallaOptimizedRoutePayload.From(request);
        var response = await _http.PostAsJsonAsync("/optimized_route", payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ValhallaOptimizedRouteResponse>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Valhalla returned an empty optimized route response.");
    }

    /// <inheritdoc/>
    public async Task<ValhallaOptimizedRouteResponse> GetRouteAsync(
        ValhallaRouteRequest request,
        CancellationToken cancellationToken = default)
    {
        var payload = ValhallaRoutePayload.From(request);
        var response = await _http.PostAsJsonAsync("/route", payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ValhallaOptimizedRouteResponse>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Valhalla returned an empty route response.");
    }
}
