import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginLandingPage from './pages/LoginLandingPage'
import LoginPage from './pages/LoginPage'
import EmployeeDashboard from './pages/EmployeeDashboard'
import EmployeeModulePage from './pages/EmployeeModulePage'
import AdminDashboard from './pages/AdminDashboard'
import RequireAdmin from './routes/RequireAdmin'
import RequireAuth from './routes/RequireAuth'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginLandingPage />} />
          <Route path="/employee/login" element={<LoginPage role="EMPLOYEE" />} />
          <Route
            path="/employee"
            element={
              <RequireAuth>
                <EmployeeDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/employee/departments/:departmentId"
            element={
              <RequireAuth>
                <EmployeeModulePage />
              </RequireAuth>
            }
          />
          <Route
            path="/employee/:module"
            element={
              <RequireAuth>
                <EmployeeModulePage />
              </RequireAuth>
            }
          />
          <Route path="/admin/login" element={<LoginPage role="ADMIN" />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/:section"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
