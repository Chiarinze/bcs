import { HelmetProvider } from "react-helmet-async";
import Hero from "./components/Hero";
import About from "./components/About";
import Performances from "./components/Performances";
import Header from "./components/Header";
import Footer from "./components/Footer";
import SEO from "./components/SEO";
import BookUs from "./components/BookUs";

function App() {
  return (
    <HelmetProvider>
      <div className="min-h-screen">
        <SEO />
        <Header />
        <Hero />
        <About />
        <Performances />
        <BookUs />
        <Footer />
      </div>
    </HelmetProvider>
  );
}

export default App;
