"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth } from "../services/firebase"
import { Helmet } from "react-helmet"
import { sendPasswordResetEmail } from "firebase/auth"
import { AlertCircle, CheckCircle, Loader2, Shield, Mail, ArrowLeft, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Preloader from "../components/preloader"

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [formTouched, setFormTouched] = useState(false)

  const navigate = useNavigate()

  // Words for animation
  const words = ["Password", "Account", "Access", "Security", "Recovery", "Login"]

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
    let index = 0
    const interval = setInterval(() => {
      const animatedText = document.getElementById("animated-text")
      if (animatedText) {
        animatedText.style.opacity = "0"
        setTimeout(() => {
          animatedText.textContent = words[index]
          animatedText.style.opacity = "1"
          index = (index + 1) % words.length
        }, 300)
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Clear error when user starts typing
  useEffect(() => {
    if (formTouched && email) {
      setError("")
    }
  }, [email, formTouched])

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const getUserFriendlyError = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No account found with this email address"
      case "auth/invalid-email":
        return "Please enter a valid email address"
      case "auth/too-many-requests":
        return "Too many reset attempts. Please wait and try again"
      case "auth/network-request-failed":
        return "Please check your internet connection and try again"
      default:
        return "Unable to send reset email. Please try again"
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setError("")
    setFormTouched(true)

    // Client-side validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    setResetting(true)

    try {
      await sendPasswordResetEmail(auth, email)
      setMessage("Password reset email sent successfully! Please check your inbox and spam folder for the reset link.")

      // Clear email after successful send
      setTimeout(() => {
        setEmail("")
      }, 2000)
    } catch (err: any) {
      console.error("Password reset error:", err)
      const friendlyError = getUserFriendlyError(err.code)
      setError(friendlyError)
    } finally {
      setResetting(false)
    }
  }

  const dismissError = () => {
    setError("")
  }

  const dismissMessage = () => {
    setMessage("")
  }

  const goBackToLogin = () => {
    navigate("/login")
  }

  return (
    <>
      <Helmet>
        <title>Reset Password | Spotix</title>
        <meta name="description" content="Reset your Spotix account password securely" />
        <link rel="canonical" href="/forgot-password" />
        <meta property="og:title" content="Reset Password | Spotix" />
        <meta property="og:description" content="Reset your Spotix account password securely" />
        <meta property="og:url" content="/forgot-password" />
      </Helmet>

      <div className="fix-login">
        <Preloader loading={loading || resetting} />
        <div className="auth-container">
          <div className="auth-form">
            <div className="auth-header">
              <img src="/logo.svg" alt="Spotix Logo" className="auth-logo" />
              <h1>Reset Your Password</h1>
              <p className="auth-subtitle">Enter your email to receive a password reset link</p>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={18} className="message-icon" />
                <div className="message-content">
                  <p>{error}</p>
                </div>
                <button className="dismiss-btn" onClick={dismissError} aria-label="Dismiss error">
                  <X size={16} />
                </button>
              </div>
            )}

            {message && (
              <div className="success-message">
                <CheckCircle size={18} className="message-icon" />
                <div className="message-content">
                  <p>{message}</p>
                </div>
                <button className="dismiss-btn" onClick={dismissMessage} aria-label="Dismiss message">
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleReset} className="reset-form">
              <div className={`input-group ${emailFocused || email ? "focused" : ""}`}>
                <label htmlFor="email" className="input-label">
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  required
                  autoComplete="email"
                  className="form-input"
                />
              </div>

              <button type="submit" disabled={resetting || !email} className="submit-btn">
                {resetting ? (
                  <>
                    <Loader2 size={18} className="loading-icon" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            <div className="auth-links">
              <button onClick={goBackToLogin} className="back-to-login-btn">
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
              <p className="auth-link">
                Don't have an account?{" "}
                <a href="/signup" className="link-primary">
                  Create account
                </a>
              </p>
            </div>

            <div className="security-notice">
              <Shield size={14} />
              <span>Your password reset is secured with enterprise-grade encryption</span>
            </div>
          </div>

          <div className="auth-text">
            <img src="/logo.svg" alt="Spotix Logo" className="auth-logo" />
            <h2>
              Recover Your <span id="animated-text">Password</span>
            </h2>
            <p className="auth-description">
              Don't worry! It happens to the best of us. Enter your email address and we'll send you a secure link to
              reset your password.
            </p>
            <div className="forgot-illustration">
              <img src="/forgotP.svg" alt="Password Recovery" className="forgot-image" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          gap: 3rem;
        }

        .auth-form {
          background: white;
          border-radius: 16px;
          padding: 4rem 2.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 420px;
          position: relative;
          margin: 3rem 0;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
          margin: 1rem 0 0.5rem 0;
        }

        .auth-subtitle {
          color: #718096;
          font-size: 0.95rem;
          margin: 0;
          line-height: 1.4;
        }

        .auth-logo {
          width: 60px;
          height: 60px;
          margin-bottom: 0.5rem;
          border-radius: 50%;
          object-fit: cover;
        }

        .success-message, .error-message {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          position: relative;
          animation: slideIn 0.3s ease-out;
        }

        .success-message {
          background: linear-gradient(135deg, #f0fff4, #c6f6d5);
          border: 1px solid #9ae6b4;
          color: #22543d;
        }

        .error-message {
          background: linear-gradient(135deg, #fed7d7, #feb2b2);
          border: 1px solid #fc8181;
          color: #742a2a;
        }

        .message-icon {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .message-content {
          flex: 1;
        }

        .message-content p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .dismiss-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
          transition: opacity 0.2s;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dismiss-btn:hover {
          opacity: 1;
        }

        .reset-form {
          margin-bottom: 2rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
          transition: all 0.2s ease;
        }

        .input-group.focused {
          transform: translateY(-2px);
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #4a5568;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: #fafafa;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .auth-links {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .back-to-login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: #667eea;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0.5rem;
          border-radius: 6px;
          margin: 0 auto 1rem auto;
        }

        .back-to-login-btn:hover {
          color: #5a67d8;
          background: rgba(102, 126, 234, 0.1);
        }

        .auth-link {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          color: #718096;
        }

        .link-primary {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .link-primary:hover {
          color: #5a67d8;
          text-decoration: underline;
        }

        .security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #718096;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .auth-text {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2.5rem;
          text-align: center;
          color: white;
          margin-left: 2rem;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .auth-text h2 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1rem 0;
          line-height: 1.2;
        }

        #animated-text {
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          transition: opacity 0.3s ease;
          font-size: inherit;
          font-weight: inherit;
        }

        .auth-description {
          font-size: 0.9rem;
          opacity: 0.9;
          line-height: 1.6;
          margin: 1.5rem 0;
        }

        .forgot-illustration {
          margin-top: 2rem;
        }

        .forgot-image {
          max-width: 200px;
          height: auto;
          opacity: 0.8;
          filter: brightness(1.1);
        }

        .loading-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .auth-container {
            flex-direction: column;
            padding: 2rem 1rem;
            gap: 0;
          }

          .auth-text {
            display: none;
          }

          .auth-form {
            padding: 3rem 2rem;
            margin: 2rem 0;
            max-width: 100%;
          }

          .auth-header h1 {
            font-size: 1.5rem;
          }

          .auth-subtitle {
            font-size: 0.9rem;
          }
        }

        @media (max-height: 700px) {
          .auth-container {
            padding: 1rem;
          }

          .auth-form {
            padding: 2rem 1.5rem;
            margin: 1rem 0;
          }

          .auth-header {
            margin-bottom: 1.5rem;
          }

          .auth-header h1 {
            font-size: 1.5rem;
            margin: 0.5rem 0 0.25rem 0;
          }

          .auth-logo {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </>
  )
}

export default ForgotPassword
