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

    // Add resize event listener
    window.addEventListener("resize", handleResize)

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

    // Set canvas dimensions to full viewport
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

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
  }

  return (
    <section className="h-screen w-screen overflow-hidden relative bg-gradient-to-br from-[#6b2fa5] to-[#9b59b6] flex items-center justify-center">
      <canvas id="hero-particles" className="absolute inset-0 w-full h-full z-0"></canvas>
      <div className="hero-content relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1
          ref={titleRef}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 opacity-0 transform translate-y-8 transition-all duration-800 ease-out"
        >
          Discover & Book Amazing Events
        </h1>
        <p
          ref={subtitleRef}
          className="hero-subtitle text-lg md:text-xl text-white mb-10 opacity-0 transform translate-y-8 transition-all duration-800 ease-out mx-auto"
        >
          Your one-stop platform for finding and booking tickets to the most exciting events
        </p>
        <div
          ref={ctaRef}
          className="flex flex-col sm:flex-row justify-center gap-4 opacity-0 transform translate-y-8 transition-all duration-800 ease-out"
        >
          <Link
            to="/home"
            className="hero-button bg-white text-[#6b2fa5] hover:bg-opacity-90 px-10 py-4 min-w-[180px] rounded-full text-lg font-medium transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
          >
            Get Started
          </Link>
          <Link
            to="/createevent"
            className="hero-button bg-transparent border-2 border-white text-white hover:bg-white hover:bg-opacity-10 hover:text-[#6b2fa5] px-10 py-4 min-w-[180px] rounded-full text-lg font-medium transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
          >
            Create Events
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
