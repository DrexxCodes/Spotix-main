"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import Preloader from "../components/preloader"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { Tooltip } from "../components/Tooltip"
// import "../styles/confirm.css"

interface UserProfile {
  uid: string
  fullName: string
  username: string
  email: string
  profilePicture: string
  accountName: string
  accountNumber: string
  bankName: string
  referralCode: string
  isBooker: boolean
}

interface BookerData {
  bookerName: string
  dateOfBirth: string
  bookerPassword: string
}

const BookerConfirm = () => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [bookerData, setBookerData] = useState<BookerData>({
    bookerName: "",
    dateOfBirth: "",
    bookerPassword: "",
  })
  const [consentChecked, setConsentChecked] = useState(false)
  const [profilePictureError, setProfilePictureError] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [ageError, setAgeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Calculate the maximum date of birth (18 years ago from today)
  const getMaxDateOfBirth = () => {
    const today = new Date()
    const eighteenYearsAgo = new Date(today)
    eighteenYearsAgo.setFullYear(today.getFullYear() - 18)
    return eighteenYearsAgo.toISOString().split("T")[0]
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        auth.onAuthStateChanged(async (authUser) => {
          if (authUser) {
            // User is signed in
            const userDocRef = doc(db, "users", authUser.uid)
            const userDoc = await getDoc(userDocRef)

            if (userDoc.exists()) {
              const userData = userDoc.data() as Omit<UserProfile, "uid">
              const userProfile = {
                uid: authUser.uid,
                ...userData,
                fullName: userData.fullName || "",
                profilePicture: userData.profilePicture || "/tempUser.svg",
                accountName: userData.accountName || "",
                accountNumber: userData.accountNumber || "",
                bankName: userData.bankName || "",
                referralCode: userData.referralCode || "",
                isBooker: userData.isBooker || false,
              }

              setUser(userProfile)

              // Check if user is already a booker
              if (userData.isBooker) {
                setLoading(false)
                return
              }

              // Pre-fill booker name with user's full name if available
              if (userData.fullName) {
                setBookerData((prev) => ({
                  ...prev,
                  bookerName: userData.fullName,
                }))
              }

              // Check if user is using default profile picture
              if (userData.profilePicture === "/tempUser.svg") {
                setProfilePictureError(true)
              }
            } else {
              // Redirect to profile if user document doesn't exist
              navigate("/profile")
            }
          } else {
            // User is signed out
            navigate("/login")
          }
          setLoading(false)
        })
      } catch (error) {
        console.error("Error checking authentication:", error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setBookerData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Check age when date of birth changes
    if (name === "dateOfBirth") {
      const birthDate = new Date(value)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      if (age < 18) {
        setAgeError("You must be at least 18 years old to become a booker.")
      } else {
        setAgeError(null)
      }
    }
  }

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsentChecked(e.target.checked)
  }

  const sendConfirmationEmail = async (name: string, email: string) => {
    setEmailSending(true)
    try {
      const response = await fetch("https://spotix-backend.onrender.com/api/mail/booker-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to send confirmation email:", errorText)
        throw new Error(`Failed to send confirmation email: ${errorText}`)
      }

      setEmailSent(true)
      return true
    } catch (error) {
      console.error("Error sending confirmation email:", error)
      return false
    } finally {
      setEmailSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (profilePictureError) {
      setError("Please add a profile picture before becoming a booker.")
      return
    }

    if (ageError) {
      setError(ageError)
      return
    }

    if (!user) return

    setLoading(true)
    try {
      // Update user profile in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        isBooker: true,
        bookerName: bookerData.bookerName,
        dateOfBirth: bookerData.dateOfBirth,
        bookerPassword: bookerData.bookerPassword,
      })

      // Send confirmation email
      const emailSuccess = await sendConfirmationEmail(bookerData.bookerName || user.fullName, user.email)

      // Show success message
      if (emailSuccess) {
        alert(
          "Congratulations! You are now a booker. We have sent a confirmation email to your registered email address.",
        )
      } else {
        alert(
          "Congratulations! You are now a booker. However, we couldn't send a confirmation email. Please check your account settings.",
        )
      }

      navigate("/profile")
    } catch (error: any) {
      console.error("Error updating booker status:", error)
      setError(`Failed to update booker status: ${error.message || "Unknown error"}`)
      setLoading(false)
    }
  }

  if (loading || !user) {
    return <Preloader loading={loading} />
  }

  // If user is already a booker, show alert dialog
  if (user.isBooker) {
    return (
      <div className="booker-confirm-container">
        <UserHeader />
        <div className="already-booker-dialog">
          <img src="/BookerConfirm.svg" alt="Already a Booker" className="booker-confirm-image" />
          <h2>Dear booker {user.username},</h2>
          <p>You're already a booker on our platform!</p>
          <p>You can create and manage events from your dashboard.</p>
          <button className="home-button" onClick={() => navigate("/BookerDashboard")}>
            Go to Dashboard
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="booker-confirm-container">
            <Helmet>
  <title>Booker Confirm</title>
  <meta name="description" content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix." />
  {/* Open Graph for social media */}
  <meta property="og:title" content="Spotix | Discover and Book Campus Events" />
  <meta property="og:description" content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix." />
  <meta property="og:image" content="/meta.png" />
  <meta property="og:url" content="https://spotix.com.ng" />
  <meta property="og:type" content="website" />

  {/* Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Spotix | Discover and Book Campus Events" />
  <meta name="twitter:description" content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix." />
  <meta name="twitter:image" content="/meta.png" />
</Helmet>
      <UserHeader />

      <div className="booker-confirm-content">
        <div className="booker-confirm-header">
          <img src="/BookerConfirm.svg" alt="Become a Booker" className="booker-confirm-image" />
          <h1 className="booker-confirm-title">Become a Booker</h1>
          <p className="booker-confirm-message">
            <div className="greeting">
              Hello there <span className="username-highlight">{user.username}</span>
            </div>
            . You're now taking a step to become a booker in Spotix. This will enable you to post events, verify tickets
            and get paid. We hope you've read our terms for bookers and switching to a booker now means you've seen and
            gone through the provisions there. It's also important that you fill the details here as we would use this
            in creating your booker profile. A picture of you (individual booker) or your logo (Business booker) is
            required for you to be a booker. Thank you for partnering with Spotix.
          </p>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {emailSending && (
          <div className="sending-email-message">
            <p>Sending confirmation email...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="booker-form">
          {/* Booker Onboarding Section */}
          <div className="form-section">
            <h2 className="section-title">Booker Onboarding</h2>

            <div className="profile-picture-section">
              <div className="profile-picture-container">
                <img
                  src={user.profilePicture || "/placeholder.svg"}
                  alt="Profile"
                  className={`profile-picture ${profilePictureError ? "profile-picture-error" : ""}`}
                />
                {profilePictureError && (
                  <div className="profile-picture-error-message">Please add a profile picture on your profile page</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bookerName">Booker Name</label>
              <input
                type="text"
                id="bookerName"
                name="bookerName"
                value={bookerData.bookerName}
                onChange={handleInputChange}
                placeholder="Enter booker name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth (Must be 18 or older)</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={bookerData.dateOfBirth}
                onChange={handleInputChange}
                max={getMaxDateOfBirth()}
                required
              />
              {ageError && <div className="age-error-message">{ageError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="accountName">
                Account Name
                <Tooltip message="Account information can only be updated on the profile page" />
              </label>
              <input
                type="text"
                id="accountName"
                value={user.accountName}
                readOnly
                className="readonly-input"
                placeholder="No account name provided"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="accountNumber">
                Account Number
                <Tooltip message="Account information can only be updated on the profile page" />
              </label>
              <input
                type="text"
                id="accountNumber"
                value={user.accountNumber}
                readOnly
                className="readonly-input"
                placeholder="No account number provided"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bankName">
                Bank Name
                <Tooltip message="Account information can only be updated on the profile page" />
              </label>
              <input
                type="text"
                id="bankName"
                value={user.bankName}
                readOnly
                className="readonly-input"
                placeholder="No bank name provided"
                required
              />
            </div>
          </div>

          {/* Booker Authentication Section */}
          <div className="form-section">
            <h2 className="section-title">Booker Authentication</h2>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" value={user.email} readOnly className="readonly-input" />
            </div>

            <div className="form-group">
              <label htmlFor="bookerPassword">
                Booker Password
                <Tooltip message="This password may not necessarily be the same as your regular password" />
              </label>
              <input
                type="password"
                id="bookerPassword"
                name="bookerPassword"
                value={bookerData.bookerPassword}
                onChange={handleInputChange}
                placeholder="Enter booker password"
                required
                minLength={6}
              />
            </div>

            <div className="consent-container">
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={handleConsentChange}
                  className="consent-checkbox"
                  required
                />
                <span>
                  By switching to a booker and supplying these details you agree that we should process your information
                  accordingly
                </span>
              </label>
            </div>

            {consentChecked && !ageError && (
              <button type="submit" className="activate-booker-btn" disabled={emailSending}>
                {emailSending ? "Processing..." : "Activate Booker"}
              </button>
            )}
          </div>
        </form>
      </div>
      <Footer />
    </div>
  )
}

export default BookerConfirm
