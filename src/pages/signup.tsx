"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore"
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
  const [verifyingReferral, setVerifyingReferral] = useState(false) // Referral verification indicator
  const [referralVerified, setReferralVerified] = useState(false) // Referral verification status
  const [referrerUsername, setReferrerUsername] = useState("") // Username of the referrer
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

  // Send welcome email after successful registration
  const sendWelcomeEmail = async (user: any) => {
    try {
      // Send welcome email
      const response = await fetch("https://spotix-backend.onrender.com/api/mail/welcome-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: fullName || username || user.displayName || "Valued Customer",
        }),
      })

      if (!response.ok) {
        console.error("Failed to send welcome email:", await response.text())
      }
    } catch (error) {
      console.error("Error sending welcome email:", error)
    }
  }

  // Check if a referral code exists and get the referrer's username
  const checkReferralCode = async (referralCode: string) => {
    if (!referralCode.trim()) return { valid: true, username: "" } // No referral code provided, continue signup

    setVerifyingReferral(true)
    try {
      // Check if the referral code exists in the referrals collection
      const referralDocRef = doc(db, "referrals", referralCode.trim())
      const referralDoc = await getDoc(referralDocRef)

      if (!referralDoc.exists()) {
        setError("The provided referral code doesn't exist. You can still sign up without a referral code.")
        setReferralVerified(false)
        setReferrerUsername("")
        return { valid: false, username: "" }
      }

      // Get the referrer's username
      const referralData = referralDoc.data()
      setReferralVerified(true)
      setReferrerUsername(referralData.username || "")
      return { valid: true, username: referralData.username || "" }
    } catch (error) {
      console.error("Error checking referral code:", error)
      setReferralVerified(false)
      setReferrerUsername("")
      return { valid: true, username: "" } // Continue signup even if there's an error checking the code
    } finally {
      setVerifyingReferral(false)
    }
  }

  const handleReferralBlur = async () => {
    if (referral.trim()) {
      await checkReferralCode(referral)
    } else {
      setReferralVerified(false)
      setReferrerUsername("")
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

    // Check if referral code is valid if provided
    if (referral.trim()) {
      const { valid, username } = await checkReferralCode(referral)
      if (!valid) {
        return
      }
      setReferrerUsername(username)
    }

    setSigningUp(true)

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update profile with username
      await updateProfile(user, { displayName: username })

      // Send Firebase verification email
      setSendingEmail(true)
      await sendEmailVerification(user)

      // Store user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        username,
        email,
        referral,
        referredBy: referrerUsername || null, // Store the referrer's username
        isBooker: false,
        wallet: 0.0,
        createdAt: new Date(),
        emailVerified: false,
      })

      // Process referral if provided
      if (referral.trim() && referralVerified) {
        try {
          const referralDocRef = doc(db, "referrals", referral.trim())
          const referralDoc = await getDoc(referralDocRef)

          if (referralDoc.exists()) {
            const referralData = referralDoc.data()

            // Add the new user to the referred users list
            await updateDoc(referralDocRef, {
              referredUsers: arrayUnion({
                username: username,
                joinedAt: serverTimestamp(),
              }),
              refGain: (referralData.refGain || 0) + 200, // Add 200 to the referrer's earnings
            })
          }
        } catch (referralError) {
          console.error("Error processing referral:", referralError)
          // Continue with signup even if referral processing fails
        }
      }

      // Send welcome email
      await sendWelcomeEmail(user)

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
    } finally {
      setSendingEmail(false)
      setSigningUp(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Spotix - Sign Up</title>
        <meta name="description" content="Sign up to begin your Spotix Adventure." />
      </Helmet>
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

            <div className="referral-input-container">
              <input
                type="text"
                placeholder="Referral Code (Optional)"
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                onBlur={handleReferralBlur}
                className={referralVerified ? "referral-verified" : ""}
              />
              {verifyingReferral && (
                <div className="referral-verifying">
                  <Loader2 size={16} className="loading-icon" />
                  <span>Verifying...</span>
                </div>
              )}
              {referralVerified && referrerUsername && (
                <div className="referral-success">
                  <CheckCircle size={16} className="success-icon" />
                  <span>Valid code from {referrerUsername}</span>
                </div>
              )}
            </div>

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

      <style>{`
        /* Add these styles for the referral verification */
        .referral-input-container {
          position: relative;
          margin-bottom: 15px;
        }

        .referral-verified {
          border-color: #28a745 !important;
          background-color: rgba(40, 167, 69, 0.05) !important;
        }

        .referral-verifying, .referral-success {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 5px;
          font-size: 0.85rem;
        }

        .referral-verifying {
          color: #6b2fa5;
        }

        .referral-success {
          color: #28a745;
        }

        .loading-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

export default Signup
