import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import About from '../components/About.jsx'
import Skills from '../components/Skills.jsx'
import Stack from '../components/Stack.jsx'
import Projects from '../components/Projects.jsx'
import Testimonials from '../components/Testimonials.jsx'
import Contact from '../components/Contact.jsx'
import SEO from '../components/SEO.jsx'

export default function Home() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const el = document.querySelector(location.hash)
    if (el) {
      // Wait a tick so layout has settled before scrolling.
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [location])

  return (
    <>
      <SEO />
      <main>
        <Hero />
        <About />
        <Skills />
        <Stack />
        <Projects />
        <Testimonials />
        <Contact />
      </main>
    </>
  )
}
