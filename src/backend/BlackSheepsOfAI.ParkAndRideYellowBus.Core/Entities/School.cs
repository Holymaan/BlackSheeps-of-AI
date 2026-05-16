using NetTopologySuite.Geometries;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

public class School
{
    public int Id { get; set; }
    public Geometry Geom { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
}
