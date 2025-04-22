"use client"

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import Preloader from "../components/preloader"
import UserHeader from "../components/UserHeader"
import LogoutBtn from "../components/logoutbtn"
import Footer from "../components/footer"
import "styles/profile.css"

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
  const navigate = useNavigate()

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

  // Reset copy success message after 3 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [copySuccess])

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const uploadImageToCloudinary = async (file: File) => {
    setUploadingImage(true)

    // Access environment variables the Vite way
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", uploadPreset)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (data.secure_url) {
        return data.secure_url
      } else {
        throw new Error("Failed to upload image")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      let profilePictureUrl = user.profilePicture

      // Upload new image if selected
      if (imageFile) {
        profilePictureUrl = await uploadImageToCloudinary(imageFile)
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
    if (user?.isBooker) {
      // Show confirmation dialog if user is already a booker
      setShowDialog(true)
    } else {
      // Redirect to booker confirmation page
      navigate("/booker-confirm")
    }
  }

  const toggleBookerStatus = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Update user profile in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        isBooker: !user.isBooker,
      })

      // Update local state
      setUser({
        ...user,
        isBooker: !user.isBooker,
      })

      alert("You are now a regular user.")
    } catch (error) {
      console.error("Error toggling booker status:", error)
      alert("Failed to update booker status. Please try again.")
    } finally {
      setLoading(false)
      setShowDialog(false)
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

  if (loading || !user) {
    return <Preloader loading={loading} />
  }

  return (
    <div className="profile-container">
      <UserHeader />
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

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={user.email} readOnly className="readonly-input" />
          </div>
        </div>

        {/* Account Details Section */}
        <div className="form-section">
          <h2 className="section-title">Account Details</h2>
          <div className="form-group">
            <label htmlFor="accountName">Account Name</label>
            <input
              type="text"
              id="accountName"
              value={user.accountName}
              onChange={(e) => setUser({ ...user, accountName: e.target.value })}
              placeholder="Enter account name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">Account Number</label>
            <input
              type="text"
              id="accountNumber"
              value={user.accountNumber}
              onChange={(e) => setUser({ ...user, accountNumber: e.target.value })}
              placeholder="Enter account number"
              maxLength={10}
            />
          </div>

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
              />
              {showBankSuggestions && filteredBanks.length > 0 && (
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

        {/* Booker Status Section */}
        <div className="form-section">
          <button
            type="button"
            className={`booker-btn ${user.isBooker ? "return-btn" : ""}`}
            onClick={handleBookerStatusClick}
          >
            {user.isBooker ? "Return to User" : "Become Booker"}
          </button>
        </div>

        {/* Save Button */}
        <button type="submit" className="save-btn" disabled={uploadingImage}>
          {uploadingImage ? "Uploading..." : "Save Changes"}
        </button>

        {/* Logout Button */}
        <LogoutBtn onClick={handleLogout} />
      </form>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDialog}
        message="Dear booker, if you proceed with this, you will lose access to your events, but we will keep your data as stated in the booker's terms of service. Also remember that you can only receive payouts as a booker."
        onConfirm={toggleBookerStatus}
        onCancel={() => setShowDialog(false)}
      />
<Footer />
    </div>
  )
}

export default Profile

