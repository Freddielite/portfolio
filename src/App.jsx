import Intro from './components/Intro.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Skills from './components/Skills.jsx'
import Stack from './components/Stack.jsx'
import Projects from './components/Projects.jsx'
import Contact from './components/Contact.jsx'
import WhatsAppButton from './components/WhatsAppButton.jsx'

export default function App() {
  return (
    <>
      <Intro />
      <Header />
      <main>
        <Hero />
        <About />
        <Skills />
        <Stack />
        <Projects />
        <Contact />
      </main>
      <WhatsAppButton />
    </>
  )
}
