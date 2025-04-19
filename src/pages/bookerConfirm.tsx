"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import Preloader from "../components/preloader"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { Tooltip } from "../components/Tooltip"

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
  const navigate = useNavigate()

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
  }

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsentChecked(e.target.checked)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (profilePictureError) {
      alert("Please add a profile picture before becoming a booker.")
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

      alert("Congratulations! You are now a booker.")
      navigate("/profile")
    } catch (error) {
      console.error("Error updating booker status:", error)
      alert("Failed to update booker status. Please try again.")
    } finally {
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
            <button className="home-button" onClick={() => navigate("/")}>
              Go Home
            </button>
          </div>
          <Footer />
        </div>
      )
    }

  return (
    <div className="booker-confirm-container">
      <UserHeader />

      <div className="booker-confirm-content">
        <div className="booker-confirm-header">
          <img src="/BookerConfirm.svg" alt="Become a Booker" className="booker-confirm-image" />
          <h1 className="booker-confirm-title">Become a Booker</h1>
          <p className="booker-confirm-message">
            <div className="greeting">Hello there <span className="username-highlight">{user.username}</span></div>. 
            You're now taking a step to become
            a booker in Spotix. This will enable you to post events, verify tickets and get paid. We hope you've read
            our terms for bookers and switching to a booker now means you've seen and gone through the provisions there.
            It's also important that you fill the details here as we would use this in creating your booker profile. A
            picture of you (individual booker) or your logo (Business booker) is required for you to be a booker. Thank
            you for partnering with Spotix.
          </p>
        </div>

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
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={bookerData.dateOfBirth}
                onChange={handleInputChange}
                required
              />
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
              />
            </div>

            <div className="consent-container">
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={handleConsentChange}
                  className="consent-checkbox"
                />
                <span>
                  By switching to a booker and supplying these details you agree that we should process your information
                  accordingly
                </span>
              </label>
            </div>

            {consentChecked && (
              <button type="submit" className="activate-booker-btn">
                Activate Booker
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

