"use client"

import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import heroImage from "/hero.jpg"

const Hero = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const parallaxRef = useRef<HTMLDivElement>(null)

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

    // Parallax effect
    const handleScroll = () => {
      const scrolled = window.pageYOffset
      const parallaxElement = parallaxRef.current
      
      if (parallaxElement) {
        const speed = 0.5 // Adjust this value to control parallax speed (0.1 = slow, 0.8 = fast)
        parallaxElement.style.transform = `translateY(${scrolled * speed}px)`
      }
    }

    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <section className="hero-section h-screen w-screen overflow-hidden relative flex items-center justify-center">
      {/* Background Image with Parallax */}
      <div 
        ref={parallaxRef}
        className="absolute inset-0 w-full h-full z-0 will-change-transform"
        style={{ 
          height: '120%', 
          top: '-10%',
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      {/* Dark Overlay */}
      <div className="hero-overlay absolute inset-0 w-full h-full z-1"></div>
      
      <div className="hero-content relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1
          ref={titleRef}
          className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 opacity-0 transform translate-y-8 transition-all duration-800 ease-out"
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
          className="hero-cta flex flex-col sm:flex-row justify-center gap-4 opacity-0 transform translate-y-8 transition-all duration-800 ease-out"
        >
          <Link
            to="/home"
            className="hero-button primary bg-white text-[#6b2fa5] hover:bg-opacity-90 px-10 py-4 min-w-[180px] rounded-full text-lg font-medium transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
          >
            Get Started
          </Link>
          <Link
            to="/createevent"
            className="hero-button secondary bg-transparent border-2 border-white text-white hover:bg-white hover:bg-opacity-10 hover:text-[#6b2fa5] px-10 py-4 min-w-[180px] rounded-full text-lg font-medium transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
          >
            Create Events
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Hero