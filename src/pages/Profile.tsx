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
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
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
}

interface ConfirmDialogProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

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
  const navigate = useNavigate()

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
              })

              if (userData.bankName) {
                setBankInput(userData.bankName)
              }

              // Initialize new email field with current email
              if (authUser.email) {
                setNewEmail(authUser.email)
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
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [copySuccess])

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

      alert("Referral code generated successfully!")
    } catch (error) {
      console.error("Error generating referral code:", error)
      alert("Failed to generate referral code. Please try again.")
    } finally {
      setGeneratingCode(false)
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
        `https://spotix-backend.onrender.com/api/verify?accountNumber=${user.accountNumber}&bankName=${user.bankName}`,
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

  if (loading || !user) {
    return <Preloader loading={loading} />
  }

  return (
    <div className="profile-container">
      <UserHeader />
            <Helmet>
  <title>User Profile</title>
  <meta name="description" content="Find, book, and attend the best events on your campus. Discover concerts, night parties, workshops, religious events, and more on Spotix." />
  {/* Open Graph for social media */}
  <meta property="og:title" content="Spotix | User Profile" />
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
            {!user.referralCode && (
              <button type="button" className="generate-btn" onClick={generateReferralCode} disabled={generatingCode}>
                {generatingCode ? "Generating..." : "Generate"}
              </button>
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
