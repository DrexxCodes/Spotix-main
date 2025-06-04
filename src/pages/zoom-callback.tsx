"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Preloader from "../components/preloader"

const ZoomCallback = () => {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
  const [message, setMessage] = useState("Processing Zoom authorization...")
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get("code")
        const state = urlParams.get("state")
        const error = urlParams.get("error")

        if (error) {
          setStatus("error")
          setMessage(`Authorization failed: ${error}`)
          setTimeout(() => {
            navigate("/booker-profile")
          }, 3000)
          return
        }

        if (code && state === "zoom_oauth_spotix") {
          setMessage("Authorization successful! Redirecting...")
          setStatus("success")

          // Get the return URL or default to booker profile
          const returnUrl = localStorage.getItem("zoom_oauth_return_url") || "/booker-profile"
          localStorage.removeItem("zoom_oauth_return_url")

          // Add the code as a query parameter to the return URL
          const url = new URL(returnUrl, window.location.origin)
          url.searchParams.set("code", code)
          url.searchParams.set("state", state)

          setTimeout(() => {
            window.location.href = url.toString()
          }, 1500)
        } else {
          setStatus("error")
          setMessage("Invalid authorization response")
          setTimeout(() => {
            navigate("/booker-profile")
          }, 3000)
        }
      } catch (error) {
        console.error("Error handling Zoom callback:", error)
        setStatus("error")
        setMessage("An error occurred during authorization")
        setTimeout(() => {
          navigate("/booker-profile")
        }, 3000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="zoom-callback-container">
      <Preloader loading={status === "processing"} />
      <div className="callback-content">
        <div className="callback-card">
          <img src="/images/zoom-logo.png" alt="Zoom" className="callback-logo" />
          <h2>Zoom Integration</h2>
          <p className={`callback-message ${status}`}>{message}</p>
          {status === "success" && (
            <div className="success-indicator">
              <div className="checkmark">✓</div>
            </div>
          )}
          {status === "error" && (
            <div className="error-indicator">
              <div className="error-mark">✗</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .zoom-callback-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .callback-content {
          width: 100%;
          max-width: 400px;
        }

        .callback-card {
          background: white;
          border-radius: 16px;
          padding: 40px 30px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .callback-logo {
          width: 64px;
          height: 64px;
          object-fit: contain;
          margin-bottom: 20px;
        }

        .callback-card h2 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 24px;
          font-weight: 600;
        }

        .callback-message {
          font-size: 16px;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .callback-message.processing {
          color: #666;
        }

        .callback-message.success {
          color: #4CAF50;
          font-weight: 500;
        }

        .callback-message.error {
          color: #f44336;
          font-weight: 500;
        }

        .success-indicator, .error-indicator {
          margin-top: 20px;
        }

        .checkmark, .error-mark {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          font-size: 24px;
          font-weight: bold;
          color: white;
        }

        .checkmark {
          background: #4CAF50;
          animation: scaleIn 0.5s ease-out;
        }

        .error-mark {
          background: #f44336;
          animation: scaleIn 0.5s ease-out;
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default ZoomCallback
