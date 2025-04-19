"use client"

import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"

const Hero = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Animate elements when component mounts
    const title = titleRef.current
    const subtitle = subtitleRef.current
    const cta = ctaRef.current

    if (title) title.classList.add("animate-in")

    setTimeout(() => {
      if (subtitle) subtitle.classList.add("animate-in")
    }, 300)

    setTimeout(() => {
      if (cta) cta.classList.add("animate-in")
    }, 600)

    // Initialize the particle background
    initParticles()

    return () => {
      // Clean up any event listeners or animations
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Handle window resize for responsive particles
  const handleResize = () => {
    // Reinitialize particles on resize
    initParticles()
  }

  // Initialize particle animation
  const initParticles = () => {
    const canvas = document.getElementById("hero-particles") as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = window.innerWidth
    canvas.height = 600

    // Create particles
    const particles: Particle[] = []
    const particleCount = Math.min(Math.floor(window.innerWidth / 10), 100)

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        color: `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
      })
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        // Move particles
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.fill()
      })
    }

    animate()

    // Add resize listener
    window.addEventListener("resize", handleResize)
  }

  return (
    <section className="hero-section">
      <canvas id="hero-particles" className="hero-particles"></canvas>
      <div className="hero-content">
        <h1 ref={titleRef} className="hero-title">
          Discover & Book Amazing Events
        </h1>
        <p ref={subtitleRef} className="hero-subtitle">
          Your one-stop platform for finding and booking tickets to the most exciting events
        </p>
        <div ref={ctaRef} className="hero-cta">
          <Link to="/home" className="hero-button primary">
            Get Started
          </Link>
          <Link to="/home" className="hero-button secondary">
            Explore Events
          </Link>
        </div>
      </div>
    </section>
  )
}

// Type for particles
interface Particle {
  x: number
  y: number
  radius: number
  color: string
  speedX: number
  speedY: number
}

export default Hero

