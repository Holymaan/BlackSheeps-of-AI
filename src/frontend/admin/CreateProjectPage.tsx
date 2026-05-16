import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createForm, type FormField } from '../api/client'
import { FieldType } from '../examples/form-models'
import type { SelectOption, FieldValidation } from '../examples/form-models'
import { useTranslation } from 'react-i18next'

interface FieldDraft {
  key: string
  label: string
  type: string
  required: boolean
  placeholder: string
  helpText: string
  options: SelectOption[]
  validation: Partial<FieldValidation>
}

function emptyField(): FieldDraft {
  return {
    key: '',
    label: '',
    type: 'string',
    required: false,
    placeholder: '',
    helpText: '',
    options: [],
    validation: {},
  }
}

export default function CreateProjectPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FieldDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const FIELD_TYPES = [
    { value: 'oib', label: t('createProject.fieldTypes.oib') },
    { value: 'email', label: t('createProject.fieldTypes.email') },
    { value: 'string', label: t('createProject.fieldTypes.string') },
    { value: 'number', label: t('createProject.fieldTypes.number') },
    { value: 'boolean', label: t('createProject.fieldTypes.boolean') },
    { value: 'select', label: t('createProject.fieldTypes.select') },
    { value: 'addresspoint', label: t('createProject.fieldTypes.addresspoint') },
  ]

  function addField() {
    setFields([...fields, emptyField()])
  }

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index))
  }

  function addOption(fi: number) {
    const f = fields[fi]
    updateField(fi, { options: [...f.options, { id: '', displayName: '' }] })
  }

  function updateOption(fi: number, oi: number, patch: Partial<SelectOption>) {
    const f = fields[fi]
    const options = f.options.map((o, i) => (i === oi ? { ...o, ...patch } : o))
    updateField(fi, { options })
  }

  function removeOption(fi: number, oi: number) {
    const f = fields[fi]
    updateField(fi, { options: f.options.filter((_, i) => i !== oi) })
  }

  function toFormField(d: FieldDraft): FormField {
    const f: any = {
      key: d.key,
      label: d.label,
      type: d.type as FieldType,
      required: d.required,
    }
    if (d.placeholder) f.placeholder = d.placeholder
    if (d.helpText) f.helpText = d.helpText
    if (d.type === 'select' && d.options.length > 0) f.options = d.options
    const v = d.validation
    if (v.pattern || v.min != null || v.max != null || v.errorMessage) {
      f.validation = { ...v }
    }
    return f
  }

  async function handleSave() {
    if (!title.trim()) return
    if (fields.some((f) => !f.key.trim() || !f.label.trim())) {
      setError(t('createProject.validationError'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const form = await createForm({
        title,
        description: description || null,
        version: 1,
        fields: fields.map(toFormField),
      })
      navigate(`/admin/projects/${form.id}`)
    } catch {
      setError(t('createProject.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 p-8 overflow-auto">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">{t('createProject.title')}</h1>

      {/* Meta */}
      <section className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProject.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('createProject.titlePlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bus-navy focus:border-bus-navy outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('createProject.descriptionLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t('createProject.descriptionPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bus-navy focus:border-bus-navy outline-none"
          />
        </div>
      </section>

      {/* Fields */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('createProject.fieldsTitle')}</h2>
          <button
            onClick={addField}
            className="text-sm font-medium text-bus-navy hover:underline"
          >
            {t('createProject.addField')}
          </button>
        </div>

        {fields.length === 0 && (
          <p className="text-gray-400 text-sm py-4">
            {t('createProject.noFields')}
          </p>
        )}

        <div className="space-y-4">
          {fields.map((field, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-400">
                  {t('createProject.fieldNumber', { number: i + 1 })}
                </span>
                <button
                  onClick={() => removeField(i)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  {t('createProject.remove')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('createProject.keyLabel')}
                  </label>
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateField(i, { key: e.target.value })}
                    placeholder="fieldKey"
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-bus-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('createProject.labelLabel')}
                  </label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder={t('createProject.displayLabelPlaceholder')}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-bus-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('createProject.typeLabel')}
                  </label>
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateField(i, {
                        type: e.target.value,
                        options: e.target.value === 'select' ? [] : field.options,
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-bus-navy"
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    {t('createProject.required')}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('createProject.placeholderLabel')}
                  </label>
                  <input
                    type="text"
                    value={field.placeholder}
                    onChange={(e) => updateField(i, { placeholder: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-bus-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('createProject.helpTextLabel')}
                  </label>
                  <input
                    type="text"
                    value={field.helpText}
                    onChange={(e) => updateField(i, { helpText: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-bus-navy"
                  />
                </div>
              </div>

              {/* Select options */}
              {field.type === 'select' && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">
                      {t('createProject.options')}
                    </span>
                    <button
                      onClick={() => addOption(i)}
                      className="text-xs text-bus-navy hover:underline"
                    >
                      {t('createProject.addOption')}
                    </button>
                  </div>
                  {field.options.length === 0 && (
                    <p className="text-xs text-gray-400">{t('createProject.noOptions')}</p>
                  )}
                  <div className="space-y-2">
                    {field.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={opt.id}
                          onChange={(e) =>
                            updateOption(i, oi, { id: e.target.value })
                          }
                          placeholder="id"
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                        />
                        <input
                          type="text"
                          value={opt.displayName}
                          onChange={(e) =>
                            updateOption(i, oi, { displayName: e.target.value })
                          }
                          placeholder={t('createProject.displayNamePlaceholder')}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                        />
                        <button
                          onClick={() => removeOption(i, oi)}
                          className="text-red-400 hover:text-red-600 text-sm leading-none"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !title.trim()}
        className="px-6 py-2.5 bg-bus-navy text-white font-semibold rounded-lg hover:bg-bus-navy-dark disabled:opacity-50 transition text-sm"
      >
        {saving ? t('createProject.creating') : t('createProject.create')}
      </button>
    </div>
  )
}
