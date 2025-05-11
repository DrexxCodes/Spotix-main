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

  // Function to send verification email using our custom API
  const sendVerificationEmail = async (user, userName) => {
    setSendingEmail(true)
    try {
      // First, get the verification URL from Firebase
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
        throw new Error("Failed to send verification email")
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

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setSigningUp(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

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

      // Send email verification using our custom function
      await sendVerificationEmail(user, fullName || username)

      // Clear form
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setFullName("")
      setUsername("")
      setReferral("")

      // Redirect to login with verification message
      navigate("/login", {
        state: {
          verificationMessage:
            "We have sent you an email to verify your account. Please check your inbox and verify your email before logging in.",
        },
      })
    } catch (err: any) {
      console.error("Signup error:", err)
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use. Please try another email or login.")
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.")
      } else {
        setError("Failed to create an account. Please try again later.")
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
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

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

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
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
