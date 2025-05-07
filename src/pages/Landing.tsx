"use client"

import { useEffect } from "react"
import Navbar from "../components/Landing/NavBar"
import Hero from "../components/Landing/Hero"
import HowItWorks from "../components/Landing/HowItWorks"
import Features from "../components/Landing/Features"
import Events from "../components/Landing/Events"
import Testimonials from "../components/Landing/Testimonials"
import FAQ from "../components/Landing/FAQ"
import BookerCTA from "../components/Landing/BookerCTA"
import Creators from "../components/Landing/Creators"
import BackToTop from "../components/BackToTopButton"
import Footer from "../components/footer"

const Landing = () => {
  useEffect(() => {
    // Save the original body padding so we can restore it later
    const originalPadding = document.body.style.padding || ""

    // Set body padding to 0
    document.body.style.padding = "20"

    // When component unmounts, restore the original padding
    return () => {
      document.body.style.padding = originalPadding
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Events />
      <BookerCTA />
      <Creators /> 
      <Testimonials />
      <FAQ />
      <BackToTop />
      <Footer />
    </div>
  )
}

export default Landing
