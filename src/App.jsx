import { Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Intro from './components/Intro.jsx'
import Header from './components/Header.jsx'
import WhatsAppButton from './components/WhatsAppButton.jsx'
import Home from './pages/Home.jsx'
import BlogList from './pages/BlogList.jsx'
import BlogPost from './pages/BlogPost.jsx'

// Lazy-loaded so the admin panel's code never ships in the bundle visitors
// download for the public site — it's only fetched when someone actually
// goes to /admin.
const Admin = lazy(() => import('./pages/Admin.jsx'))

export default function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isAdmin = location.pathname.startsWith('/admin')

  if (isAdmin) {
    return (
      <Suspense fallback={null}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <>
      {isHome && <Intro />}
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
      <WhatsAppButton />
    </>
  )
}
