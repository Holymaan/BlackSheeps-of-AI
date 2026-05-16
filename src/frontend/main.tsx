import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FormPage from './FormPage'
import AdminLayout from './admin/AdminLayout'
import ProjectListPage from './admin/ProjectListPage'
import CreateProjectPage from './admin/CreateProjectPage'
import ProjectSubmissionsPage from './admin/ProjectSubmissionsPage'
import SubmissionDetailPage from './admin/SubmissionDetailPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/form/:id" element={<FormPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ProjectListPage />} />
          <Route path="projects/new" element={<CreateProjectPage />} />
          <Route path="projects/:id" element={<ProjectSubmissionsPage />} />
          <Route path="projects/:id/submissions/:submissionId" element={<SubmissionDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
