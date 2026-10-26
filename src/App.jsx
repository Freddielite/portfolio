import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Intro from './components/Intro.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import WhatsAppButton from './components/WhatsAppButton.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import CustomCursor from './components/CustomCursor.jsx'
import PageEffects from './components/PageEffects.jsx'
import { CurtainProvider } from './context/CurtainContext.jsx'
import Home from './pages/Home.jsx'
import BlogList from './pages/BlogList.jsx'
import BlogPost from './pages/BlogPost.jsx'

// Lazy-loaded so the admin panel's code never ships in the bundle visitors
// download for the public site: it's only fetched when someone actually
// goes to /admin.
const Admin = lazy(() => import('./pages/Admin.jsx'))

function introSeen() {
  try {
    return sessionStorage.getItem('intro-seen') === '1'
  } catch {
    return false
  }
}

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  // The intro plays once per visit, and only when the visit starts on the home page.
  const [showIntro, setShowIntro] = useState(() => location.pathname === '/' && !introSeen())

  useEffect(() => {
    if (!showIntro) document.documentElement.classList.add('is-ready')
  }, [showIntro])

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
    <CurtainProvider>
      {showIntro && (
        <Intro
          onDone={() => {
            try { sessionStorage.setItem('intro-seen', '1') } catch { /* private mode */ }
            setShowIntro(false)
          }}
        />
      )}
      <PageEffects />
      <CustomCursor />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
      <Footer />
      <WhatsAppButton />
      <CommandPalette />
    </CurtainProvider>
  )
}
