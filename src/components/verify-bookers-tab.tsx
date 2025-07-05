"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { collection, getDocs, doc, getDoc, query, where, writeBatch } from "firebase/firestore"
import { Search, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { generateBVT } from "../utils/generators"

interface UserData {
  email?: string
  fullName?: string
  username?: string
  isBooker?: boolean
  phoneNumber?: string
  accountName?: string
  accountNumber?: string
  bankName?: string
}

interface VerificationData {
  id: string
  userId: string
  address?: string
  verificationState: string
  nin?: {
    status: string
    dateUploaded: string
    timeUploaded: string
    fileUrl: string
  }
  selfie?: {
    status: string
    dateUploaded: string
    timeUploaded: string
    fileUrl: string
  }
  proofOfAddress?: {
    status: string
    dateUploaded: string
    timeUploaded: string
    fileUrl: string
  }
  userName?: string
  userEmail?: string
  phoneNumber?: string
  accountName?: string
  accountNumber?: string
  bankName?: string
  createdAt?: any
}

interface VerifyBookersTabProps {
  setMessage: (message: { text: string; type: string }) => void
  setLoading: (loading: boolean) => void
}

// Helper function to safely format timestamps
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return "Unknown"

  // If it's a Firestore timestamp (has seconds property)
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString()
  }

  // If it's already a Date object or string
  try {
    return new Date(timestamp).toLocaleString()
  } catch (e) {
    return "Invalid date"
  }
}

const VerifyBookersTab: React.FC<VerifyBookersTabProps> = ({ setMessage, setLoading }) => {
  const [verificationId, setVerificationId] = useState("")
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [searchingVerification, setSearchingVerification] = useState(false)
  const [pendingVerifications, setPendingVerifications] = useState<VerificationData[]>([])

  useEffect(() => {
    loadPendingVerifications()
  }, [])

  const loadPendingVerifications = async () => {
    try {
      const verificationsRef = collection(db, "verification")
      const q = query(verificationsRef, where("verificationState", "==", "Awaiting Verification"))
      const querySnapshot = await getDocs(q)

      const verificationsList: VerificationData[] = []
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        verificationsList.push({
          id: docSnapshot.id,
          userId: data.uid || "",
          address: data.address || "",
          verificationState: data.verificationState || "Awaiting Verification",
          nin: data.nin || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
          selfie: data.selfie || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
          proofOfAddress: data.proofOfAddress || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
          createdAt: data.selfie?.dateUploaded || null,
        })
      })

      setPendingVerifications(verificationsList)
    } catch (error) {
      console.error("Error loading pending verifications:", error)
    }
  }

  const searchVerification = async () => {
    if (!verificationId.trim()) {
      setMessage({ text: "Please enter a verification ID", type: "error" })
      return
    }

    setSearchingVerification(true)
    setVerificationData(null)

    try {
      const verificationDocRef = doc(db, "verification", verificationId.trim())
      const verificationDoc = await getDoc(verificationDocRef)

      if (verificationDoc.exists()) {
        const data = verificationDoc.data()

        // Get user details
        const userDocRef = doc(db, "users", data.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData

          setVerificationData({
            id: verificationDoc.id,
            userId: data.uid,
            address: data.address || "Not provided",
            verificationState: data.verificationState || "Awaiting Verification",
            nin: data.nin || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            selfie: data.selfie || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            proofOfAddress: data.proofOfAddress || {
              status: "pending",
              dateUploaded: "",
              timeUploaded: "",
              fileUrl: "",
            },
            userName: userData.fullName || userData.username || "Unknown",
            userEmail: userData.email || "No email",
            phoneNumber: userData.phoneNumber || "Not provided",
            accountName: userData.accountName || "Not provided",
            accountNumber: userData.accountNumber || "Not provided",
            bankName: userData.bankName || "Not provided",
            createdAt: data.selfie?.dateUploaded || null,
          })
        } else {
          setVerificationData({
            id: verificationDoc.id,
            userId: data.uid,
            address: data.address || "Not provided",
            verificationState: data.verificationState || "Awaiting Verification",
            nin: data.nin || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            selfie: data.selfie || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            proofOfAddress: data.proofOfAddress || {
              status: "pending",
              dateUploaded: "",
              timeUploaded: "",
              fileUrl: "",
            },
            userName: "User not found",
            userEmail: "User not found",
            phoneNumber: "Not provided",
            accountName: "Not provided",
            accountNumber: "Not provided",
            bankName: "Not provided",
            createdAt: data.selfie?.dateUploaded || null,
          })
        }
      } else {
        setMessage({ text: "Verification not found", type: "error" })
      }
    } catch (error) {
      console.error("Error searching for verification:", error)
      setMessage({ text: "Error searching for verification", type: "error" })
    } finally {
      setSearchingVerification(false)
    }
  }

  const verifyBooker = async (verificationId: string, userId: string) => {
    setLoading(true)

    try {
      // Generate BVT
      const bvt = generateBVT()

      const batch = writeBatch(db)

      // Get references to both documents
      const verificationDocRef = doc(db, "verification", verificationId)
      const userDocRef = doc(db, "users", userId)

      // Set the updates in the batch
      batch.update(verificationDocRef, {
        verificationState: "Verified",
        verifiedAt: new Date(),
        verifiedBy: auth.currentUser?.uid || "Unknown",
        bvt: bvt,
      })

      batch.update(userDocRef, {
        isVerified: true,
        bvt: bvt,
      })

      // Commit the batch
      await batch.commit()

      setMessage({ text: "Booker verified successfully", type: "success" })
      setVerificationData(null)
      setVerificationId("")

      // Refresh pending verifications
      await loadPendingVerifications()
    } catch (error) {
      console.error("Error verifying booker:", error)

      // More detailed error handling
      if (error instanceof Error) {
        if (error.message.includes("permission")) {
          setMessage({
            text: "Permission denied. Your account doesn't have sufficient privileges to verify bookers.",
            type: "error",
          })
        } else {
          setMessage({ text: "Failed to verify booker: " + error.message, type: "error" })
        }
      } else {
        setMessage({ text: "Failed to verify booker", type: "error" })
      }

      console.log(
        "This may be a Firebase security rules issue. Make sure your security rules allow admin users to write to the verification and users collections.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-section">
      <h2>Booker Verification</h2>

      <div className="verification-search">
        <h3>Verify Booker</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder="Enter verification ID"
            value={verificationId}
            onChange={(e) => setVerificationId(e.target.value)}
          />
          <button
            className="search-verification-btn"
            onClick={searchVerification}
            disabled={searchingVerification || !verificationId.trim()}
          >
            {searchingVerification ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </div>
      </div>

      {verificationData && (
        <div className="verification-details">
          <h3>Verification Details</h3>
          <div className="verification-card">
            <div className="verification-header">
              <div>
                <h4>{verificationData.userName}</h4>
                <p>{verificationData.userEmail}</p>
              </div>
              <div className="verification-status">
                {verificationData.verificationState === "Verified" ? (
                  <span className="status verified">
                    <CheckCircle size={16} />
                    Verified
                  </span>
                ) : (
                  <span className="status pending">
                    <AlertCircle size={16} />
                    {verificationData.verificationState}
                  </span>
                )}
              </div>
            </div>

            <div className="verification-content">
              <div className="verification-field">
                <span>Phone Number:</span>
                <span>{verificationData.phoneNumber || "Not provided"}</span>
              </div>
              <div className="verification-field">
                <span>Residential Address:</span>
                <span>{verificationData.address || "Not provided"}</span>
              </div>
              <div className="verification-field">
                <span>Account Name:</span>
                <span>{verificationData.accountName || "Not provided"}</span>
              </div>
              <div className="verification-field">
                <span>Account Number:</span>
                <span>{verificationData.accountNumber || "Not provided"}</span>
              </div>
              <div className="verification-field">
                <span>Bank Name:</span>
                <span>{verificationData.bankName || "Not provided"}</span>
              </div>
              <div className="verification-field">
                <span>Submitted On:</span>
                <span>{formatTimestamp(verificationData.selfie?.dateUploaded)}</span>
              </div>
            </div>

            <div className="verification-documents">
              <h4>Uploaded Documents</h4>
              <div className="documents-grid">
                {verificationData.nin && verificationData.nin.fileUrl && (
                  <div className="document-card">
                    <h5>National Identity Number (NIN)</h5>
                    <a href={verificationData.nin.fileUrl} target="_blank" rel="noopener noreferrer">
                      View Document
                    </a>
                  </div>
                )}

                {verificationData.selfie && verificationData.selfie.fileUrl && (
                  <div className="document-card">
                    <h5>Selfie Shot</h5>
                    <a href={verificationData.selfie.fileUrl} target="_blank" rel="noopener noreferrer">
                      View Document
                    </a>
                  </div>
                )}

                {verificationData.proofOfAddress && verificationData.proofOfAddress.fileUrl && (
                  <div className="document-card">
                    <h5>Proof of Address</h5>
                    <a href={verificationData.proofOfAddress.fileUrl} target="_blank" rel="noopener noreferrer">
                      View Document
                    </a>
                  </div>
                )}
              </div>
            </div>

            {verificationData.verificationState !== "Verified" && (
              <div className="verification-actions">
                <button
                  className="verify-btn"
                  onClick={() => verifyBooker(verificationData.id, verificationData.userId)}
                >
                  <CheckCircle size={16} />
                  Verify Booker
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pending-verifications">
        <h3>Pending Verifications</h3>
        {pendingVerifications.length > 0 ? (
          <div className="verifications-grid">
            {pendingVerifications.map((verification) => (
              <div key={verification.id} className="verification-item">
                <div className="verification-item-header">
                  <h4>Verification ID: {verification.id.substring(0, 8)}...</h4>
                  <span className="status pending">Awaiting Verification</span>
                </div>
                <p>User ID: {verification.userId.substring(0, 8)}...</p>
                <p>Submitted: {formatTimestamp(verification.selfie?.dateUploaded)}</p>
                <button
                  className="view-verification-btn"
                  onClick={() => {
                    setVerificationId(verification.id)
                    searchVerification()
                  }}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">No pending verifications</p>
        )}
      </div>
    </div>
  )
}

export default VerifyBookersTab
