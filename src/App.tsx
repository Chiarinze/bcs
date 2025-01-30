import Hero from './components/Hero'
import About from './components/About'
import Performances from './components/Performances'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <About />
      <Performances />
      <Footer />
    </div>
  )
}

export default App
