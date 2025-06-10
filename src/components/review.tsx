"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Star, ArrowRight, Sparkles } from "lucide-react"

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
    <div className={`review-cta-wrapper ${isVisible ? "review-visible" : ""}`}>
      <div className="review-cta-background">
        <div className="review-floating-stars">
          <Sparkles className="star star-1" />
          <Sparkles className="star star-2" />
          <Sparkles className="star star-3" />
          <Star className="star star-4" />
          <Star className="star star-5" />
        </div>

        <div className="review-cta-content">
          <div className="review-cta-icon">
            <Star className="review-main-star" />
          </div>

          <div className="review-cta-text">
            <h3 className="review-cta-title">Share Your Experience!</h3>
            <p className="review-cta-message">Did you buy ticket for this event and attend? Leave a review about it!</p>
          </div>

          <button
            className={`review-cta-button ${isHovered ? "review-hovered" : ""}`}
            onClick={handleReviewClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span className="review-button-text">Leave a Review</span>
            <ArrowRight className="review-button-arrow" />
            <div className="review-button-ripple"></div>
          </button>
        </div>

        <div className="review-cta-glow"></div>
      </div>

      <style data-review-component>{`
        .review-cta-wrapper {
          margin: 32px 0;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          isolation: isolate;
        }

        .review-cta-wrapper.review-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .review-cta-background {
          position: relative;
          background: linear-gradient(135deg, #6b2fa5 0%, #8b5fbf 50%, #a855f7 100%);
          border-radius: 20px;
          padding: 32px 24px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(107, 47, 165, 0.3);
          transition: all 0.3s ease;
        }

        .review-cta-background:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(107, 47, 165, 0.4);
        }

        .review-floating-stars {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .star {
          position: absolute;
          color: rgba(255, 255, 255, 0.3);
          animation: reviewFloat 6s ease-in-out infinite;
        }

        .star-1 {
          top: 20%;
          left: 10%;
          width: 16px;
          height: 16px;
          animation-delay: 0s;
        }

        .star-2 {
          top: 60%;
          left: 85%;
          width: 12px;
          height: 12px;
          animation-delay: 1s;
        }

        .star-3 {
          top: 30%;
          right: 20%;
          width: 14px;
          height: 14px;
          animation-delay: 2s;
        }

        .star-4 {
          bottom: 30%;
          left: 20%;
          width: 18px;
          height: 18px;
          animation-delay: 3s;
        }

        .star-5 {
          top: 10%;
          right: 40%;
          width: 10px;
          height: 10px;
          animation-delay: 4s;
        }

        @keyframes reviewFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-10px) rotate(90deg);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-5px) rotate(180deg);
            opacity: 0.4;
          }
          75% {
            transform: translateY(-15px) rotate(270deg);
            opacity: 0.7;
          }
        }

        .review-cta-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
        }

        .review-cta-icon {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          animation: reviewPulse 2s ease-in-out infinite;
        }

        .review-main-star {
          width: 28px;
          height: 28px;
          color: #fbbf24;
          fill: #fbbf24;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        @keyframes reviewPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
          }
        }

        .review-cta-text {
          color: white;
          max-width: 400px;
        }

        .review-cta-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          animation: reviewSlideInUp 0.8s ease-out 0.2s both;
        }

        .review-cta-message {
          font-size: 16px;
          margin: 0;
          opacity: 0.95;
          line-height: 1.5;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          animation: reviewSlideInUp 0.8s ease-out 0.4s both;
        }

        .review-cta-button {
          position: relative;
          background: rgba(255, 255, 255, 0.95);
          color: #6b2fa5;
          border: none;
          border-radius: 50px;
          padding: 14px 28px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          overflow: hidden;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          animation: reviewSlideInUp 0.8s ease-out 0.6s both;
        }

        .review-cta-button:hover {
          background: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .review-cta-button.review-hovered .review-button-arrow {
          transform: translateX(4px);
        }

        .review-button-text {
          position: relative;
          z-index: 2;
        }

        .review-button-arrow {
          width: 18px;
          height: 18px;
          transition: transform 0.3s ease;
          position: relative;
          z-index: 2;
        }

        .review-button-ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(107, 47, 165, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: all 0.6s ease;
        }

        .review-cta-button:active .review-button-ripple {
          width: 300px;
          height: 300px;
        }

        .review-cta-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          animation: reviewRotate 20s linear infinite;
          pointer-events: none;
        }

        @keyframes reviewRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes reviewSlideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .review-cta-background {
            padding: 24px 20px;
            border-radius: 16px;
          }

          .review-cta-title {
            font-size: 20px;
          }

          .review-cta-message {
            font-size: 14px;
          }

          .review-cta-button {
            padding: 12px 24px;
            font-size: 14px;
          }

          .review-cta-icon {
            width: 50px;
            height: 50px;
          }

          .review-main-star {
            width: 24px;
            height: 24px;
          }

          .star-1,
          .star-2,
          .star-3,
          .star-4,
          .star-5 {
            width: 12px;
            height: 12px;
          }
        }

        @media (max-width: 480px) {
          .review-cta-background {
            padding: 20px 16px;
            margin: 24px 0;
          }

          .review-cta-content {
            gap: 16px;
          }

          .review-cta-title {
            font-size: 18px;
          }

          .review-cta-message {
            font-size: 13px;
          }

          .review-cta-button {
            padding: 10px 20px;
            font-size: 13px;
          }
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          .review-cta-wrapper,
          .review-cta-background,
          .review-cta-button,
          .review-button-arrow,
          .star,
          .review-cta-icon,
          .review-cta-glow {
            animation: none !important;
            transition: none !important;
          }

          .review-cta-wrapper.review-visible {
            opacity: 1;
            transform: none;
          }

          .review-cta-title,
          .review-cta-message {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Review
