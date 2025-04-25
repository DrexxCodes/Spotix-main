"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import Valid from "../components/valid"
import "../styles/bookerprofile.css"

interface BookerProfileData {
  uid: string
  username: string
  email: string
  fullName: string
  profilePicture: string
  bookerName: string
  dateOfBirth: string
  accountName: string
  accountNumber: string
  bankName: string
  eventsCreated: number
  totalRevenue: number
  joinDate: string
  isVerified: boolean
  bvt?: string 
}

const BookerProfile = () => {
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<BookerProfileData | null>(null)
  const [verificationState, setVerificationState] = useState<string>("Not Verified")
  const [eventCount, setEventCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0) // Changed to state variable
  const navigate = useNavigate()

  useEffect(() => {
    const fetchBookerProfile = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        // Get user creation time from auth metadata
        const creationTime = user.metadata.creationTime || new Date().toISOString()

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setProfileData({
            uid: user.uid,
            username: userData.username || "",
            email: userData.email || "",
            fullName: userData.fullName || "",
            profilePicture: userData.profilePicture || "/tempUser.svg",
            bookerName: userData.bookerName || "",
            dateOfBirth: userData.dateOfBirth || "",
            accountName: userData.accountName || "",
            accountNumber: userData.accountNumber || "",
            bankName: userData.bankName || "",
            eventsCreated: userData.eventsCreated || 0,
            totalRevenue: userData.totalRevenue || 0,
            joinDate: creationTime, // Use auth creation time
            isVerified: userData.isVerified || false,
            bvt: userData.bvt || "", // Added BVT field
          })

          // Check verification status in Firestore
          const verificationQuery = query(collection(db, "verification"), where("uid", "==", user.uid))
          const verificationSnapshot = await getDocs(verificationQuery)

          if (!verificationSnapshot.empty) {
            const verificationData = verificationSnapshot.docs[0].data()
            setVerificationState(verificationData.verificationState || "Not Verified")
          } else {
            setVerificationState("Not Verified")
          }

          // Count actual events created by the user
          const eventsQuery = collection(db, "events", user.uid, "userEvents")
          const eventsSnapshot = await getDocs(eventsQuery)
          setEventCount(eventsSnapshot.size)

          // Calculate total revenue from all events
          let revenue = 0
          for (const eventDoc of eventsSnapshot.docs) {
            const eventData = eventDoc.data()
            revenue += eventData.totalRevenue || 0
          }
          setTotalRevenue(revenue)
        }
      } catch (error) {
        console.error("Error fetching booker profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookerProfile()
  }, [])

  const handleVerification = () => {
    navigate("/verification")
  }

  if (loading) {
    return <Preloader />
  }

  return (
    <>
      <BookersHeader />
      <div className="booker-profile-container">
        <h1 className="page-title">Booker Profile</h1>

        {profileData && (
          <div className="profile-content">
            <div className="profile-header">
              <div className="profile-image-container">
                <img
                  src={profileData.profilePicture || "/placeholder.svg"}
                  alt={profileData.username}
                  className="profile-image"
                />
              </div>
              <div className="profile-info">
                <div className="name-with-badge">
                  <h2>{profileData.bookerName || profileData.fullName}</h2>
                  <Valid isVerified={profileData.isVerified} size={20} />
                </div>
                <p className="username">@{profileData.username}</p>
                <p className="join-date">Joined: {new Date(profileData.joinDate).toLocaleDateString()}</p>
                <div className="verification-status-container">
                  <p className="verification-status-label">Verification Status:</p>
                  <p className={`verification-status ${verificationState.toLowerCase().replace(/\s+/g, "-")}`}>
                    {verificationState}
                  </p>
                  {!profileData.isVerified && (
                    <button className="verify-button" onClick={handleVerification}>
                      {verificationState === "Awaiting Verification" ? "View Verification" : "Get Verified"}
                    </button>
                  )}
                </div>

                {/* BVT Number - Only shown when verified */}
                {profileData.isVerified && profileData.bvt && (
                  <div className="bvt-container">
                    <p className="bvt-label">Booker Verification Tag (BVT):</p>
                    <p className="bvt-value">{profileData.bvt}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-card">
                <h3>Events Created</h3>
                <p className="stat-value">{eventCount}</p>
              </div>
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <p className="stat-value">₦{totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            <div className="profile-details">
              <h3>Personal Information</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">
                    {profileData.fullName}
                    <Valid isVerified={profileData.isVerified} />
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{profileData.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date of Birth:</span>
                  <span className="detail-value">{profileData.dateOfBirth}</span>
                </div>
              </div>

              <h3>Banking Information</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Account Name:</span>
                  <span className="detail-value">{profileData.accountName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Number:</span>
                  <span className="detail-value">{profileData.accountNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Bank Name:</span>
                  <span className="detail-value">{profileData.bankName}</span>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button className="edit-profile-btn">Edit Profile</button>
              <button className="change-password-btn">Change Password</button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default BookerProfile
