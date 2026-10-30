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
import { ToastProvider } from './context/ToastContext.jsx'
import Home from './pages/Home.jsx'
import BlogList from './pages/BlogList.jsx'
import BlogPost from './pages/BlogPost.jsx'
import NotFound from './pages/NotFound.jsx'
import Cv from './pages/Cv.jsx'

// Lazy-loaded so the admin panel's code never ships in the bundle visitors
// download for the public site: it's only fetched when someone actually
// goes to /admin.
const Admin = lazy(() => import('./pages/Admin.jsx'))

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  // The intro plays on every full page load or refresh that starts on the home
  // page. Moving around inside the site never replays it.
  const [showIntro, setShowIntro] = useState(() => location.pathname === '/')

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
    <ToastProvider>
    <CurtainProvider>
      {showIntro && (
        <Intro
          onDone={() => setShowIntro(false)}
        />
      )}
      <PageEffects />
      <CustomCursor />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/cv" element={<Cv />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <WhatsAppButton />
      <CommandPalette />
    </CurtainProvider>
    </ToastProvider>
  )
}
