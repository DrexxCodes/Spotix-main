"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Eye, EyeOff, AlertCircle, Mail, Loader2, CheckCircle, Shield, User } from "lucide-react"
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
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [formTouched, setFormTouched] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

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

  // Check for verification message from signup
  useEffect(() => {
    if (location.state && location.state.verificationMessage) {
      setVerificationMessage(location.state.verificationMessage)

      // Clear the message after 12 seconds
      const timer = setTimeout(() => {
        setVerificationMessage("")
      }, 12000)

      return () => clearTimeout(timer)
    }
  }, [location])

  // Clear error when user starts typing
  useEffect(() => {
    if (formTouched && (email || password)) {
      setError("")
    }
  }, [email, password, formTouched])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const getUserFriendlyError = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-email":
      case "auth/invalid-credential":
      case "auth/user-disabled":
        return "Incorrect email or password"
      case "auth/too-many-requests":
        return "Too many failed attempts. Please wait and try again"
      case "auth/network-request-failed":
        return "Please check your internet connection and try again"
      case "auth/weak-password":
        return "Password is too weak. Please use a stronger password"
      case "auth/email-already-in-use":
        return "An account with this email already exists"
      case "auth/operation-not-allowed":
        return "This sign-in method is not enabled. Please contact support"
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email using a different sign-in method"
      default:
        return "Unable to sign in. Please try again"
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setShowVerificationOption(false)
    setLoggingIn(true)
    setFormTouched(true)

    // Client-side validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      setLoggingIn(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoggingIn(false)
      return
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Check if email is verified in Firebase
      if (!user.emailVerified) {
        setUnverifiedUser(user)
        setShowVerificationOption(true)
        setError("Please verify your email address to continue")
        setLoggingIn(false)
        return
      }

      // Check Firestore emailVerified status
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()

        // If Firebase says email is verified but our DB doesn't, update DB
        if (user.emailVerified && userData.emailVerified === false) {
          await updateDoc(userDocRef, {
            emailVerified: true,
          })
        }

        // If Firestore says email is not verified, deny login
        if (userData.emailVerified === false) {
          setUnverifiedUser(user)
          setShowVerificationOption(true)
          setError("Please verify your email address to continue")
          setLoggingIn(false)
          return
        }
      }

      // Successful login - clear form and redirect
      setEmail("")
      setPassword("")

      // Check for redirect after login
      const redirectPath = sessionStorage.getItem("redirectAfterLogin")
      if (redirectPath) {
        sessionStorage.removeItem("redirectAfterLogin")
        navigate(redirectPath)
      } else {
        navigate("/home")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      const friendlyError = getUserFriendlyError(err.code)
      setError(friendlyError)
      setLoggingIn(false)
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedUser) return

    setSendingVerification(true)
    setVerificationSent(false)

    try {
      await sendEmailVerification(unverifiedUser)
      setVerificationSent(true)
      setTimeout(() => {
        setVerificationSent(false)
      }, 8000)
    } catch (error: any) {
      console.error("Error resending verification:", error)
      setError("Unable to send verification email. Please try again")
    } finally {
      setSendingVerification(false)
    }
  }

  const dismissError = () => {
    setError("")
    setShowVerificationOption(false)
  }

  return (
    <>
      <Helmet>
        <title>Sign In | Spotix</title>
        <meta name="description" content="Sign in to your Spotix account to manage events and bookings" />
        <link rel="canonical" href="/login" />
        <meta property="og:title" content="Sign In | Spotix" />
        <meta property="og:description" content="Sign in to your Spotix account to manage events and bookings" />
        <meta property="og:url" content="/login" />
      </Helmet>

      <div className="fix-login">
        <Preloader loading={loading || loggingIn} />
        <div className="auth-container">
          <div className="auth-form">
            <div className="auth-header">
              <img src="/logo.svg" alt="Spotix Logo" className="auth-logo" />
              <h1>Welcome Back</h1>
              <p className="auth-subtitle">Sign in to your account to continue</p>
            </div>

            {verificationMessage && (
              <div className="success-message verification-message">
                <CheckCircle size={18} className="message-icon" />
                <div className="message-content">
                  <p>{verificationMessage}</p>
                </div>
                <button className="dismiss-btn" onClick={() => setVerificationMessage("")} aria-label="Dismiss message">
                  ×
                </button>
              </div>
            )}

            {error && (
              <div className="error-message">
                <AlertCircle size={18} className="message-icon" />
                <div className="message-content">
                  <p>{error}</p>
                </div>
                <button className="dismiss-btn" onClick={dismissError} aria-label="Dismiss error">
                  ×
                </button>
              </div>
            )}

            {showVerificationOption && (
              <div className="verification-option">
                <div className="verification-header">
                  <Shield size={20} className="verification-icon" />
                  <h3>Email Verification Required</h3>
                </div>
                <p>
                  We've sent a verification link to your email address. Please check your inbox and click the link to
                  verify your account.
                </p>

                <button
                  className="resend-verification-btn"
                  onClick={handleResendVerification}
                  disabled={sendingVerification || verificationSent}
                >
                  {sendingVerification ? (
                    <>
                      <Loader2 size={16} className="loading-icon" />
                      Sending verification email...
                    </>
                  ) : verificationSent ? (
                    <>
                      <CheckCircle size={16} />
                      Verification email sent!
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
                    <p>✅ Verification email sent successfully! Please check your inbox and spam folder.</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <div className={`input-group ${emailFocused || email ? "focused" : ""}`}>
                <label htmlFor="email" className="input-label">
                  <User size={16} />
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
                  <Shield size={16} />
                  Password
                </label>
                <div className="password-container">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    autoComplete="current-password"
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

              <button type="submit" disabled={loggingIn || !email || !password} className="submit-btn">
                {loggingIn ? (
                  <>
                    <Loader2 size={18} className="loading-icon" />
                    Signing you in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="auth-links">
              <p className="auth-link">
                Don't have an account?{" "}
                <a href="/signup" className="link-primary">
                  Create account
                </a>
              </p>
              <p className="auth-link">
                <a href="/forgot-password" className="link-secondary">
                  Forgot your password?
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

        .verification-option {
          background: linear-gradient(135deg, #ebf8ff, #bee3f8);
          border: 1px solid #90cdf4;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          animation: slideIn 0.3s ease-out;
        }

        .verification-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .verification-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #2c5282;
        }

        .verification-icon {
          color: #3182ce;
        }

        .verification-option p {
          color: #2c5282;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .resend-verification-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #3182ce;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          justify-content: center;
        }

        .resend-verification-btn:hover:not(:disabled) {
          background: #2c5282;
          transform: translateY(-1px);
        }

        .resend-verification-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .verification-sent-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(72, 187, 120, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(72, 187, 120, 0.3);
        }

        .verification-sent-message p {
          margin: 0;
          color: #22543d;
          font-size: 0.85rem;
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

        .link-secondary {
          color: #718096;
          text-decoration: none;
          transition: color 0.2s;
        }

        .link-secondary:hover {
          color: #4a5568;
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

        @media (max-width: 768px) {
          .auth-container {
            flex-direction: column;
            padding: 2rem 1rem;
            gap: 2rem;
          }

          .auth-text {
            margin-left: 0;
            margin-top: 0;
            max-width: 100%;
          }

          .auth-form {
            padding: 3rem 2rem;
            margin: 2rem 0;
          }

          .auth-text h2 {
            font-size: 1.75rem;
          }

          .auth-description {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </>
  )
}

export default Login
