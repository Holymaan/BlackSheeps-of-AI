using NetTopologySuite.Geometries;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

public class BusStop
{
    public int Id { get; set; }
    public Geometry Geom { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Bus { get; set; } = string.Empty;
}
