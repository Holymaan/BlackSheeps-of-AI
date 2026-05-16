namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

/// <summary>
/// A complete form description the frontend uses to render and validate a form.
/// </summary>
public sealed class FormDefinition
{
    /// <summary>Stable form identifier.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Form title shown to the user.</summary>
    public required string Title { get; set; }

    /// <summary>Optional description shown below the title.</summary>
    public string? Description { get; set; }

    /// <summary>Schema version, so submissions can be tied to the form revision.</summary>
    public int Version { get; set; } = 1;

    /// <summary>The ordered list of fields to render.</summary>
    public List<FormField> Fields { get; set; } = [];
}
