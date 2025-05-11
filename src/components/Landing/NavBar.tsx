"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Menu, X } from "lucide-react"

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-container">
        <div className="nav-logo">
          <a href="/"><img src="/logo.svg" alt="Spotix Logo" className="nav-logo-img" /></a>
          <span className="nav-logo-text"><a href="/">Spotix</a></span>
        </div>

        <div className="nav-links-desktop">
          <a href="#how-it-works" className="nav-link">
            How It Works
          </a>
          <a href="#features" className="nav-link">
            Features
          </a>
          {/* <a href="#events" className="nav-link">
            Events
          </a> */}
          <a href="#creators" className="nav-link">
            Creators
          </a>
          {/* <a href="#testimonials" className="nav-link">
            Testimonials
          </a> */}
          <Link to="/login" className="nav-link-button">
            Login
          </Link>
          <Link to="/signup" className="nav-link-button primary">
            Sign Up
          </Link>
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile menu with animation */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button className="close-menu" onClick={() => setMenuOpen(false)}>
          <X size={24} />
        </button>
        <div className="mobile-menu-links">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How It Works
          </a>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          {/* <a href="#events" onClick={() => setMenuOpen(false)}>
            Events
          </a> */}
          <a href="#creators" onClick={() => setMenuOpen(false)}>
            Creators
          </a>
          {/* <a href="#testimonials" onClick={() => setMenuOpen(false)}>
            Testimonials
          </a> */}
          <Link to="/login" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link to="/signup" onClick={() => setMenuOpen(false)}>
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

