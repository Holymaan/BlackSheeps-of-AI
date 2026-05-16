import type { FormDefinition, FormSubmission, FormField } from '../examples/form-models'

export type { FormDefinition, FormSubmission, FormField }

export type FormDefinitionSummary = FormDefinition & { submissionCount: number }

export interface CreateFormRequest {
  title: string
  description: string | null
  version: number
  fields: FormField[]
}

export async function listForms(): Promise<FormDefinitionSummary[]> {
  const res = await fetch('/form')
  if (!res.ok) throw new Error('Failed to fetch forms')
  return res.json()
}

export async function getForm(id: string): Promise<FormDefinition> {
  const res = await fetch(`/form/${id}`)
  if (!res.ok) throw new Error('Failed to fetch form')
  return res.json()
}

export async function createForm(data: CreateFormRequest): Promise<FormDefinition> {
  const res = await fetch('/form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create form')
  return res.json()
}

export async function listSubmissions(formId: string): Promise<FormSubmission[]> {
  const res = await fetch(`/form/${formId}/submissions`)
  if (!res.ok) throw new Error('Failed to fetch submissions')
  return res.json()
}

export async function getSubmission(formId: string, submissionId: string): Promise<FormSubmission> {
  const res = await fetch(`/form/${formId}/submission/${submissionId}`)
  if (!res.ok) throw new Error('Failed to fetch submission')
  return res.json()
}
