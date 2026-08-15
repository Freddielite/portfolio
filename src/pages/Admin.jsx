import { useEffect, useState } from 'react'
import AdminLogin from '../admin/AdminLogin.jsx'
import AdminDashboard from '../admin/AdminDashboard.jsx'
import SEO from '../components/SEO.jsx'
import '../admin/admin.css'

export default function Admin() {
  const [status, setStatus] = useState('checking') // checking | out | in

  useEffect(() => {
    fetch('/api/admin/me')
      .then((res) => setStatus(res.ok ? 'in' : 'out'))
      .catch(() => setStatus('out'))
  }, [])

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      setStatus('out')
    }
  }

  return (
    <div className="admin-page">
      <SEO title="Admin" path="/admin" noIndex />
      {status === 'checking' && <p className="admin-hint admin-loading-screen">Loading…</p>}
      {status === 'out' && <AdminLogin onLogin={() => setStatus('in')} />}
      {status === 'in' && <AdminDashboard onLogout={handleLogout} />}
    </div>
  )
}
