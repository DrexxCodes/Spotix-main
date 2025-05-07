"use client"

import { useEffect, useRef } from "react"

const Creators = () => {
  // Refs for animation elements
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Animation for elements when they come into view
    const animateOnScroll = () => {
      const elements = document.querySelectorAll(".animate-on-scroll")

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("animate-in")
              observerRef.current?.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.1 },
      )

      elements.forEach((el) => {
        observerRef.current?.observe(el)
      })
    }

    animateOnScroll()

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return (
    <section className="creators-section" id="creators">
      <div className="section-container">
        <h2 className="section-title animate-on-scroll">Meet Our Creators</h2>

        <div className="creators-grid animate-on-scroll">
          <div className="creator-card">
            <div className="creator-image-container">
              <img src="/bryan.png?height=300&width=300" alt="Ezene Chidebere Bryan" className="creator-image" />
            </div>
            <div className="creator-info">
              <h3 className="creator-name">
                <span className="animated-text">Ezene Chidebere Bryan</span>
              </h3>
              <p className="creator-title">CEO / Founder</p>
            </div>
          </div>

          <div className="creator-card">
            <div className="creator-image-container">
              <img
                src="/drexx.png?height=300&width=300"
                alt="Onyekwelu Michael (Drexx)"
                className="creator-image"
              />
            </div>
            <div className="creator-info">
              <h3 className="creator-name">
                <span className="animated-text">Onyekwelu Michael (Drexx)</span>
              </h3>
              <p className="creator-title">Dev / Co-Founder</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Creators
