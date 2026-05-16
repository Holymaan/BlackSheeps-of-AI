import './index.css'
import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import FormPage from './FormPage'
import { AuthProvider } from './admin/AuthContext'
import AdminLayout from './admin/AdminLayout'
import LoginPage from './admin/LoginPage'
import ProjectListPage from './admin/ProjectListPage'
import CreateProjectPage from './admin/CreateProjectPage'
import ProjectSubmissionsPage from './admin/ProjectSubmissionsPage'
import SubmissionDetailPage from './admin/SubmissionDetailPage'
import SchoolRoutingPage from './admin/SchoolRoutingPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/prijava/:id" element={<FormPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<ProjectListPage />} />
            <Route path="projects/new" element={<CreateProjectPage />} />
            <Route path="projects/:id" element={<ProjectSubmissionsPage />} />
            <Route path="projects/:id/submissions/:submissionId" element={<SubmissionDetailPage />} />
            <Route path="routing" element={<SchoolRoutingPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
