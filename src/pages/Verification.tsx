"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { uploadImage } from "../utils/imageUploader"
import "../styles/verification.css"

interface UserData {
  uid: string
  username: string
  email: string
  fullName: string
  phoneNumber: string
  dateOfBirth: string
  accountName: string
  accountNumber: string
  bankName: string
  isVerified: boolean
}

interface DocumentStatus {
  status: "pending" | "completed"
  dateUploaded: string
  timeUploaded: string
  fileUrl: string
  provider?: string
}

interface VerificationData {
  nin: DocumentStatus
  selfie: DocumentStatus
  proofOfAddress: DocumentStatus
  address: string
  verificationState: "Not Verified" | "Awaiting Verification" | "Verified"
  uid: string
}

const Verification = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [verificationData, setVerificationData] = useState<VerificationData>({
    nin: { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
    selfie: { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
    proofOfAddress: { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
    address: "",
    verificationState: "Not Verified",
    uid: "",
  })
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({
    nin: 0,
    selfie: 0,
    proofOfAddress: 0,
  })
  const [showUploadDialog, setShowUploadDialog] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [verificationId, setVerificationId] = useState<string>("")
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [allRequirementsMet, setAllRequirementsMet] = useState(false)

  // Prevent file input dialog issues
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        // Get user data from Firestore
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const data = userDoc.data()

          // Check if user is already verified
          if (data.isVerified) {
            alert("You are already verified! Redirecting to your profile.")
            navigate("/bookerprofile")
            return
          }

          setUserData({
            uid: user.uid,
            username: data.username || "",
            email: data.email || "",
            fullName: data.fullName || "",
            phoneNumber: data.phoneNumber || "",
            dateOfBirth: data.dateOfBirth || "",
            accountName: data.accountName || "",
            accountNumber: data.accountNumber || "",
            bankName: data.bankName || "",
            isVerified: data.isVerified || false,
          })

          // Get verification data from Firestore
          const verificationQuery = query(collection(db, "verification"), where("uid", "==", user.uid))
          const verificationSnapshot = await getDocs(verificationQuery)

          if (!verificationSnapshot.empty) {
            const verificationDoc = verificationSnapshot.docs[0]
            const verificationData = verificationDoc.data() as VerificationData
            setVerificationId(verificationDoc.id || "")
            setVerificationData({
              nin: verificationData.nin || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
              selfie: verificationData.selfie || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
              proofOfAddress: verificationData.proofOfAddress || {
                status: "pending",
                dateUploaded: "",
                timeUploaded: "",
                fileUrl: "",
              },
              address: verificationData.address || "",
              verificationState: verificationData.verificationState || "Not Verified",
              uid: user.uid,
            })
          } else {
            setVerificationData({
              ...verificationData,
              uid: user.uid,
            })
          }
        } else {
          navigate("/bookerprofile")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [navigate])

  // Check if all requirements are met
  useEffect(() => {
    const allDocumentsUploaded =
      verificationData.nin.status === "completed" &&
      verificationData.selfie.status === "completed" &&
      verificationData.proofOfAddress.status === "completed"

    const addressFilled = verificationData.address.trim() !== ""

    setAllRequirementsMet(allDocumentsUploaded && addressFilled && verificationId !== "")
  }, [verificationData, verificationId])

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVerificationData({
      ...verificationData,
      address: e.target.value,
    })
  }

  const handleVerificationIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationId(e.target.value)
  }

  const handleUploadClick = (documentType: string) => {
    setShowUploadDialog(documentType)
    resetFileInput() // Reset file input to ensure onChange fires even if same file is selected

    // Use setTimeout to ensure the file picker dialog opens after state updates
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click()
      }
    }, 100)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !showUploadDialog || !userData) {
      setShowUploadDialog(null)
      return
    }

    const file = e.target.files[0]
    const documentType = showUploadDialog

    // Validate file type
    if (documentType === "selfie") {
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file for your selfie")
        setShowUploadDialog(null)
        return
      }
    } else {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        alert("Please upload an image or PDF file")
        setShowUploadDialog(null)
        return
      }
    }

    try {
      // Start upload
      setUploadProgress({ ...uploadProgress, [documentType]: 10 })

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const currentProgress = prev[documentType]
          if (currentProgress < 90) {
            return { ...prev, [documentType]: currentProgress + 10 }
          }
          return prev
        })
      }, 500)

      // Use the tiered upload system
      const { url: fileUrl, provider } = await uploadImage(file, {
        cloudinaryFolder: "Verification",
        supabasePath: "verification",
        showAlert: true,
      })

      clearInterval(progressInterval)

      if (!fileUrl) {
        throw new Error("Upload failed on all providers")
      }

      setUploadProgress({ ...uploadProgress, [documentType]: 100 })

      // Update verification data
      const now = new Date()
      const dateUploaded = now.toLocaleDateString()
      const timeUploaded = now.toLocaleTimeString()

      const updatedVerificationData = {
        ...verificationData,
        [documentType]: {
          status: "completed" as const,
          dateUploaded,
          timeUploaded,
          fileUrl,
          provider,
        },
      }


      // Check if all documents are uploaded and address is filled
      const allDocumentsUploaded =
        updatedVerificationData.nin.status === "completed" &&
        updatedVerificationData.selfie.status === "completed" &&
        updatedVerificationData.proofOfAddress.status === "completed"

      if (allDocumentsUploaded && updatedVerificationData.address.trim() !== "") {
        updatedVerificationData.verificationState = "Awaiting Verification"
      }

      setVerificationData(updatedVerificationData)

      // Save to Firestore
      await saveVerificationToFirestore(updatedVerificationData)

      // Reset upload dialog
      setTimeout(() => {
        setShowUploadDialog(null)
        setUploadProgress({ ...uploadProgress, [documentType]: 0 })
      }, 1000)

    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Failed to upload file. Please try again.")
      setUploadProgress({ ...uploadProgress, [documentType]: 0 })
      setShowUploadDialog(null)
    }
  }

  const saveVerificationToFirestore = async (data: VerificationData) => {
    try {
      // Convert the VerificationData to a plain object that Firestore can accept
      const firestoreData = {
        nin: {
          status: data.nin.status,
          dateUploaded: data.nin.dateUploaded,
          timeUploaded: data.nin.timeUploaded,
          fileUrl: data.nin.fileUrl,
          provider: data.nin.provider || null,
        },
        selfie: {
          status: data.selfie.status,
          dateUploaded: data.selfie.dateUploaded,
          timeUploaded: data.selfie.timeUploaded,
          fileUrl: data.selfie.fileUrl,
          provider: data.selfie.provider || null,
        },
        proofOfAddress: {
          status: data.proofOfAddress.status,
          dateUploaded: data.proofOfAddress.dateUploaded,
          timeUploaded: data.proofOfAddress.timeUploaded,
          fileUrl: data.proofOfAddress.fileUrl,
          provider: data.proofOfAddress.provider || null,
        },
        address: data.address,
        verificationState: data.verificationState,
        uid: data.uid,
      }

      if (verificationId) {
        // Update existing document
        await updateDoc(doc(db, "verification", verificationId), firestoreData)
      } else {
        // Create new document
        const docRef = await addDoc(collection(db, "verification"), firestoreData)
        setVerificationId(docRef.id)
      }
    } catch (error) {
      console.error("Error saving verification data:", error)
      throw error
    }
  }

  const saveVerification = async () => {
    if (!userData) return

    try {
      setLoading(true)

      // Save verification data to Firestore
      await saveVerificationToFirestore(verificationData)

      alert("Verification information saved successfully!")
      navigate("/bookerprofile")
    } catch (error) {
      console.error("Error saving verification data:", error)
      alert("Failed to save verification data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyVerificationId = () => {
    if (verificationId) {
      navigator.clipboard
        .writeText(verificationId)
        .then(() => {
          setCopiedToClipboard(true)
          setTimeout(() => setCopiedToClipboard(false), 3000)
        })
        .catch((err) => {
          console.error("Failed to copy verification ID: ", err)
        })
    }
  }

  if (loading) {
    return <Preloader loading={loading} />
  }

  if (!userData) {
    return (
      <>
        <UserHeader />
        <div className="error-message">User data not found.</div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <UserHeader />
      <div className="verification-container">
        <div className="verification-header">
          <div className="verification-image-container">
            <img src="/kyc.svg" alt="KYC Verification" className="verification-image" />
          </div>
          <h1>Booker Verification</h1>
          <p className="verification-disclaimer">
            The verification process is free and we don't publicly share the details that have been uploaded here. Your
            information is securely stored and used only for verification purposes.
          </p>
        </div>

        <div className="verification-section">
          <h2>Personal Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={userData.fullName} readOnly className="readonly-input" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={userData.email} readOnly className="readonly-input" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" value={userData.phoneNumber} readOnly className="readonly-input" />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input
                type="text"
                value={userData.dateOfBirth ? calculateAge(userData.dateOfBirth) : "Not provided"}
                readOnly
                className="readonly-input"
              />
            </div>
            <div className="form-group verification-id-group">
              <label>Verification ID</label>
              <div className="verification-id-container">
                <input
                  type="text"
                  value={verificationId}
                  onChange={handleVerificationIdChange}
                  className="readonly-input verification-id-input"
                  readOnly
                  placeholder="No verification ID yet"
                />
                {verificationId && (
                  <button className={`copy-button ${copiedToClipboard ? "copied" : ""}`} onClick={copyVerificationId}>
                    {copiedToClipboard ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="verification-section">
          <h2>Banking Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Account Name</label>
              <input type="text" value={userData.accountName} readOnly className="readonly-input" />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input type="text" value={userData.accountNumber} readOnly className="readonly-input" />
            </div>
            <div className="form-group">
              <label>Bank Name</label>
              <input type="text" value={userData.bankName} readOnly className="readonly-input" />
            </div>
          </div>
        </div>

        <div className="verification-section">
          <h2>Address Information</h2>
          <div className="form-group">
            <label>Residential Address</label>
            <textarea
              value={verificationData.address}
              onChange={handleAddressChange}
              placeholder="Enter your full residential address"
              rows={3}
              className="address-input"
            />
          </div>
        </div>

        <div className="verification-section">
          <h2>Upload Documents</h2>
          <div className="documents-table-responsive">
            <div className="table-scroll-indicator">Scroll horizontally to see more →</div>
            <div className="documents-table-container">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Date Uploaded</th>
                    <th>Time Uploaded</th>
                    <th>Provider</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-label="Document">National Identity Number (NIN)</td>
                    <td data-label="Action">
                      <button className="upload-button" onClick={() => handleUploadClick("nin")}>
                        {verificationData.nin.status === "completed" ? "Replace" : "Upload"}
                      </button>
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge status-${verificationData.nin.status}`}>
                        {verificationData.nin.status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td data-label="Date Uploaded">{verificationData.nin.dateUploaded || "-"}</td>
                    <td data-label="Time Uploaded">{verificationData.nin.timeUploaded || "-"}</td>
                    <td data-label="Provider">{verificationData.nin.provider || "-"}</td>
                  </tr>
                  <tr>
                    <td data-label="Document">Selfie Shot</td>
                    <td data-label="Action">
                      <button className="upload-button" onClick={() => handleUploadClick("selfie")}>
                        {verificationData.selfie.status === "completed" ? "Replace" : "Upload"}
                      </button>
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge status-${verificationData.selfie.status}`}>
                        {verificationData.selfie.status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td data-label="Date Uploaded">{verificationData.selfie.dateUploaded || "-"}</td>
                    <td data-label="Time Uploaded">{verificationData.selfie.timeUploaded || "-"}</td>
                    <td data-label="Provider">{verificationData.selfie.provider || "-"}</td>
                  </tr>
                  <tr>
                    <td data-label="Document">Proof of Address</td>
                    <td data-label="Action">
                      <button className="upload-button" onClick={() => handleUploadClick("proofOfAddress")}>
                        {verificationData.proofOfAddress.status === "completed" ? "Replace" : "Upload"}
                      </button>
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge status-${verificationData.proofOfAddress.status}`}>
                        {verificationData.proofOfAddress.status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td data-label="Date Uploaded">{verificationData.proofOfAddress.dateUploaded || "-"}</td>
                    <td data-label="Time Uploaded">{verificationData.proofOfAddress.timeUploaded || "-"}</td>
                    <td data-label="Provider">{verificationData.proofOfAddress.provider || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="verification-section">
          <h2>Verification State</h2>
          <div className="verification-state-container">
            <div
              className={`verification-state ${verificationData.verificationState.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {verificationData.verificationState}
            </div>
          </div>
        </div>

        {/* New section for verification completion message */}
        {allRequirementsMet && (
          <div className="verification-section verification-complete-section">
            <div className="verification-complete-message">
              <h3>All Verification Requirements Completed!</h3>
              <p>
                You have successfully uploaded all required documents and completed all required fields. Please copy
                your Verification ID and share it with our customer service team to complete your verification process.
              </p>
              <div className="verification-id-highlight">
                <strong>Your Verification ID:</strong>
                <div className="verification-id-copy-container">
                  <input type="text" value={verificationId} readOnly className="readonly-input highlight-input" />
                  <button
                    className={`copy-button highlight-copy ${copiedToClipboard ? "copied" : ""}`}
                    onClick={copyVerificationId}
                  >
                    {copiedToClipboard ? "Copied!" : "Copy ID"}
                  </button>
                </div>
              </div>
              <p className="contact-instructions">
                Contact our customer service team at <strong>support@spotix.com</strong> or through the chat widget at
                the bottom of the page.
              </p>
            </div>
          </div>
        )}

        <div className="verification-actions">
          <button className="save-button" onClick={saveVerification}>
            Save Verification
          </button>
          <button className="cancel-button" onClick={() => navigate("/bookerprofile")}>
            Cancel
          </button>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept={showUploadDialog === "selfie" ? "image/*" : "image/*,.pdf"}
        />

        {/* Upload Dialog */}
        {showUploadDialog && (
          <div className="upload-dialog-overlay" onClick={() => setShowUploadDialog(null)}>
            <div className="upload-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Upload {getDocumentName(showUploadDialog)}</h3>
              <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                <div className="upload-icon">📁</div>
                <p>Click to Upload</p>
                <p className="upload-security-text">Secured by Spotix. All uploads are safe and secure</p>
              </div>
              {uploadProgress[showUploadDialog] > 0 && (
                <div className="upload-progress-container">
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress[showUploadDialog]}%` }}></div>
                  <span className="upload-progress-text">{uploadProgress[showUploadDialog]}%</span>
                </div>
              )}
              <div className="upload-dialog-actions">
                <button className="cancel-upload-button" onClick={() => setShowUploadDialog(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string): string {
  try {
    const dob = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }

    return age.toString()
  } catch (error) {
    return "Unknown"
  }
}

// Helper function to get document name for display
function getDocumentName(documentType: string): string {
  switch (documentType) {
    case "nin":
      return "National Identity Number (NIN)"
    case "selfie":
      return "Selfie Shot"
    case "proofOfAddress":
      return "Proof of Address"
    default:
      return "Document"
  }
}

export default Verification
