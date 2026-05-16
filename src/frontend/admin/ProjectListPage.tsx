import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listForms, type FormDefinitionSummary } from '../api/client'
import { useTranslation } from 'react-i18next'

export default function ProjectListPage() {
  const [forms, setForms] = useState<FormDefinitionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    listForms()
      .then(setForms)
      .catch(() => setError(t('projectList.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{t('projectList.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('projectList.subtitle')}</p>
        </div>
        <Link
          to="/admin/projects/new"
          className="px-4 py-2 bg-bus-yellow text-gray-900 font-semibold rounded-lg hover:bg-bus-yellow-dark transition text-sm shadow-sm"
        >
          {t('projectList.newProject')}
        </Link>
      </div>

      {loading && <p className="text-gray-500">{t('projectList.loading')}</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!loading && !error && forms.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">{t('projectList.emptyTitle')}</p>
          <p className="text-sm">{t('projectList.emptySubtitle')}</p>
        </div>
      )}

      {forms.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">{t('projectList.colTitle')}</th>
                <th className="px-6 py-3 font-medium text-gray-500">{t('projectList.colDescription')}</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-center">{t('projectList.colVersion')}</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-center">{t('projectList.colFields')}</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-center">{t('projectList.colSubmissions')}</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">{t('projectList.colActions')}</th>
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
                      {t('projectList.openForm')}
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
