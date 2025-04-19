"use client"

import type React from "react"
import { useState } from "react"
import "boxicons/css/boxicons.min.css" 

interface ShareBtnProps {
  url: string
  title?: string
}

const ShareBtn: React.FC<ShareBtnProps> = ({ url, title = "Check out this event!" }) => {
  const [isCopied, setIsCopied] = useState(false)

  const encodedTitle = encodeURIComponent(title)
  const encodedUrl = encodeURIComponent(url)

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank")
  }

  const shareToWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`, "_blank")
  }

  const shareToInstagram = () => {
    // Instagram doesn't have a direct share URL, but we can show a message
    alert("Instagram doesn't support direct sharing. Copy the link and share it manually on Instagram.")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    })
  }

  return (
    <div className="share-btn-container">
      <button className="share-btn">
        <span className="share-text">Share</span>
        <i className="bx bx-share-alt share-icon"></i>
      </button>

      <div className="share-options">
        <button onClick={shareToWhatsApp} className="share-option whatsapp" aria-label="Share to WhatsApp">
          <i className="bx bxl-whatsapp bx-burst social-icon"></i>
        </button>

        <button onClick={shareToFacebook} className="share-option facebook" aria-label="Share to Facebook">
          <i className="bx bxl-facebook bx-burst social-icon"></i>
        </button>

        <button onClick={shareToInstagram} className="share-option instagram" aria-label="Share to Instagram">
          <i className="bx bxl-instagram bx-burst social-icon"></i>
        </button>

        <button onClick={copyToClipboard} className="share-option copy" aria-label="Copy link">
          {isCopied ? <i className="bx bx-check bx-burst social-icon"></i> : <i className="bx bx-link bx-burst social-icon"></i>}
        </button>
      </div>
    </div>
  )
}

export default ShareBtn
