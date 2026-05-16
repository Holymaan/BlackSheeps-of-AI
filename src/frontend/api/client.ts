import type { FormDefinition, FormSubmission, FormField } from '../examples/form-models'

export type { FormDefinition, FormSubmission, FormField }

export type FormDefinitionSummary = FormDefinition & { submissionCount: number }

export interface CreateFormRequest {
  title: string
  description: string | null
  version: number
  fields: FormField[]
}

const STORAGE_KEY = 'zutibus_auth'

function authHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const { token } = JSON.parse(raw)
    if (token) return { Authorization: `Bearer ${token}` }
  } catch { /* ignore */ }
  return {}
}

export async function login(username: string, password: string): Promise<{ token: string; username: string; role: string }> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Login failed')
  return res.json()
}

export async function listForms(): Promise<FormDefinitionSummary[]> {
  const res = await fetch('/form', { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch forms')
  return res.json()
}

export async function getForm(id: string): Promise<FormDefinition> {
  const res = await fetch(`/form/${id}`)
  if (!res.ok) throw new Error('Failed to fetch form')
  return res.json()
}

export async function getFormAdmin(id: string): Promise<FormDefinition> {
  const res = await fetch(`/form/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch form')
  return res.json()
}

export async function createForm(data: CreateFormRequest): Promise<FormDefinition> {
  const res = await fetch('/form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create form')
  return res.json()
}

export async function listSubmissions(formId: string): Promise<FormSubmission[]> {
  const res = await fetch(`/form/${formId}/submissions`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch submissions')
  return res.json()
}

export async function getSubmission(formId: string, submissionId: string): Promise<FormSubmission> {
  const res = await fetch(`/form/${formId}/submission/${submissionId}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch submission')
  return res.json()
}
