"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { CheckCircle, Edit3, X } from "lucide-react"
import "../pages/review.css"

interface SuccessToastProps {
  message: string
  type: "first-time" | "updated"
  onClose: () => void
}

const SuccessToast: React.FC<SuccessToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // Show toast with animation
    setTimeout(() => setIsVisible(true), 100)

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(progressInterval)
          return 0
        }
        return prev - 2
      })
    }, 100)

    return () => clearInterval(progressInterval)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div className={`success-toast ${type} ${isVisible ? "visible" : ""}`}>
      <div className="toast-content">
        <div className="toast-icon">
          {type === "first-time" ? <CheckCircle className="icon" /> : <Edit3 className="icon" />}
        </div>
        <div className="toast-message">
          <p>{message}</p>
        </div>
        <button className="toast-close" onClick={handleClose}>
          <X className="close-icon" />
        </button>
      </div>
      <div className="toast-progress">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  )
}

export default SuccessToast
