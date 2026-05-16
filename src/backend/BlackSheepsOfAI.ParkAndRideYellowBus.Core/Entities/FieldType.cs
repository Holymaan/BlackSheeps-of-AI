using System.Text.Json.Serialization;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;

/// <summary>
/// The set of field types a <see cref="FormField"/> can render as.
/// Serialized to JSON as lowercase strings (e.g. <c>"oib"</c>).
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<FieldType>))]
public enum FieldType
{
    /// <summary>Croatian OIB — a string of exactly 11 digits.</summary>
    [JsonStringEnumMemberName("oib")]
    Oib,

    /// <summary>Email address, validated against an email regex.</summary>
    [JsonStringEnumMemberName("email")]
    Email,

    /// <summary>Free-text string with no validation.</summary>
    [JsonStringEnumMemberName("string")]
    String,

    /// <summary>Numeric value.</summary>
    [JsonStringEnumMemberName("number")]
    Number,

    /// <summary>Boolean true/false (checkbox).</summary>
    [JsonStringEnumMemberName("boolean")]
    Boolean,

    /// <summary>Single-select dropdown; choices come from <see cref="FormField.Options"/>.</summary>
    [JsonStringEnumMemberName("select")]
    Select,

    /// <summary>Geographic address point — the submitted value is an <see cref="AddressPoint"/>.</summary>
    [JsonStringEnumMemberName("addresspoint")]
    AddressPoint,
}
