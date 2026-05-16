import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FormPage from './FormPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/form/:id" element={<FormPage />} />
        <Route path="*" element={<Navigate to="/form/3f1a7c9e-2b8d-4e6f-a1b2-c3d4e5f60718" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
