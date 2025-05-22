"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Copy, CheckCircle, AlertCircle, HeartHandshake, Shield, Key } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "./agent-pay.css"

const AgentPay = () => {
  const searchParams = useSearchParams()[0]
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [eventData, setEventData] = useState<any>(null)
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is authenticated
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        // Get event data from URL parameters
        const eventId = searchParams.get("eventId")
        const eventCreatorId = searchParams.get("eventCreatorId")
        const eventName = searchParams.get("eventName")
        const ticketType = searchParams.get("ticketType")
        const ticketPrice = searchParams.get("ticketPrice")

        if (!eventId || !eventCreatorId || !eventName || !ticketType || !ticketPrice) {
          navigate("/home")
          return
        }

        // Get user data
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
          navigate("/home")
          return
        }

        const userDocData = userDoc.data()

        // Get event creator data
        const creatorDocRef = doc(db, "users", eventCreatorId)
        const creatorDoc = await getDoc(creatorDocRef)

        let bookerName = "Event Host"
        let bookerId = eventCreatorId

        if (creatorDoc.exists()) {
          const creatorData = creatorDoc.data()
          bookerName = creatorData.bookerName || creatorData.fullName || creatorData.username || "Event Host"
          bookerId = creatorData.bookerId || eventCreatorId
        }

        setUserData({
          uid: user.uid,
          fullName: userDocData.fullName || userDocData.username || "User",
          email: userDocData.email || "",
        })

        setEventData({
          eventId,
          eventCreatorId,
          eventName,
          ticketType,
          ticketPrice,
          bookerName,
          bookerId,
        })

        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        navigate("/home")
      }
    }

    fetchData()
  }, [navigate, searchParams])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied({ ...copied, [field]: true })
      setTimeout(() => {
        setCopied({ ...copied, [field]: false })
      }, 2000)
    })
  }

  const handleValidateAuthKey = () => {
    navigate("/user-v-auth")
  }

  const handleVerifyAgent = () => {
    navigate("/agentAuth")
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <UserHeader />
      <div className="agent-pay-container">
        <div className="agent-pay-header">
          <HeartHandshake className="agent-pay-icon" />
          <h1>Agent Payment</h1>
        </div>

        <div className="agent-pay-info-box">
          <div className="info-box-header">
            <AlertCircle size={20} />
            <h3>How Agent Payment Works</h3>
          </div>
          <p>
            This payment method allows agents to complete payments on your behalf. Share the details below with your
            preferred Spotix agent to help you complete this transaction.
          </p>
          <p>
            <strong>Important:</strong> You must validate the Auth Key from the agent after payment to receive your
            ticket. Agents cannot complete transactions without you validating the Auth Key.
          </p>
        </div>

        <div className="agent-pay-details">
          <h2>Payment Details</h2>
          <div className="payment-info-card">
            <div className="payment-info-row">
              <span className="info-label">Event Name:</span>
              <span className="info-value">{eventData.eventName}</span>
            </div>
            <div className="payment-info-row">
              <span className="info-label">Ticket Type:</span>
              <span className="info-value">{eventData.ticketType}</span>
            </div>
            <div className="payment-info-row">
              <span className="info-label">Ticket Price:</span>
              <span className="info-value">₦{eventData.ticketPrice}</span>
            </div>
            <div className="payment-info-row">
              <span className="info-label">Event Host:</span>
              <span className="info-value">{eventData.bookerName}</span>
            </div>
          </div>
        </div>

        <div className="agent-pay-required-info">
          <h2>Required Information for Agent</h2>
          <p className="required-info-description">
            Share these details with your agent to complete the payment. Click on each field to copy.
          </p>

          <div className="required-info-card">
            <div className="required-info-item">
              <div className="info-header">
                <span className="info-title">Booker ID</span>
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(eventData.bookerId, "bookerId")}
                  title="Copy Booker ID"
                >
                  {copied.bookerId ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied.bookerId ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="info-content">{eventData.bookerId}</div>
            </div>

            <div className="required-info-item">
              <div className="info-header">
                <span className="info-title">Event ID</span>
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(eventData.eventId, "eventId")}
                  title="Copy Event ID"
                >
                  {copied.eventId ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied.eventId ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="info-content">{eventData.eventId}</div>
            </div>

            <div className="required-info-item">
              <div className="info-header">
                <span className="info-title">Your User ID</span>
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(userData.uid, "userId")}
                  title="Copy User ID"
                >
                  {copied.userId ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied.userId ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="info-content">{userData.uid}</div>
            </div>
          </div>
        </div>

        <div className="agent-pay-steps">
          <h2>Next Steps</h2>
          <ol className="steps-list">
            <li>
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Share Details with Agent</h3>
                <p>Send the three IDs above to your preferred Spotix agent.</p>
              </div>
            </li>
            <li>
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Make Payment to Agent</h3>
                <p>Pay the agent using their preferred payment method.</p>
              </div>
            </li>
            <li>
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Get Auth Key from Agent</h3>
                <p>The agent will provide you with an Auth Key after payment.</p>
              </div>
            </li>
            <li>
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Validate Auth Key</h3>
                <p>Use the "Validate Auth Key" button below to validate the key and receive your ticket.</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="agent-pay-actions">
          <button className="validate-auth-button" onClick={handleValidateAuthKey}>
            <Key size={18} />
            Validate Auth Key
          </button>
          <button className="verify-agent-button" onClick={handleVerifyAgent}>
            <Shield size={18} />
            Verify Agent
          </button>
        </div>

        <div className="agent-pay-warning">
          <AlertCircle size={20} />
          <div>
            <h3>Safety Notice</h3>
            <p>
              Only work with verified Spotix agents. Always validate the Auth Key after payment to ensure your ticket is
              properly issued. If you have any concerns, please contact Spotix support immediately.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default AgentPay
