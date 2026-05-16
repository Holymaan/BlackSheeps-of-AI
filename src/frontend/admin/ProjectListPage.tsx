import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listForms, type FormDefinitionSummary } from '../api/client'

export default function ProjectListPage() {
  const [forms, setForms] = useState<FormDefinitionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listForms()
      .then(setForms)
      .catch(() => setError('Failed to load projects. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">Form definitions available for citizens to fill out.</p>
        </div>
        <Link
          to="/admin/projects/new"
          className="px-4 py-2 bg-bus-yellow text-gray-900 font-semibold rounded-lg hover:bg-bus-yellow-dark transition text-sm shadow-sm"
        >
          + New Project
        </Link>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && !error && forms.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm">Create your first form definition to get started.</p>
        </div>
      )}

      {forms.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Title</th>
                <th className="px-6 py-3 font-medium text-gray-500">Description</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-center">Version</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-center">Fields</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-center">Submissions</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/projects/${f.id}`}
                      className="text-bus-navy font-medium hover:underline"
                    >
                      {f.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500 truncate max-w-xs">
                    {f.description || '—'}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-700">{f.version}</td>
                  <td className="px-6 py-4 text-center text-gray-700">{f.fields.length}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {f.submissionCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/form/${f.id}`}
                      target="_blank"
                      className="text-xs text-gray-500 hover:text-bus-navy"
                    >
                      Open form ↗
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
