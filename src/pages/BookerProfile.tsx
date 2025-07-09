"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, getDocs, query, where, updateDoc, setDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import BookersHeader from "../components/BookersHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import Valid from "../components/valid"
import { Helmet } from "react-helmet"
import { Users, AlertCircle, Video, ExternalLink, CheckCircle, Unlink, Calendar } from "lucide-react"
import "./bookerprofile.css"

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
  enabledCollaboration?: boolean
  zoomConnected?: boolean
  zoomAccountId?: string
  zoomEmail?: string
  zoomUserId?: string
}

interface ZoomAccountInfo {
  email: string
  accountId: string
  userId: string
  firstName?: string
  lastName?: string
}

const BookerProfile = () => {
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<BookerProfileData | null>(null)
  const [verificationState, setVerificationState] = useState<string>("Not Verified")
  const [eventCount, setEventCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [collaborationEnabled, setCollaborationEnabled] = useState(false)
  const [updatingCollaboration, setUpdatingCollaboration] = useState(false)
  const [collaborationUpdateError, setCollaborationUpdateError] = useState<string | null>(null)

  // Zoom integration states
  const [zoomConnected, setZoomConnected] = useState(false)
  const [connectingZoom, setConnectingZoom] = useState(false)
  const [disconnectingZoom, setDisconnectingZoom] = useState(false)
  const [zoomError, setZoomError] = useState<string | null>(null)
  const [zoomAccountInfo, setZoomAccountInfo] = useState<ZoomAccountInfo | null>(null)

  const navigate = useNavigate()

  // Zoom OAuth configuration
  const ZOOM_CLIENT_ID = import.meta.env.VITE_REACT_APP_ZOOM_CLIENT_ID
  const ZOOM_REDIRECT_URI = `${window.location.origin}/zoom-callback`
  const ZOOM_SCOPE = "meeting:write meeting:read user:read webinar:write webinar:read"

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

          // Set collaboration enabled state
          setCollaborationEnabled(userData.enabledCollaboration === true)

          // Set Zoom connection state
          setZoomConnected(userData.zoomConnected === true)
          if (userData.zoomConnected && userData.zoomEmail && userData.zoomAccountId) {
            setZoomAccountInfo({
              email: userData.zoomEmail,
              accountId: userData.zoomAccountId,
              userId: userData.zoomUserId || "",
              firstName: userData.zoomFirstName || "",
              lastName: userData.zoomLastName || "",
            })
          }

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
            joinDate: creationTime,
            isVerified: userData.isVerified || false,
            bvt: userData.bvt || "",
            enabledCollaboration: userData.enabledCollaboration || false,
            zoomConnected: userData.zoomConnected || false,
            zoomAccountId: userData.zoomAccountId || "",
            zoomEmail: userData.zoomEmail || "",
            zoomUserId: userData.zoomUserId || "",
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

  // Handle Zoom OAuth callback
  useEffect(() => {
    const handleZoomCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")
      const state = urlParams.get("state")
      const error = urlParams.get("error")

      if (error) {
        setZoomError(`Zoom authorization failed: ${error}`)
        return
      }

      if (code && state === "zoom_oauth_spotix") {
        setConnectingZoom(true)
        try {
          await exchangeZoomCode(code)
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (error) {
          console.error("Error handling Zoom callback:", error)
          setZoomError("Failed to connect to Zoom. Please try again.")
        } finally {
          setConnectingZoom(false)
        }
      }
    }

    handleZoomCallback()
  }, [])

  const handleConnectZoom = () => {
    setZoomError(null)
    const state = "zoom_oauth_spotix"
    const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${encodeURIComponent(ZOOM_REDIRECT_URI)}&scope=${encodeURIComponent(ZOOM_SCOPE)}&state=${state}`

    // Store the current page URL to return to after OAuth
    localStorage.setItem("zoom_oauth_return_url", window.location.href)

    window.location.href = authUrl
  }

  const exchangeZoomCode = async (code: string) => {
    try {
      const user = auth.currentUser
      if (!user) throw new Error("User not authenticated")

      // Exchange authorization code for access token
      const tokenResponse = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${ZOOM_CLIENT_ID}:${import.meta.env.VITE_REACT_APP_ZOOM_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: ZOOM_REDIRECT_URI,
        }),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        throw new Error(`Token exchange failed: ${errorData.error || "Unknown error"}`)
      }

      const tokenData = await tokenResponse.json()

      // Get user info from Zoom
      const userResponse = await fetch("https://api.zoom.us/v2/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })

      if (!userResponse.ok) {
        throw new Error("Failed to get user info from Zoom")
      }

      const zoomUserData = await userResponse.json()

      // Store user info in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        zoomConnected: true,
        zoomAccountId: zoomUserData.account_id,
        zoomEmail: zoomUserData.email,
        zoomUserId: zoomUserData.id,
        zoomFirstName: zoomUserData.first_name || "",
        zoomLastName: zoomUserData.last_name || "",
        zoomConnectedAt: new Date().toISOString(),
      })

      // Store tokens securely in a separate collection
      const zoomTokensRef = doc(db, "zoomTokens", user.uid)
      await setDoc(zoomTokensRef, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setZoomConnected(true)
      setZoomAccountInfo({
        email: zoomUserData.email,
        accountId: zoomUserData.account_id,
        userId: zoomUserData.id,
        firstName: zoomUserData.first_name || "",
        lastName: zoomUserData.last_name || "",
      })

      if (profileData) {
        setProfileData({
          ...profileData,
          zoomConnected: true,
          zoomAccountId: zoomUserData.account_id,
          zoomEmail: zoomUserData.email,
          zoomUserId: zoomUserData.id,
        })
      }

      // Show success message
      setZoomError(null)
    } catch (error) {
      console.error("Error exchanging Zoom code:", error)
      throw error
    }
  }

  const handleDisconnectZoom = async () => {
    if (!profileData) return

    try {
      setDisconnectingZoom(true)
      setZoomError(null)

      const user = auth.currentUser
      if (!user) return

      // Remove Zoom connection from user document
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        zoomConnected: false,
        zoomAccountId: "",
        zoomEmail: "",
        zoomUserId: "",
        zoomFirstName: "",
        zoomLastName: "",
        zoomDisconnectedAt: new Date().toISOString(),
      })

      // Clear tokens for security
      const zoomTokensRef = doc(db, "zoomTokens", user.uid)
      await updateDoc(zoomTokensRef, {
        accessToken: "",
        refreshToken: "",
        expiresAt: 0,
        scope: "",
        disconnectedAt: new Date().toISOString(),
      })

      // Update local state
      setZoomConnected(false)
      setZoomAccountInfo(null)
      setProfileData({
        ...profileData,
        zoomConnected: false,
        zoomAccountId: "",
        zoomEmail: "",
        zoomUserId: "",
      })
    } catch (error) {
      console.error("Error disconnecting Zoom:", error)
      setZoomError("Failed to disconnect Zoom. Please try again.")
    } finally {
      setDisconnectingZoom(false)
    }
  }

  const handleVerification = () => {
    navigate("/verification")
  }

  const handleToggleCollaboration = async () => {
    if (!profileData) return

    try {
      setUpdatingCollaboration(true)
      setCollaborationUpdateError(null)

      const user = auth.currentUser
      if (!user) return

      // Update user document - only toggle the global setting
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        enabledCollaboration: !collaborationEnabled,
      })

      // Update local state
      setCollaborationEnabled(!collaborationEnabled)
      setProfileData({
        ...profileData,
        enabledCollaboration: !collaborationEnabled,
      })
    } catch (error) {
      console.error("Error updating collaboration settings:", error)
      setCollaborationUpdateError("Failed to update collaboration settings. Please try again.")
    } finally {
      setUpdatingCollaboration(false)
    }
  }

  const handleManageTeam = () => {
    navigate("/team")
  }

  if (loading) {
    return <Preloader />
  }

  return (
    <>
      <BookersHeader />
      <Helmet>
        <title>Booker Profile - Event Management</title>
        <meta
          name="description"
          content="View and manage your Booker profile, including verification status, events created, and personal information."
        />
      </Helmet>
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

            {/* Zoom Integration Section */}
            <div className="profile-section zoom-section">
              <div className="section-header">
                <h3>
                  <Video className="section-icon" />
                  Virtual Events with Zoom
                  <span className="new-tag">New</span>
                </h3>
              </div>

              <div className="zoom-content">
                <div className="zoom-info">
                  <img src="/images/zoom-logo.png" alt="Zoom" className="zoom-logo" />
                  <div className="zoom-description">
                    <p>
                      Connect your Zoom account to create and manage virtual events directly from Spotix. Host webinars,
                      meetings, and online events with seamless integration.
                    </p>
                  </div>
                </div>

                {zoomError && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <p>{zoomError}</p>
                    <button className="close-error" onClick={() => setZoomError(null)}>
                      ×
                    </button>
                  </div>
                )}

                {!zoomConnected ? (
                  <div className="zoom-connect">
                    <button className="connect-zoom-button" onClick={handleConnectZoom} disabled={connectingZoom}>
                      {connectingZoom ? (
                        <>
                          <div className="loading-spinner"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink size={16} />
                          Connect to Zoom
                        </>
                      )}
                    </button>
                    <p className="zoom-connect-note">
                      You'll be securely redirected to Zoom to authorize the connection
                    </p>
                  </div>
                ) : (
                  <div className="zoom-connected">
                    <div className="connection-status">
                      <CheckCircle size={20} className="success-icon" />
                      <div className="connection-info">
                        <h4>Successfully Connected to Zoom</h4>
                        {zoomAccountInfo && (
                          <div className="account-details">
                            <p>
                              <strong>Account:</strong> {zoomAccountInfo.email}
                            </p>
                            {zoomAccountInfo.firstName && zoomAccountInfo.lastName && (
                              <p>
                                <strong>Name:</strong> {zoomAccountInfo.firstName} {zoomAccountInfo.lastName}
                              </p>
                            )}
                            <p>
                              <strong>Account ID:</strong> {zoomAccountInfo.accountId}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className="disconnect-zoom-button"
                      onClick={handleDisconnectZoom}
                      disabled={disconnectingZoom}
                    >
                      {disconnectingZoom ? (
                        <>
                          <div className="loading-spinner"></div>
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <Unlink size={16} />
                          Disconnect
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="zoom-features">
                  <h4>
                    <Calendar size={18} />
                    Virtual Event Features:
                  </h4>
                  <ul>
                    <li>✨ Create virtual events and webinars</li>
                    <li>🔗 Automatically generate meeting links</li>
                    <li>👥 Manage attendee registration and access</li>
                    <li>📧 Send meeting invitations to ticket holders</li>
                    <li>📹 Enable automatic recording for later viewing</li>
                    <li>📊 Access detailed meeting analytics and reports</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Collaborations Section */}
            <div className="profile-section collaboration-section">
              <div className="section-header">
                <h3>
                  <Users className="section-icon" />
                  Collaborations
                  <span className="new-tag">New</span>
                </h3>
              </div>

              <div className="collaboration-content">
                <p className="collaboration-description">
                  Enable collaboration to allow team members to help manage your events. You can enable or disable
                  collaboration for specific events in the team management page.
                </p>

                {collaborationUpdateError && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <p>{collaborationUpdateError}</p>
                  </div>
                )}

                <div className="collaboration-controls">
                  <div className="toggle-container">
                    <label className="toggle-label">
                      <span>Enable Collaboration</span>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={collaborationEnabled}
                          onChange={handleToggleCollaboration}
                          disabled={updatingCollaboration}
                        />
                        <span className="toggle-slider"></span>
                      </div>
                    </label>
                    <p className="toggle-status">
                      {collaborationEnabled ? "Collaboration is enabled" : "Collaboration is disabled"}
                    </p>
                  </div>

                  <button className="manage-team-button" onClick={handleManageTeam} disabled={!collaborationEnabled}>
                    <Users size={16} />
                    Manage Team Members
                  </button>
                </div>
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
              <button className="edit-profile-btn" onClick={() => navigate("/profile")}>
                Edit Profile
              </button>
              <button className="change-password-btn">Change Password</button>
            </div>
          </div>
        )}
      </div>
      <Footer />

      <style>{`
        /* Zoom Integration Styles */
        .zoom-section {
          background: linear-gradient(135deg, #2D8CFF 0%, #1E6FFF 100%);
          color: white;
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 28px;
          position: relative;
          box-shadow: 0 8px 32px rgba(45, 140, 255, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .zoom-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .zoom-info {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .zoom-logo {
          width: 56px;
          height: 56px;
          object-fit: contain;
          background: white;
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .zoom-description p {
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          opacity: 0.95;
        }

        .connect-zoom-button {
          background: white;
          color: #2D8CFF;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          min-width: 180px;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .connect-zoom-button:hover:not(:disabled) {
          background: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .connect-zoom-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .zoom-connect-note {
          font-size: 14px;
          opacity: 0.85;
          margin: 12px 0 0 0;
          font-style: italic;
        }

        .zoom-connected {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.15);
          padding: 20px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .success-icon {
          color: #4CAF50;
          background: white;
          border-radius: 50%;
          padding: 3px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .connection-info h4 {
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .account-details {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.4;
        }

        .account-details p {
          margin: 4px 0;
        }

        .disconnect-zoom-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .disconnect-zoom-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .disconnect-zoom-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .zoom-features {
          background: rgba(255, 255, 255, 0.12);
          padding: 20px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .zoom-features h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zoom-features ul {
          margin: 0;
          padding-left: 0;
          list-style: none;
        }

        .zoom-features li {
          margin-bottom: 8px;
          font-size: 14px;
          opacity: 0.9;
          padding-left: 0;
          line-height: 1.4;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .error-message {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
        }

        .close-error {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .close-error:hover {
          opacity: 1;
        }

        .new-tag {
          background: #FF6B6B;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 12px;
          margin-left: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          animation: pulse 2s infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .zoom-info {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .zoom-connected {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }

          .connection-status {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .zoom-section {
            padding: 20px;
          }

          .connect-zoom-button {
            width: 100%;
          }
        }

        /* Enhanced section styling */
        .profile-section {
          margin-bottom: 24px;
          border-radius: 12px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .section-icon {
          opacity: 0.9;
        }
      `}</style>
    </>
  )
}

export default BookerProfile
