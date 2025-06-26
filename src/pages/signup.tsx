"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore"
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, Shield, User, Mail, Lock, Users, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Preloader from "../components/preloader"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [signingUp, setSigningUp] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [verifyingReferral, setVerifyingReferral] = useState(false)
  const [referralVerified, setReferralVerified] = useState(false)
  const [referrerUsername, setReferrerUsername] = useState("")
  const [formTouched, setFormTouched] = useState(false)
  const [emailError, setEmailError] = useState("")

  // Focus states for better UX
  const [fullNameFocused, setFullNameFocused] = useState(false)
  const [usernameFocused, setUsernameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false)
  const [referralFocused, setReferralFocused] = useState(false)

  const navigate = useNavigate()

  // Words for animation
  const words = ["Event", "Party", "Meeting", "Conference", "Gathering", "Workshop"]

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

  // Clear errors when user starts typing
  useEffect(() => {
    if (formTouched && (email || password || fullName || username)) {
      setError("")
    }
  }, [email, password, fullName, username, formTouched])

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.toLowerCase().endsWith(".com")
  }

  const getUserFriendlyError = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please try logging in instead"
      case "auth/weak-password":
        return "Please choose a stronger password with at least 6 characters"
      case "auth/invalid-email":
        return "Please enter a valid email address"
      case "auth/operation-not-allowed":
        return "Account creation is temporarily disabled. Please try again later"
      case "auth/network-request-failed":
        return "Please check your internet connection and try again"
      case "auth/too-many-requests":
        return "Too many signup attempts. Please wait and try again"
      default:
        return "Unable to create your account. Please try again"
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setError("")

    if (value && !validateEmail(value)) {
      setError("Please enter a valid email address ending with .com")
    } else {
      setEmailError("")
    }
  }

  // Send welcome email after successful registration
  const sendWelcomeEmail = async (user: any) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/mail/welcome-email`, {
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
    if (!referralCode.trim()) return { valid: true, username: "", referralData: null }

    setVerifyingReferral(true)
    try {
      const referralDocRef = doc(db, "referrals", referralCode.trim())
      const referralDoc = await getDoc(referralDocRef)

      if (!referralDoc.exists()) {
        setError("The referral code you entered doesn't exist. You can continue signing up without it")
        setReferralVerified(false)
        setReferrerUsername("")
        return { valid: false, username: "", referralData: null }
      }

      const referralData = referralDoc.data()
      const referrerUsername = referralData.username || ""

      setReferralVerified(true)
      setReferrerUsername(referrerUsername)
      setError("")

      return { valid: true, username: referrerUsername, referralData }
    } catch (error) {
      console.error("Error checking referral code:", error)
      setReferralVerified(false)
      setReferrerUsername("")
      setError("Unable to verify referral code. You can continue signing up without it")
      return { valid: true, username: "", referralData: null }
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
    setFormTouched(true)

    // Client-side validation
    if (!fullName.trim()) {
      setError("Please enter your full name")
      return
    }

    if (!username.trim()) {
      setError("Please enter a username")
      return
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address ending with .com")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
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
        referralCodeUsed: referral.trim() || null,
        referredBy: referrerUsername || null,
        isBooker: false,
        wallet: 0.0,
        createdAt: serverTimestamp(),
        emailVerified: false,
      })

      // Process referral if provided
      if (referral.trim()) {
        try {
          const referralDocRef = doc(db, "referrals", referral.trim())
          const referralDoc = await getDoc(referralDocRef)

          if (referralDoc.exists()) {
            const referralData = referralDoc.data()

            const newReferredUser = {
              username: username,
              email: email,
              fullName: fullName,
              joinedAt: new Date().toISOString(),
              userId: user.uid,
            }

            await updateDoc(referralDocRef, {
              referredUsers: arrayUnion(newReferredUser),
              refGain: (referralData.refGain || 0) + 200,
              totalReferrals: (referralData.totalReferrals || 0) + 1,
              lastReferralAt: serverTimestamp(),
            })

            setSuccess(`Successfully signed up using ${referralData.username}'s referral code!`)
          }
        } catch (referralError) {
          console.error("Error processing referral during signup:", referralError)
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
            "Your account has been created successfully! Please check your email to verify your account before logging in.",
        },
      })
    } catch (err: any) {
      console.error("Signup error:", err)
      const friendlyError = getUserFriendlyError(err.code)
      setError(friendlyError)
      setSigningUp(false)
    } finally {
      setSendingEmail(false)
      setSigningUp(false)
    }
  }

  const dismissError = () => {
    setError("")
  }

  const dismissSuccess = () => {
    setSuccess("")
  }

  return (
    <>
      <Helmet>
        <title>Create Account | Spotix</title>
        <meta name="description" content="Join Spotix and start your event management journey today" />
      </Helmet>

      <div className="fix-login">
        <Preloader loading={loading || signingUp} />
        <div className="auth-container">
          <div className="form-scroll-container">
          <div className="auth-form">
            <div className="auth-header">
              <img src="/logo.svg" alt="Spotix Logo" className="auth-logo" />
              <h1>Create Your Account</h1>
              <p className="auth-subtitle">Join thousands of event organizers on Spotix</p>
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

            {success && (
              <div className="success-message">
                <CheckCircle size={18} className="message-icon" />
                <div className="message-content">
                  <p>{success}</p>
                </div>
                <button className="dismiss-btn" onClick={dismissSuccess} aria-label="Dismiss message">
                  <X size={16} />
                </button>
              </div>
            )}

            {sendingEmail && (
              <div className="info-message">
                <Loader2 size={18} className="loading-icon" />
                <div className="message-content">
                  <p>Sending verification email...</p>
                </div>
              </div>
            )}

            
              <form onSubmit={handleSignup} className="login-form">
                <div className={`input-group ${fullNameFocused || fullName ? "focused" : ""}`}>
                  <label htmlFor="fullName" className="input-label">
                    <User size={16} />
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setFullNameFocused(true)}
                    onBlur={() => setFullNameFocused(false)}
                    required
                    autoComplete="name"
                    className="form-input"
                  />
                </div>

                <div className={`input-group ${usernameFocused || username ? "focused" : ""}`}>
                  <label htmlFor="username" className="input-label">
                    <User size={16} />
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                    required
                    autoComplete="username"
                    className="form-input"
                    minLength={3}
                  />
                </div>

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

                <div className={`input-group ${passwordFocused || password ? "focused" : ""}`}>
                  <label htmlFor="password" className="input-label">
                    <Lock size={16} />
                    Password
                  </label>
                  <div className="password-container">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      required
                      autoComplete="new-password"
                      className="form-input"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={`input-group ${confirmPasswordFocused || confirmPassword ? "focused" : ""}`}>
                  <label htmlFor="confirmPassword" className="input-label">
                    <Lock size={16} />
                    Confirm Password
                  </label>
                  <div className="password-container">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      required
                      autoComplete="new-password"
                      className="form-input"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={`input-group ${referralFocused || referral ? "focused" : ""}`}>
                  <label htmlFor="referral" className="input-label">
                    <Users size={16} />
                    Referral Code (Optional)
                  </label>
                  <input
                    id="referral"
                    type="text"
                    placeholder="Enter referral code"
                    value={referral}
                    onChange={(e) => setReferral(e.target.value)}
                    onFocus={() => setReferralFocused(true)}
                    onBlur={() => {
                      setReferralFocused(false)
                      handleReferralBlur()
                    }}
                    className="form-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    signingUp || sendingEmail || !fullName || !username || !email || !password || !confirmPassword
                  }
                  className="submit-btn"
                >
                  {signingUp ? (
                    <>
                      <Loader2 size={18} className="loading-icon" />
                      Creating your account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </div>

            <div className="auth-links">
              <p className="auth-link">
                Already have an account?{" "}
                <a href="/login" className="link-primary">
                  Sign in here
                </a>
              </p>
            </div>

            <div className="security-notice">
              <Shield size={14} />
              <span>Your information is protected with enterprise-grade security</span>
            </div>
          </div>

          <div className="auth-text">
            <img src="/logo.svg" alt="Spotix Logo" className="auth-logo" />
            <h2>
              Use Spotix to Book That <span id="animated-text">Event</span>
            </h2>
            <p className="auth-description">
              Join thousands of event organizers who trust Spotix for seamless event management and booking experiences.
            </p>
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
        }

        .auth-logo {
          width: 60px;
          height: 60px;
          margin-bottom: 0.5rem;
        }

        .success-message, .error-message, .info-message {
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

        .info-message {
          background: linear-gradient(135deg, #ebf8ff, #bee3f8);
          border: 1px solid #90cdf4;
          color: #2c5282;
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

        .login-form {
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

        .form-input.verified {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.05);
        }

        .password-container {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #718096;
          transition: color 0.2s;
          padding: 0.5rem;
          border-radius: 4px;
          z-index: 10;
          pointer-events: auto;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-container .form-input {
          padding-right: 3.5rem;
        }

        .referral-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #22c55e;
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

        .auth-link {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          color: white;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .link-primary {
          color:rgb(220, 222, 236);
          font-weight: 600;
        }

        // .auth-link:hover {
        //   color: #5a67d8;
        //   text-decoration: underline;
        // }

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

        .auth-description {
          font-size: 0.9rem;
          opacity: 0.9;
          line-height: 1.6;
          margin: 1.5rem 0 0 0;
        }

        /* Mobile Styles */
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
            font-size: 1.75rem;
          }

          .auth-description {
            font-size: 0.85rem;
          }
        }

        /* Scrollable Form Container */
        .form-scroll-container {
          max-height: 600px; /* Adjust as needed */
          overflow-y: auto;
          padding: 1rem 0; /* Add top and bottom padding */
        }

        /* Hide scrollbar for WebKit browsers */
        .form-scroll-container::-webkit-scrollbar {
          width: 0.5em;
        }

        .form-scroll-container::-webkit-scrollbar-track {
          background-color: transparent;
        }

        .form-scroll-container::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 0.25em;
        }

        /* Hide scrollbar for Firefox */
        .form-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
        }
      `}</style>
    </>
  )
}

export default Signup
