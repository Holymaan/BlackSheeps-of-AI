namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

/// <summary>
/// Optional validation rules for a <see cref="FormField"/>. Which properties
/// apply depends on the field's <see cref="FieldType"/>.
/// </summary>
public sealed class FieldValidation
{
    /// <summary>Regex the value must match (used by OIB and email fields).</summary>
    public string? Pattern { get; set; }

    /// <summary>Minimum string length.</summary>
    public int? MinLength { get; set; }

    /// <summary>Maximum string length.</summary>
    public int? MaxLength { get; set; }

    /// <summary>Minimum numeric value (number fields).</summary>
    public double? Min { get; set; }

    /// <summary>Maximum numeric value (number fields).</summary>
    public double? Max { get; set; }

    /// <summary>When <c>true</c>, a number field must be a whole number.</summary>
    public bool? Integer { get; set; }

    /// <summary>Message shown when validation fails.</summary>
    public string? ErrorMessage { get; set; }
}
