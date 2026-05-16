namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

/// <summary>
/// A single field in a <see cref="FormDefinition"/>. The frontend renders one
/// input per field based on <see cref="Type"/>.
/// </summary>
public sealed class FormField
{
    /// <summary>Stable identifier; used as the property name in a submission's values.</summary>
    public required string Key { get; set; }

    /// <summary>Human-readable label shown next to the input.</summary>
    public required string Label { get; set; }

    /// <summary>The field type, which determines how the input renders and validates.</summary>
    public required FieldType Type { get; set; }

    /// <summary>Whether the field must be filled in before the form can be submitted.</summary>
    public bool Required { get; set; }

    /// <summary>Optional placeholder text.</summary>
    public string? Placeholder { get; set; }

    /// <summary>Optional helper/description text.</summary>
    public string? HelpText { get; set; }

    /// <summary>Optional default value applied when the form first renders.</summary>
    public object? DefaultValue { get; set; }

    /// <summary>Optional validation rules.</summary>
    public FieldValidation? Validation { get; set; }

    /// <summary>
    /// The available choices for a <see cref="FieldType.Select"/> field.
    /// Null/ignored for every other field type.
    /// </summary>
    public List<SelectOption>? Options { get; set; }
}
