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
import Footer from "../components/footer"

const Landing = () => {

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Events />
      <BookerCTA />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  )
}

export default Landing

