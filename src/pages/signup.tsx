"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Preloader from "../components/preloader"

const Signup = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [referral, setReferral] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true) // Page load preloader
  const [signingUp, setSigningUp] = useState(false) // Signup action preloader
  const [sendingEmail, setSendingEmail] = useState(false) // Email sending indicator
  const navigate = useNavigate()

  // Words for animation
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

  // Validate email format
  const validateEmail = (email: string): boolean => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return false
    }

    // Check if email ends with .com
    return email.toLowerCase().endsWith(".com")
  }

  // Function to send verification email using our custom API
  const sendVerificationEmail = async (user: any, userName: string): Promise<boolean> => {
    setSendingEmail(true)
    try {
      // First, send the Firebase verification email
      await sendEmailVerification(user)

      // Then send our custom welcome email
      const response = await fetch("/api/mail/email-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: userName,
        }),
      })

      if (!response.ok) {
        console.error("Failed to send custom verification email:", await response.text())
      }

      return true
    } catch (error) {
      console.error("Error sending verification email:", error)
      return false
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    // Validate email format
    if (!validateEmail(email)) {
      setError("Invalid email format. Email must end with .com")
      return
    }

    setSigningUp(true)

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update profile with username
      await updateProfile(user, { displayName: username })

      // Store user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        username,
        email,
        referral,
        isBooker: false,
        wallet: 0.0,
        createdAt: new Date(),
        emailVerified: false,
      })

      // Send verification emails (both Firebase default and our custom one)
      const emailSent = await sendVerificationEmail(user, fullName || username)

      if (!emailSent) {
        setSuccess("Account created, but we couldn't send the verification email. Please try logging in to resend it.")
      }

      // Clear form
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setFullName("")
      setUsername("")
      setReferral("")

      // Always redirect to login with verification message
      navigate("/login", {
        state: {
          verificationMessage:
            "Your account has been created! Please check your email to verify your account before logging in.",
        },
      })
    } catch (err: any) {
      console.error("Signup error:", err)
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use. Please try another email or login.")
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format. Please enter a valid email address.")
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection and try again.")
      } else {
        setError(`Failed to create an account: ${err.message || "Unknown error"}`)
      }
      setSigningUp(false)
    }
  }

  return (
    <>
      <Preloader loading={loading || signingUp} />
      <div className="auth-container">
        <div className="auth-form">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          <h2>Sign Up</h2>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} className="error-icon" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="success-message">
              <CheckCircle size={16} className="success-icon" />
              <p>{success}</p>
            </div>
          )}

          {sendingEmail && (
            <div className="sending-email-message">
              <Loader2 size={16} className="loading-icon" />
              <p>Sending verification email...</p>
            </div>
          )}

          <form onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email (must end with .com)"
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
                minLength={6}
              />
              {showPassword ? (
                <EyeOff className="password-toggle" onClick={() => setShowPassword(false)} />
              ) : (
                <Eye className="password-toggle" onClick={() => setShowPassword(true)} />
              )}
            </div>

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              type="text"
              placeholder="Referral Code (Optional)"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
            />

            <button type="submit" disabled={signingUp || sendingEmail}>
              {signingUp ? "Creating Account..." : "Sign Up"}
            </button>
            <p>
              Already a Spotix User? <a href="/login">Log in</a>
            </p>
          </form>
        </div>

        <div className="auth-text">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          Use Spotix to Book That <span id="animated-text">Event</span>
        </div>
      </div>
    </>
  )
}

export default Signup
