import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getForm, getSubmission, type FormDefinition, type FormSubmission } from '../api/client'
import type { AddressPoint } from '../examples/form-models'
import { useTranslation } from 'react-i18next'

export default function SubmissionDetailPage() {
  const { id, submissionId } = useParams<{ id: string; submissionId: string }>()
  const [form, setForm] = useState<FormDefinition | null>(null)
  const [submission, setSubmission] = useState<FormSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!id || !submissionId) return
    Promise.all([getForm(id), getSubmission(id, submissionId)])
      .then(([f, s]) => {
        setForm(f)
        setSubmission(s)
      })
      .catch(() => setError(t('submissionDetail.loadError')))
      .finally(() => setLoading(false))
  }, [id, submissionId, t])

  if (loading) return <div className="p-8 text-gray-500">{t('submissionDetail.loading')}</div>
  if (error) return <div className="p-8 text-red-500 text-sm">{error}</div>
  if (!form || !submission) return <div className="p-8 text-gray-500">{t('submissionDetail.notFound')}</div>

  function renderValue(fieldKey: string, fieldType: string, options?: { id: string; displayName: string }[]) {
    const val = submission!.values[fieldKey]
    if (val == null) return <span className="text-gray-400">—</span>

    switch (fieldType) {
      case 'boolean':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${val ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {val ? t('submissionDetail.yes') : t('submissionDetail.no')}
          </span>
        )
      case 'select': {
        const opt = options?.find((o) => o.id === val)
        return <span>{opt ? opt.displayName : String(val)}</span>
      }
      case 'addresspoint': {
        const addr = val as unknown as AddressPoint
        return (
          <div>
            <p>{addr.address}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {addr.lat.toFixed(6)}, {addr.lon.toFixed(6)}
            </p>
          </div>
        )
      }
      case 'oib':
        return <span className="font-mono">{String(val)}</span>
      case 'email':
        return (
          <a href={`mailto:${val}`} className="text-bus-navy hover:underline">
            {String(val)}
          </a>
        )
      default:
        return <span>{String(val)}</span>
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link
        to={`/admin/projects/${id}`}
        className="text-sm text-gray-500 hover:text-bus-navy mb-4 inline-block"
      >
        {t('submissionDetail.back', { title: form.title })}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">{t('submissionDetail.pageTitle')}</h1>
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span>
            {t('submissionDetail.submitted', {
              date: new Date(submission.submittedAt).toLocaleString('hr-HR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
            })}
          </span>
          <span>{t('submissionDetail.formVersion', { version: submission.formVersion })}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {form.fields.map((field) => (
          <div key={field.key} className="px-6 py-4 flex gap-4">
            <div className="w-1/3 shrink-0">
              <p className="text-sm font-medium text-gray-700">{field.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{field.key}</p>
            </div>
            <div className="flex-1 text-sm text-gray-900">
              {renderValue(field.key, field.type, field.options)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs text-gray-400">
        <p>{t('submissionDetail.submissionId')} <span className="font-mono">{submission.submissionId}</span></p>
        <p>{t('submissionDetail.formId')} <span className="font-mono">{submission.formId}</span></p>
      </div>
    </div>
  )
}
