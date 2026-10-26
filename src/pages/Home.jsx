import Hero from '../components/Hero.jsx'
import Marquee from '../components/Marquee.jsx'
import About from '../components/About.jsx'
import Skills from '../components/Skills.jsx'
import Projects from '../components/Projects.jsx'
import Services from '../components/Services.jsx'
import BlogTeaser from '../components/BlogTeaser.jsx'
import Testimonials from '../components/Testimonials.jsx'
import Contact from '../components/Contact.jsx'
import SEO from '../components/SEO.jsx'

export default function Home() {
  return (
    <>
      <SEO />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Skills />
        <Projects />
        <Services />
        <BlogTeaser />
        <Testimonials />
        <Contact />
      </main>
    </>
  )
}
