/**
 * TypeScript models for the dynamic form schema.
 *
 * - `FormDefinition` is consumed by the frontend renderer to draw + validate a form.
 *   Fetch it from the backend via `GET /form/{id}`.
 * - `FormSubmission` is the shape sent back to the backend once the form is filled in.
 *
 * See `form-definition.example.json` and `form-submission.example.json`.
 */

/** The set of field types a {@link FormField} can render as. */
export enum FieldType {
  /** Croatian OIB — a string of exactly 11 digits. */
  Oib = "oib",
  /** Email address, validated against an email regex. */
  Email = "email",
  /** Free-text string with no validation. */
  String = "string",
  /** Numeric value. */
  Number = "number",
  /** Boolean true/false (checkbox). */
  Boolean = "boolean",
  /** Single-select dropdown; choices come from {@link FormField.options}. */
  Select = "select",
  /** Geographic address point — value is an {@link AddressPoint} (picked via Mapbox). */
  AddressPoint = "addresspoint",
}

/** A single choice in a {@link FieldType.Select} field. */
export interface SelectOption {
  /** Stable identifier stored in the submission when this option is chosen. */
  id: string;
  /** Human-readable text shown in the dropdown. */
  displayName: string;
}

/**
 * The value submitted for a {@link FieldType.AddressPoint} field — a
 * human-readable address plus geographic coordinates (picked via Mapbox).
 */
export interface AddressPoint {
  /** Human-readable address string. */
  address: string;
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lon: number;
}

/** A value a single field can hold in a submission. */
export type FieldValue = string | number | boolean | AddressPoint | null;

/**
 * Optional validation rules for a {@link FormField}.
 * Which properties apply depends on the field's {@link FieldType}.
 */
export interface FieldValidation {
  /** Regex the value must match (used by `oib` and `email` fields). */
  pattern?: string;
  /** Minimum string length. */
  minLength?: number;
  /** Maximum string length. */
  maxLength?: number;
  /** Minimum numeric value (`number` fields). */
  min?: number;
  /** Maximum numeric value (`number` fields). */
  max?: number;
  /** When true, a `number` field must be a whole number. */
  integer?: boolean;
  /** Message shown when validation fails. */
  errorMessage?: string;
}

/** A single field in a {@link FormDefinition}. */
export interface FormField {
  /** Stable identifier; used as the property name in a submission's `values`. */
  key: string;
  /** Human-readable label shown next to the input. */
  label: string;
  /** Determines how the input renders and validates. */
  type: FieldType;
  /** Whether the field must be filled in before the form can be submitted. */
  required: boolean;
  /** Optional placeholder text. */
  placeholder?: string;
  /** Optional helper/description text. */
  helpText?: string;
  /** Optional default value applied when the form first renders. */
  defaultValue?: FieldValue;
  /** Optional validation rules. */
  validation?: FieldValidation;
  /** The available choices for a {@link FieldType.Select} field; omitted for other types. */
  options?: SelectOption[];
}

/** A complete form description used to render and validate a form. */
export interface FormDefinition {
  /** Stable form identifier (a GUID). */
  id: string;
  /** Form title shown to the user. */
  title: string;
  /** Optional description shown below the title. */
  description?: string;
  /** Schema version, so submissions can be tied to the form revision. */
  version: number;
  /** The ordered list of fields to render. */
  fields: FormField[];
}

/** A filled-out form as sent to the backend for processing. */
export interface FormSubmission {
  /** Identifier of the {@link FormDefinition} this submission answers. */
  formId: string;
  /** Version of the form definition that was rendered. */
  formVersion: number;
  /** Unique identifier for this submission. */
  submissionId: string;
  /** ISO 8601 timestamp of when the form was submitted. */
  submittedAt: string;
  /**
   * Field values keyed by {@link FormField.key}. A `select` field stores the
   * chosen {@link SelectOption.id}; an `addresspoint` field stores an {@link AddressPoint}.
   */
  values: Record<string, FieldValue>;
}
