import { HelmetProvider } from "react-helmet-async";
import About from "../components/About";
import BookUs from "../components/BookUs";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Hero from "../components/Hero";
import Performances from "../components/Performances";
import SEO from "../components/SEO";

export default function LandingPage() {
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
