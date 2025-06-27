"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { signOut, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import Preloader from "../components/preloader"
import UserHeader from "../components/UserHeader"
import LogoutBtn from "../components/logoutbtn"
import Footer from "../components/footer"
import { uploadImage } from "../utils/imageUploader"
import Search from "../components/search"
import { Eye, EyeOff, AlertCircle, CheckCircle, Users, Copy } from "lucide-react"
import "./profile.css"

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
  referredBy?: string
  telegramConnected?: boolean
  telegramUsername?: string
  telegramChatId?: string
}

interface ConfirmDialogProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 

const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!isOpen) return null

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3 className="dialog-title">Confirmation Required</h3>
        <p className="dialog-message">{message}</p>
        <div className="dialog-buttons">
          <button className="dialog-button dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dialog-button dialog-confirm" onClick={onConfirm}>
            Proceed
          </button>
        </div>
      </div>
    </div>
  )
}

const Profile = () => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [bankInput, setBankInput] = useState("")
  const [filteredBanks, setFilteredBanks] = useState<string[]>([])
  const [showBankSuggestions, setShowBankSuggestions] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [uploadProvider, setUploadProvider] = useState<string | null>(null)
  const [referralListed, setReferralListed] = useState(false)
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null)
  const navigate = useNavigate()

  // Telegram connection states
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null)
  const [telegramConnecting, setTelegramConnecting] = useState(false)
  const [telegramConnectionToken, setTelegramConnectionToken] = useState<string | null>(null)
  const [tokenCopySuccess, setTokenCopySuccess] = useState(false)

  // Auth change states
  const [newEmail, setNewEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [authChangeLoading, setAuthChangeLoading] = useState(false)
  const [authChangeError, setAuthChangeError] = useState<string | null>(null)
  const [authChangeSuccess, setAuthChangeSuccess] = useState<string | null>(null)

  const [accountVerificationLoading, setAccountVerificationLoading] = useState(false)
  const [accountVerificationError, setAccountVerificationError] = useState<string | null>(null)
  const [accountVerifiedName, setAccountVerifiedName] = useState("")
  const [accountVerificationStatus, setAccountVerificationStatus] = useState<"pending" | "verified" | "failed">(
    "pending",
  )

  const banks = [
    "Opay",
    "Palmpay",
    "Moniepoint",
    "Kuda",
    "First Bank",
    "Access Bank",
    "GT Bank",
    "UBA",
    "Zenith Bank",
    "Wema Bank",
    "Sterling Bank",
    "Fidelity Bank",
    "Union Bank",
    "Stanbic IBTC",
    "Ecobank",
  ]

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
              setUser({
                uid: authUser.uid,
                ...userData,
                fullName: userData.fullName || "",
                profilePicture: userData.profilePicture || "/tempUser.svg",
                accountName: userData.accountName || "",
                accountNumber: userData.accountNumber || "",
                bankName: userData.bankName || "",
                referralCode: userData.referralCode || "",
                isBooker: userData.isBooker || false,
                referredBy: userData.referredBy || "",
                telegramConnected: userData.telegramConnected || false,
                telegramUsername: userData.telegramUsername || "",
                telegramChatId: userData.telegramChatId || "",
              })

              // Set Telegram connection state
              setTelegramConnected(userData.telegramConnected || false)
              setTelegramUsername(userData.telegramUsername || null)

              if (userData.bankName) {
                setBankInput(userData.bankName)
              }

              // Initialize new email field with current email
              if (authUser.email) {
                setNewEmail(authUser.email)
              }

              // Check if referral code exists and is listed in the referrals collection
              if (userData.referralCode) {
                const referralDocRef = doc(db, "referrals", userData.referralCode)
                const referralDoc = await getDoc(referralDocRef)
                setReferralListed(referralDoc.exists())
              }

              // Check if user was referred by someone
              if (userData.referredBy) {
                setReferrerUsername(userData.referredBy)
              }
            } else {
              // Create a new user document if it doesn't exist
              const newUser = {
                fullName: "",
                username: "",
                email: authUser.email || "",
                profilePicture: "/tempUser.svg",
                accountName: "",
                accountNumber: "",
                bankName: "",
                referralCode: "",
                isBooker: false,
              }
              await setDoc(userDocRef, newUser)
              setUser({ uid: authUser.uid, ...newUser })

              // Initialize new email field with current email
              if (authUser.email) {
                setNewEmail(authUser.email)
              }
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

  // Check for existing verified account details
  useEffect(() => {
    if (user && user.accountName && user.accountNumber && user.bankName) {
      // If all account details are present, assume they were verified
      setAccountVerifiedName(user.accountName)
      setAccountVerificationStatus("verified")
    }
  }, [user])

  // Reset copy success message after 3 seconds
  useEffect(() => {
    if (copySuccess || tokenCopySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false)
        setTokenCopySuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [copySuccess, tokenCopySuccess])

  // Reset auth change success/error messages after 5 seconds
  useEffect(() => {
    if (authChangeSuccess || authChangeError) {
      const timer = setTimeout(() => {
        setAuthChangeSuccess(null)
        setAuthChangeError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [authChangeSuccess, authChangeError])

  // Poll for connection status when token is generated
  useEffect(() => {
    if (telegramConnectionToken && !telegramConnected) {
      const pollInterval = setInterval(async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user!.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.telegramConnected) {
              setTelegramConnected(true)
              setTelegramUsername(userData.telegramUsername)
              setTelegramConnecting(false)
              setTelegramConnectionToken(null)

              // Update local user state
              setUser({
                ...user!,
                telegramConnected: true,
                telegramUsername: userData.telegramUsername,
                telegramChatId: userData.telegramChatId,
              })

              clearInterval(pollInterval)
            }
          }
        } catch (error) {
          console.error("Error polling connection status:", error)
        }
      }, 3000)

      // Clear polling after 10 minutes
      const timeout = setTimeout(
        () => {
          clearInterval(pollInterval)
          setTelegramConnecting(false)
          setTelegramConnectionToken(null)
        },
        10 * 60 * 1000,
      )

      return () => {
        clearInterval(pollInterval)
        clearTimeout(timeout)
      }
    }
  }, [telegramConnectionToken, telegramConnected, user])

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      let profilePictureUrl = user.profilePicture

      // Upload new image if selected using the tiered upload system
      if (imageFile) {
        setUploadingImage(true)

        const { uploadPromise } = uploadImage(imageFile, {
          cloudinaryFolder: "ProfilePictures",
          showAlert: true,
        })
        const { url, provider } = await uploadPromise

        if (url) {
          profilePictureUrl = url
          setUploadProvider(provider)
        } else {
          throw new Error("Failed to upload profile picture")
        }

        setUploadingImage(false)
      }

      // Update user profile in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        fullName: user.fullName,
        username: user.username,
        profilePicture: profilePictureUrl,
        accountName: user.accountName,
        accountNumber: user.accountNumber,
        bankName: user.bankName,
        imageProvider: uploadProvider,
      })

      // Update local state
      setUser({
        ...user,
        profilePicture: profilePictureUrl,
      })

      alert("Profile updated successfully!")
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = async () => {
    if (!user || !auth.currentUser) return

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setAuthChangeError("Please enter a valid email address")
      return
    }

    // Check if email is the same as current
    if (newEmail === user.email) {
      setAuthChangeError("New email is the same as current email")
      return
    }

    setAuthChangeLoading(true)
    setAuthChangeError(null)
    setAuthChangeSuccess(null)

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // Update email in Firebase Auth
      await updateEmail(auth.currentUser, newEmail)

      // Update email in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        email: newEmail,
      })

      // Update local state
      setUser({
        ...user,
        email: newEmail,
      })

      setAuthChangeSuccess("Email updated successfully!")
      setPassword("") // Clear password field
    } catch (error: any) {
      console.error("Error updating email:", error)
      if (error.code === "auth/requires-recent-login") {
        setAuthChangeError("For security reasons, please log out and log back in before changing your email")
      } else if (error.code === "auth/wrong-password") {
        setAuthChangeError("Incorrect password. Please try again")
      } else if (error.code === "auth/email-already-in-use") {
        setAuthChangeError("This email is already in use by another account")
      } else {
        setAuthChangeError("Failed to update email. Please try again")
      }
    } finally {
      setAuthChangeLoading(false)
    }
  }

  const generateReferralCode = async () => {
    if (!user) return

    setGeneratingCode(true)
    try {
      // Generate a random code with username and 6 random characters
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let randomCode = ""
      for (let i = 0; i < 6; i++) {
        randomCode += characters.charAt(Math.floor(Math.random() * characters.length))
      }

      const referralCode = `${user.username.substring(0, 4).toUpperCase()}-${randomCode}`

      // Update user profile in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        referralCode,
      })

      // Update local state
      setUser({
        ...user,
        referralCode,
      })

      // Check if the referral code is already listed
      const isListed = await checkReferralListed(referralCode)
      if (isListed) {
        alert("Referral code generated successfully and is already listed in our system!")
      } else {
        alert("Referral code generated successfully! Visit the Referrals page to list it and start earning.")
      }
    } catch (error) {
      console.error("Error generating referral code:", error)
      alert("Failed to generate referral code. Please try again.")
    } finally {
      setGeneratingCode(false)
    }
  }

  // Check if the referral code is already listed
  const checkReferralListed = async (referralCode: string) => {
    try {
      const referralDocRef = doc(db, "referrals", referralCode)
      const referralDoc = await getDoc(referralDocRef)
      return referralDoc.exists()
    } catch (error) {
      console.error("Error checking referral status:", error)
      return false
    }
  }

  const copyReferralCode = async () => {
    if (!user?.referralCode) return

    try {
      await navigator.clipboard.writeText(user.referralCode)
      setCopySuccess(true)
    } catch (err) {
      console.error("Failed to copy text: ", err)
      alert("Failed to copy referral code. Please try again.")
    }
  }

  const handleBookerStatusClick = () => {
    // Only allow becoming a booker, not returning to user
    if (!user?.isBooker) {
      navigate("/booker-confirm")
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleBankInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBankInput(value)

    if (user) {
      setUser({
        ...user,
        bankName: value,
      })
    }

    // Filter banks based on input
    if (value.trim() !== "") {
      const filtered = banks.filter((bank) => bank.toLowerCase().includes(value.toLowerCase()))
      setFilteredBanks(filtered)
      setShowBankSuggestions(true)
    } else {
      setFilteredBanks([])
      setShowBankSuggestions(false)
    }
  }

  const selectBank = (bank: string) => {
    setBankInput(bank)
    if (user) {
      setUser({
        ...user,
        bankName: bank,
      })
    }
    setShowBankSuggestions(false)
  }

  const handleAccountNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10) // Allow only numbers and limit to 10 characters
    if (user) {
      setUser({
        ...user,
        accountNumber: value,
      })
    }
  }

  const verifyAccount = async () => {
    if (!user?.accountNumber || !user.bankName) {
      setAccountVerificationError("Please enter both account number and bank name.")
      return
    }

    setAccountVerificationLoading(true)
    setAccountVerificationError(null)
    setAccountVerifiedName("")
    setAccountVerificationStatus("pending")

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/verify?accountNumber=${user.accountNumber}&bankName=${user.bankName}`,
      )
      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()

      if (data.status === true) {
        setAccountVerifiedName(data.account_name)
        setAccountVerificationStatus("verified")
        setUser({
          ...user,
          accountName: data.account_name,
        })
      } else {
        setAccountVerificationError(data.message || "Account verification failed.")
        setAccountVerificationStatus("failed")
      }
    } catch (error) {
      console.error("Error verifying account:", error)
      setAccountVerificationError("Failed to verify account. Please try again.")
      setAccountVerificationStatus("failed")
    } finally {
      setAccountVerificationLoading(false)
    }
  }

  const canSubmitForm = () => {
    return accountVerificationStatus === "verified" && user?.accountNumber && user?.bankName && user?.accountName
  }

  const goToReferrals = () => {
    navigate("/referrals")
  }

  // Telegram connection functions
  const generateConnectionToken = async () => {
    if (!user) return null

    const token = `${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    try {
      // Store token in Firestore with expiration
      await setDoc(doc(db, "telegramTokens", token), {
        uid: user.uid,
        userEmail: user.email,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        used: false,
      })

      return token
    } catch (error) {
      console.error("Error generating connection token:", error)
      return null
    }
  }

  const handleTelegramConnect = async () => {
    if (!user) return

    setTelegramConnecting(true)

    try {
      const token = await generateConnectionToken()
      if (!token) {
        alert("Failed to generate connection token. Please try again.")
        setTelegramConnecting(false)
        return
      }

      setTelegramConnectionToken(token)
    } catch (error) {
      console.error("Error connecting to Telegram:", error)
      alert("Failed to generate connection token. Please try again.")
      setTelegramConnecting(false)
    }
  }

  const copyConnectionToken = async () => {
    if (!telegramConnectionToken) return

    try {
      await navigator.clipboard.writeText(telegramConnectionToken)
      setTokenCopySuccess(true)
    } catch (err) {
      console.error("Failed to copy token: ", err)
      alert("Failed to copy connection token. Please try again.")
    }
  }

  const handleProceedToBot = () => {
    window.open("https://t.me/TristarAI_bot", "_blank")
  }

  const handleTelegramDisconnect = async () => {
    if (!user) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        telegramConnected: false,
        telegramUsername: "",
        telegramChatId: "",
        telegramFirstName: "",
        telegramLastName: "",
      })

      setTelegramConnected(false)
      setTelegramUsername(null)
      setUser({
        ...user,
        telegramConnected: false,
        telegramUsername: "",
        telegramChatId: "",
      })

      alert("Telegram account disconnected successfully!")
    } catch (error) {
      console.error("Error disconnecting Telegram:", error)
      alert("Failed to disconnect Telegram. Please try again.")
    }
  }

  if (loading || !user) {
    return <Preloader loading={loading} />
  }

  return (
    <div className="profile-container">
    <Search />
      <UserHeader />
      <Helmet>
        <title>User Profile</title>
        <meta
          name="description"
          content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix."
        />
        {/* Open Graph for social media */}
        <meta property="og:title" content="Spotix | User Profile" />
        <meta
          property="og:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
        <meta property="og:image" content="/meta.png" />
        <meta property="og:url" content="https://spotix.com.ng" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Spotix | Discover and Book Campus Events" />
        <meta
          name="twitter:description"
          content="Explore top events in your school – concerts, workshops, parties & more. Powered by Spotix."
        />
        <meta name="twitter:image" content="/meta.png" />
      </Helmet>
      <form onSubmit={handleSubmit} className="profile-form">
        {/* Profile Picture Section with Role Tag */}
        <div className="profile-picture-section">
          <div className="profile-picture-container">
            <img src={imagePreview || user.profilePicture} alt="Profile" className="profile-picture" />
            <div className="user-role-tag">{user.isBooker ? "Booker" : "User"}</div>
            <label htmlFor="profile-image" className="change-picture-btn">
              Change Picture
              <input
                type="file"
                id="profile-image"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {/* User Details Section */}
        <div className="form-section">
          <h2 className="section-title">User Details</h2>
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              value={user.fullName}
              onChange={(e) => setUser({ ...user, fullName: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              placeholder="Enter your username"
              required
            />
          </div>
        </div>

        {/* Add a new UID section after the User Details section */}
        <div className="form-section">
          <h2 className="section-title">User ID</h2>
          <div className="form-group">
            <label htmlFor="uid">Your User ID</label>
            <div className="uid-container">
              <input type="text" id="uid" value={user.uid} readOnly className="readonly-input uid-input" />
              <button
                type="button"
                className={`uid-copy-btn ${copySuccess ? "copy-success" : ""}`}
                onClick={() => {
                  navigator.clipboard.writeText(user.uid)
                  setCopySuccess(true)
                  setTimeout(() => setCopySuccess(false), 3000)
                  alert("Your UID is copied.")
                }}
              >
                Copy UID
              </button>
            </div>
            <p className="input-hint">
              Your user identification code is used to perform personalized and specialized actions on your account.
            </p>
          </div>
        </div>

        {/* Auth Change Section */}
        <div className="form-section">
          <h2 className="section-title">Auth Change</h2>

          {authChangeError && (
            <div className="auth-error-message">
              <AlertCircle size={16} className="error-icon" />
              <p>{authChangeError}</p>
            </div>
          )}

          {authChangeSuccess && (
            <div className="auth-success-message">
              <CheckCircle size={16} className="success-icon" />
              <p>{authChangeSuccess}</p>
            </div>
          )}

          <div className="auth-change-form">
            <div className="form-group">
              <label htmlFor="newEmail">Email Address</label>
              <input
                type="email"
                id="newEmail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Current Password</label>
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                />
                {showPassword ? (
                  <EyeOff className="password-toggle" onClick={() => setShowPassword(false)} />
                ) : (
                  <Eye className="password-toggle" onClick={() => setShowPassword(true)} />
                )}
              </div>
            </div>

            <button
              type="button"
              className="update-email-btn"
              onClick={handleEmailChange}
              disabled={authChangeLoading || newEmail === user.email || !password}
            >
              {authChangeLoading ? "Updating..." : "Update Email"}
            </button>
          </div>
        </div>

        {/* Account Details Section */}
        <div className="form-section">
          <h2 className="section-title">Account Details</h2>

          <div className="form-group">
            <label htmlFor="bankName">Bank Name</label>
            <div className="bank-input-container">
              <input
                type="text"
                id="bankName"
                value={bankInput}
                onChange={handleBankInputChange}
                placeholder="Enter bank name"
                autoComplete="off"
                disabled={accountVerificationStatus === "verified"}
                className={accountVerificationStatus === "verified" ? "readonly-input" : ""}
              />
              {showBankSuggestions && filteredBanks.length > 0 && accountVerificationStatus !== "verified" && (
                <div className="bank-suggestions">
                  {filteredBanks.map((bank, index) => (
                    <div key={index} className="bank-suggestion-item" onClick={() => selectBank(bank)}>
                      {bank}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">Account Number</label>
            <input
              type="text"
              id="accountNumber"
              value={user.accountNumber}
              onChange={handleAccountNumberChange}
              placeholder="Enter account number"
              maxLength={10}
              disabled={accountVerificationStatus === "verified"}
              className={accountVerificationStatus === "verified" ? "readonly-input" : ""}
            />
            {user.accountNumber && user.accountNumber.length < 10 && accountVerificationStatus !== "verified" && (
              <p className="input-hint" style={inputHintStyle}>
                Account number must be exactly 10 digits
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="accountName">Account Name</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="text"
                id="accountName"
                value={accountVerifiedName || user.accountName}
                readOnly
                placeholder="Verify account to populate name"
                style={{ flex: 1, marginRight: "10px" }}
                className="readonly-input"
              />
              {accountVerificationStatus !== "verified" && (
                <button
                  type="button"
                  onClick={verifyAccount}
                  disabled={
                    !user.accountNumber ||
                    !user.bankName ||
                    accountVerificationLoading ||
                    user.accountNumber.length !== 10
                  }
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: user.accountNumber?.length === 10 ? "pointer" : "not-allowed",
                    opacity: user.accountNumber?.length === 10 ? 1 : 0.7,
                  }}
                >
                  {accountVerificationLoading ? "Verifying..." : "Verify"}
                </button>
              )}
            </div>
            {accountVerificationError && <p style={{ color: "red" }}>{accountVerificationError}</p>}
            {accountVerificationStatus === "verified" && (
              <p style={{ color: "green", marginTop: "5px" }}>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: "5px" }}
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Account verified
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Referral Section */}
        <div className="form-section">
          <h2 className="section-title">Referrals</h2>
          <div className="referral-container">
            <div className="referral-code-wrapper">
              <input
                type="text"
                value={user.referralCode}
                readOnly
                placeholder="No referral code generated"
                className="readonly-input referral-input"
              />
              {user.referralCode && (
                <button
                  type="button"
                  className={`copy-btn ${copySuccess ? "copy-success" : ""}`}
                  onClick={copyReferralCode}
                >
                  {copySuccess ? "Copied!" : "Copy Code"}
                </button>
              )}
            </div>
            {!user.referralCode ? (
              <button type="button" className="generate-btn" onClick={generateReferralCode} disabled={generatingCode}>
                {generatingCode ? "Generating..." : "Generate"}
              </button>
            ) : (
              <button type="button" className="referrals-btn" onClick={goToReferrals}>
                <Users size={16} /> Manage Referrals
              </button>
            )}
          </div>

          <div className="referral-status">
            {referrerUsername ? (
              <p className="referred-by">
                You were referred by <span className="referrer-name">{referrerUsername}</span>
              </p>
            ) : (
              <p className="not-referred">You weren't referred by a user on Spotix</p>
            )}
          </div>
        </div>

        {/* Telegram Bot Connection Section */}
        <div className="form-section">
          <div className="section-header-with-tag">
            <h2 className="section-title">
              <img src="/telegram-logo.png" alt="Telegram" className="telegram-logo" />
              Telegram Bot
              <span className="new-tag">New</span>
            </h2>
          </div>

          <div className="telegram-connection-container">
            {!telegramConnected ? (
              <div className="telegram-not-connected">
                <p className="telegram-description">
                  Connect your Telegram account to receive event notifications, ticket updates, and manage your Spotix
                  account through our bot.
                </p>

                {!telegramConnectionToken ? (
                  <button
                    type="button"
                    className="telegram-connect-btn"
                    onClick={handleTelegramConnect}
                    disabled={telegramConnecting}
                  >
                    <img src="/telegram-logo.png" alt="Telegram" className="btn-telegram-logo" />
                    {telegramConnecting ? "Generating Token..." : "Generate Connection Token"}
                  </button>
                ) : (
                  <div className="telegram-token-section">
                    <div className="token-instructions">
                      <h4>🔑 Connection Token Generated</h4>
                      <p>
                        Copy the token below and use the <code>/connect</code> command in our Telegram bot:
                      </p>
                    </div>

                    <div className="token-block">
                      <div className="token-display">
                        <code className="connection-token">{telegramConnectionToken}</code>
                        <button
                          type="button"
                          className={`token-copy-btn ${tokenCopySuccess ? "copy-success" : ""}`}
                          onClick={copyConnectionToken}
                        >
                          <Copy size={16} />
                          {tokenCopySuccess ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="token-actions">
                      <button type="button" className="proceed-to-bot-btn" onClick={handleProceedToBot}>
                        <img src="/telegram-logo.png" alt="Telegram" className="btn-telegram-logo" />
                        Proceed to Bot
                      </button>
                      <button
                        type="button"
                        className="cancel-connection-btn"
                        onClick={() => {
                          setTelegramConnectionToken(null)
                          setTelegramConnecting(false)
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="connection-instructions">
                      <p>
                        <strong>Instructions:</strong>
                      </p>
                      <ol>
                        <li>Copy the token above</li>
                        <li>Click "Proceed to Bot" to open Telegram</li>
                        <li>
                          Type <code>/connect</code> and paste your token
                        </li>
                        <li>Your account will be connected automatically</li>
                      </ol>
                    </div>

                    {telegramConnecting && (
                      <div className="waiting-connection">
                        <div className="connecting-spinner"></div>
                        <p>Waiting for connection...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="telegram-connected">
                <div className="connection-success">
                  <CheckCircle size={20} className="success-icon" />
                  <p>Connection Successful!</p>
                </div>

                <div className="telegram-account-info">
                  <div className="telegram-user">
                    <img src="/telegram-logo.png" alt="Telegram" className="telegram-avatar" />
                    <div className="telegram-details">
                      <p className="telegram-username">@{telegramUsername}</p>
                      <p className="connection-status">Connected to Spotix Bot</p>
                    </div>
                  </div>

                  <button type="button" className="telegram-disconnect-btn" onClick={handleTelegramDisconnect}>
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Booker Status Section - Only show "Become Booker" button if not already a booker */}
        {!user.isBooker && (
          <div className="form-section">
            <button type="button" className="booker-btn" onClick={handleBookerStatusClick}>
              Become Booker
            </button>
          </div>
        )}

        {/* Save Button */}
        <button type="submit" className="save-btn" disabled={uploadingImage || !canSubmitForm()}>
          {uploadingImage ? "Uploading..." : "Save Changes"}
        </button>

        {/* Logout Button */}
        <LogoutBtn onClick={handleLogout} />
      </form>

      <Footer />
      <style>{`
        .section-header-with-tag {
          position: relative;
          margin-bottom: 1rem;
        }

        .telegram-logo {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          vertical-align: middle;
        }

        .new-tag {
          background: linear-gradient(45deg, #ff6b6b, #ee5a24);
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: 8px;
          animation: pulse 2s infinite;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .telegram-connection-container {
          background: linear-gradient(135deg, #0088cc, #229ed9);
          border-radius: 12px;
          padding: 1.5rem;
          color: white;
        }

        .telegram-description {
          margin-bottom: 1rem;
          opacity: 0.9;
          line-height: 1.5;
        }

        .telegram-connect-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .telegram-connect-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }

        .telegram-connect-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-telegram-logo {
          width: 20px;
          height: 20px;
        }

        .telegram-token-section {
          margin-top: 1rem;
        }

        .token-instructions {
          margin-bottom: 1rem;
        }

        .token-instructions h4 {
          margin: 0 0 0.5rem 0;
          color: white;
          font-size: 1.1rem;
        }

        .token-instructions p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }

        .token-instructions code {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        .token-block {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
        }

        .token-display {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .connection-token {
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.9rem;
          word-break: break-all;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .token-copy-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .token-copy-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .token-copy-btn.copy-success {
          background: rgba(76, 175, 80, 0.3);
          border-color: rgba(76, 175, 80, 0.5);
        }

        .token-actions {
          display: flex;
          gap: 12px;
          margin: 1rem 0;
        }

        .proceed-to-bot-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .proceed-to-bot-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .cancel-connection-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-connection-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .connection-instructions {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .connection-instructions p {
          margin: 0 0 0.5rem 0;
          font-weight: 600;
        }

        .connection-instructions ol {
          margin: 0;
          padding-left: 1.5rem;
        }

        .connection-instructions li {
          margin-bottom: 0.3rem;
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .connection-instructions code {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        .waiting-connection {
          text-align: center;
          padding: 1rem;
          margin-top: 1rem;
        }

        .connecting-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 0.5rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .telegram-connected {
          text-align: center;
        }

        .connection-success {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .success-icon {
          color: #4ade80;
        }

        .telegram-account-info {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .telegram-user {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1rem;
        }

        .telegram-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px;
        }

        .telegram-details {
          text-align: left;
          flex: 1;
        }

        .telegram-username {
          font-weight: 600;
          margin: 0;
          font-size: 1.1rem;
        }

        .connection-status {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .telegram-disconnect-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .telegram-disconnect-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

const inputHintStyle = {
  fontSize: "12px",
  color: "#ff9800",
  marginTop: "4px",
  marginBottom: "0",
}

export default Profile
