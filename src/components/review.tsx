"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Star, ArrowRight, Sparkles } from "lucide-react"
import "../styles/review-component.css"

interface ReviewProps {
  eventId: string
  eventName: string
}

const Review = ({ eventId, eventName }: ReviewProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const handleReviewClick = () => {
    navigate("/event-review")
  }

  return (
    <div className={`review-cta-container ${isVisible ? "visible" : ""}`}>
      <div className="review-cta-background">
        <div className="floating-stars">
          <Sparkles className="star star-1" />
          <Sparkles className="star star-2" />
          <Sparkles className="star star-3" />
          <Star className="star star-4" />
          <Star className="star star-5" />
        </div>

        <div className="review-cta-content">
          <div className="review-cta-icon">
            <Star className="main-star" />
          </div>

          <div className="review-cta-text">
            <h3 className="review-cta-title">Share Your Experience!</h3>
            <p className="review-cta-message">Did you buy ticket for this event and attend? Leave a review about it!</p>
          </div>

          <button
            className={`review-cta-button ${isHovered ? "hovered" : ""}`}
            onClick={handleReviewClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span className="button-text">Leave a Review</span>
            <ArrowRight className="button-arrow" />
            <div className="button-ripple"></div>
          </button>
        </div>

        <div className="review-cta-glow"></div>
      </div>
    </div>
  )
}

export default Review
