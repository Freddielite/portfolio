import { Routes, Route, useLocation } from 'react-router-dom'
import Intro from './components/Intro.jsx'
import Header from './components/Header.jsx'
import WhatsAppButton from './components/WhatsAppButton.jsx'
import Home from './pages/Home.jsx'
import BlogList from './pages/BlogList.jsx'
import BlogPost from './pages/BlogPost.jsx'

export default function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

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
