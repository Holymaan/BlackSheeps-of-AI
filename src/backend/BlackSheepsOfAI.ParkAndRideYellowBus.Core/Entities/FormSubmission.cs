namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

/// <summary>
/// A filled-out form as received from the frontend and persisted for processing.
/// </summary>
public sealed class FormSubmission
{
    /// <summary>Identifier of the <see cref="FormDefinition"/> this submission answers.</summary>
    public required Guid FormId { get; set; }

    /// <summary>Version of the form definition that was rendered.</summary>
    public int FormVersion { get; set; } = 1;

    /// <summary>Unique identifier for this submission.</summary>
    public Guid SubmissionId { get; set; } = Guid.NewGuid();

    /// <summary>UTC timestamp of when the form was submitted.</summary>
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Field values keyed by <see cref="FormField.Key"/>. Value types are
    /// string / number / boolean depending on the field's <see cref="FieldType"/>.
    /// When deserialized from JSON, values are boxed as <see cref="System.Text.Json.JsonElement"/>.
    /// </summary>
    public Dictionary<string, object?> Values { get; set; } = [];
}
