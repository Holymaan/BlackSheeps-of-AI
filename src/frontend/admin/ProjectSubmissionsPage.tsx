import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getForm, listSubmissions, type FormDefinition, type FormSubmission } from '../api/client'

export default function ProjectSubmissionsPage() {
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState<FormDefinition | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getForm(id), listSubmissions(id)])
      .then(([f, s]) => {
        setForm(f)
        setSubmissions(s)
      })
      .catch(() => setError('Failed to load project data.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>
  if (error) return <div className="p-8 text-red-500 text-sm">{error}</div>
  if (!form) return <div className="p-8 text-gray-500">Project not found.</div>

  const previewFields = form.fields.slice(0, 4)

  function formatValue(val: unknown): string {
    if (val == null) return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (typeof val === 'object' && 'address' in (val as Record<string, unknown>)) {
      return (val as { address: string }).address
    }
    return String(val)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/admin" className="text-sm text-gray-500 hover:text-bus-navy mb-2 inline-block">
          &larr; All Projects
        </Link>
        <h1 className="text-2xl font-display font-bold text-gray-900">{form.title}</h1>
        {form.description && (
          <p className="text-sm text-gray-500 mt-1">{form.description}</p>
        )}
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span>Version {form.version}</span>
          <span>{form.fields.length} fields</span>
          <span>{submissions.length} submissions</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
        <Link
          to={`/form/${id}`}
          target="_blank"
          className="text-sm text-gray-500 hover:text-bus-navy"
        >
          Open form &nearr;
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No submissions yet</p>
          <p className="text-sm">Share the form link with citizens to start collecting responses.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Submitted</th>
                {previewFields.map((f) => (
                  <th key={f.key} className="px-6 py-3 font-medium text-gray-500">
                    {f.label}
                  </th>
                ))}
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((s) => (
                <tr key={s.submissionId} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                    {new Date(s.submittedAt).toLocaleString('hr-HR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  {previewFields.map((f) => (
                    <td key={f.key} className="px-6 py-4 text-gray-600 truncate max-w-[200px]">
                      {formatValue(s.values[f.key])}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/admin/projects/${id}/submissions/${s.submissionId}`}
                      className="text-xs text-bus-navy hover:underline font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
