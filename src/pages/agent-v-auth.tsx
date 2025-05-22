"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, setDoc, Timestamp, getDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import AgentHeader from "../components/AgentHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { AlertCircle, CheckCircle, Copy, User, Mail, Ticket, Tag, Calendar, Key } from "lucide-react"
import "./agent-v-auth.css"

const AgentVAuth = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [agentData, setAgentData] = useState<{ username: string; agentId: string; uid: string } | null>(null)
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    eventName: "",
    ticketType: "",
    ticketPrice: "",
  })
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [generatedKey, setGeneratedKey] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()

          // Check if user is an agent
          if (!userData.isAgent) {
            navigate("/")
            return
          }

          setAgentData({
            username: userData.username || "Unknown Agent",
            agentId: userData.agentId || "No Agent ID",
            uid: user.uid,
          })
        } else {
          navigate("/")
          return
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking agent status:", error)
        setErrorMessage("An error occurred while checking your agent status. Please try again.")
        setLoading(false)
      }
    }

    checkAgentStatus()
  }, [navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const generateRandomKey = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 14; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  const handleCreateAuthKey = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agentData) {
      setErrorMessage("Agent data not available. Please refresh the page.")
      return
    }

    // Validate form
    if (!formData.customerName.trim()) {
      setErrorMessage("Please enter customer name")
      return
    }

    if (!formData.customerEmail.trim()) {
      setErrorMessage("Please enter customer email")
      return
    }

    if (!formData.eventName.trim()) {
      setErrorMessage("Please enter event name")
      return
    }

    if (!formData.ticketType.trim()) {
      setErrorMessage("Please enter ticket type")
      return
    }

    if (!formData.ticketPrice.trim()) {
      setErrorMessage("Please enter ticket price")
      return
    }

    try {
      setIsGenerating(true)
      setErrorMessage("")

      // Generate a unique key
      const randomKey = generateRandomKey()
      const authKey = `SP-AUTH-${randomKey}`

      // Create document in Firestore
      await setDoc(doc(db, "AuthKey", authKey), {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        eventName: formData.eventName,
        ticketType: formData.ticketType,
        ticketPrice: formData.ticketPrice,
        agentUsername: agentData.username,
        agentId: agentData.agentId,
        agentUid: agentData.uid,
        validated: false,
        createdAt: Timestamp.now(),
        validatedBy: null,
        validatedByUid: null,
        validatedAt: null,
      })

      // Set success message and generated key
      setGeneratedKey(authKey)
      setSuccessMessage("Auth key generated successfully!")

      // Reset form
      setFormData({
        customerName: "",
        customerEmail: "",
        eventName: "",
        ticketType: "",
        ticketPrice: "",
      })
    } catch (error) {
      console.error("Error creating auth key:", error)
      setErrorMessage("Failed to create auth key. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(generatedKey)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
      })
  }

  if (loading) {
    return <Preloader />
  }

  return (
    <>
      <AgentHeader />
      <div className="agent-v-auth-container">
        <div className="auth-header">
          <Key className="auth-icon" />
          <h1>Agent Transaction Verification</h1>
        </div>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <CheckCircle size={16} />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="agent-info-section">
          <h2>Agent Information</h2>
          <div className="agent-info">
            <div className="info-item">
              <span className="info-label">Username:</span>
              <span className="info-value">{agentData?.username}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Agent ID:</span>
              <span className="info-value">{agentData?.agentId}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateAuthKey} className="auth-form">
          <h2>Transaction Details</h2>
          <p className="form-description">
            Enter the customer and ticket details to generate a verification code. The customer will use this code to
            verify their purchase.
          </p>

          <div className="form-group">
            <label htmlFor="customerName">
              <User size={16} />
              Customer Name
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="Enter customer name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="customerEmail">
              <Mail size={16} />
              Customer Email
            </label>
            <input
              type="email"
              id="customerEmail"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleInputChange}
              placeholder="Enter customer email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="eventName">
              <Calendar size={16} />
              Event Name
            </label>
            <input
              type="text"
              id="eventName"
              name="eventName"
              value={formData.eventName}
              onChange={handleInputChange}
              placeholder="Enter event name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ticketType">
              <Ticket size={16} />
              Ticket Type
            </label>
            <input
              type="text"
              id="ticketType"
              name="ticketType"
              value={formData.ticketType}
              onChange={handleInputChange}
              placeholder="Enter ticket type"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ticketPrice">
              <Tag size={16} />
              Ticket Price
            </label>
            <input
              type="text"
              id="ticketPrice"
              name="ticketPrice"
              value={formData.ticketPrice}
              onChange={handleInputChange}
              placeholder="Enter ticket price"
              required
            />
          </div>

          <button type="submit" className="create-auth-button" disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Create Auth Key"}
          </button>
        </form>

        {generatedKey && (
          <div className="generated-key-section">
            <h2>Generated Verification Code</h2>
            <p className="key-instructions">
              Share this code with the customer. They will use it to verify their purchase.
            </p>

            <div className="key-display">
              <span className="key-value">{generatedKey}</span>
              <button onClick={copyToClipboard} className="copy-button" title="Copy to clipboard">
                <Copy size={16} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="key-info">
              <p>
                <strong>Important:</strong> This code is valid until the customer verifies it. Make sure they receive
                this code securely.
              </p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default AgentVAuth
