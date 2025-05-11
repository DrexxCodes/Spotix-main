"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth } from "../services/firebase"
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { Eye, EyeOff, AlertCircle, Mail, Loader2, CheckCircle } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import Preloader from "../components/preloader"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [showVerificationOption, setShowVerificationOption] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null)
  const [verificationMessage, setVerificationMessage] = useState("")

  const navigate = useNavigate()
  const location = useLocation()

  const words = ["Event", "Party", "Meeting", "Conference"]

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
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Check for verification message from signup
  useEffect(() => {
    if (location.state && location.state.verificationMessage) {
      setVerificationMessage(location.state.verificationMessage)

      // Clear the message after 10 seconds
      const timer = setTimeout(() => {
        setVerificationMessage("")
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [location])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setShowVerificationOption(false)
    setLoggingIn(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Check if email is verified
      if (!user.emailVerified) {
        setUnverifiedUser(user)
        setShowVerificationOption(true)
        setError("Please verify your email before logging in.")
        setLoggingIn(false)
        return
      }

      navigate("/")
    } catch (err: any) {
      console.error("Login error:", err)
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password.")
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.")
      } else {
        setError("Failed to login. Please try again.")
      }
      setLoggingIn(false)
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedUser) return

    setSendingVerification(true)
    setVerificationSent(false)

    try {
      // Send Firebase verification email
      await sendEmailVerification(unverifiedUser)

      // Also send our custom verification email
      const response = await fetch("/api/mail/email-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: unverifiedUser.email,
          name: unverifiedUser.displayName || "Valued Customer",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send custom verification email")
      }

      setVerificationSent(true)
      setTimeout(() => {
        setVerificationSent(false)
      }, 5000)
    } catch (error) {
      console.error("Error resending verification:", error)
      setError("Failed to resend verification email. Please try again.")
    } finally {
      setSendingVerification(false)
    }
  }

  return (
    <>
      <div className="fix-login">
        <Preloader loading={loading || loggingIn} />
        <div className="auth-container">
          <div className="auth-form">
            <img src="/logo.svg" alt="Logo" className="auth-logo" />
            <h2>Login</h2>

            {verificationMessage && (
              <div className="verification-message">
                <CheckCircle size={16} className="verification-icon" />
                <p>{verificationMessage}</p>
              </div>
            )}

            {error && (
              <div className="error-message">
                <AlertCircle size={16} className="error-icon" />
                <p>{error}</p>
              </div>
            )}

            {showVerificationOption && (
              <div className="verification-option">
                <p>Your email is not verified. Please check your inbox for the verification link.</p>
                <button
                  className="resend-verification-btn"
                  onClick={handleResendVerification}
                  disabled={sendingVerification}
                >
                  {sendingVerification ? (
                    <>
                      <Loader2 size={16} className="loading-icon" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      Resend Verification Email
                    </>
                  )}
                </button>

                {verificationSent && (
                  <div className="verification-sent-message">
                    <p>Verification email sent! Please check your inbox.</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {showPassword ? (
                  <EyeOff className="password-toggle" onClick={() => setShowPassword(false)} />
                ) : (
                  <Eye className="password-toggle" onClick={() => setShowPassword(true)} />
                )}
              </div>

              <button type="submit" disabled={loggingIn}>
                {loggingIn ? "Logging in..." : "Login"}
              </button>
            </form>

            <p>
              Don't have an account? <a href="/signup">Sign up</a>
            </p>
            <p>
              <a href="/forgot-password">Forgot Password?</a>
            </p>
          </div>

          <div className="auth-text">
            <img src="/logo.svg" alt="Logo" className="auth-logo" />
            Use Spotix to Book That <span id="animated-text">Event</span>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
