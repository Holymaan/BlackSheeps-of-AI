namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

/// <summary>
/// The value submitted for a <see cref="FieldType.AddressPoint"/> field — a
/// human-readable address plus geographic coordinates (picked via Mapbox on
/// the frontend).
/// </summary>
public sealed class AddressPoint
{
    /// <summary>Human-readable address string.</summary>
    public required string Address { get; set; }

    /// <summary>Latitude in decimal degrees.</summary>
    public double Lat { get; set; }

    /// <summary>Longitude in decimal degrees.</summary>
    public double Lon { get; set; }
}
