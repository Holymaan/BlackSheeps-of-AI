using System.Net.Http.Json;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Valhalla;

/// <summary>
/// HTTP client implementation for the Valhalla /sources_to_targets matrix endpoint.
/// Registered as a typed client via <see cref="IValhallaMatrixClient"/>.
/// </summary>
public sealed class ValhallaMatrixClient : IValhallaMatrixClient
{
    private readonly HttpClient _http;

    public ValhallaMatrixClient(HttpClient http)
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
}
