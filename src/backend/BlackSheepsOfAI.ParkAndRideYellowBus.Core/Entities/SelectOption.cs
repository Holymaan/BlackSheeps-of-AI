namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

/// <summary>
/// A single choice in a <see cref="FieldType.Select"/> field. A submission
/// stores the chosen option's <see cref="Id"/>.
/// </summary>
public sealed class SelectOption
{
    /// <summary>Stable identifier stored in the submission when this option is chosen.</summary>
    public required string Id { get; set; }

    /// <summary>Human-readable text shown in the dropdown.</summary>
    public required string DisplayName { get; set; }
}
