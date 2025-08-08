"use client"

import type React from "react"
import { useEffect, useMemo, useState, Suspense, lazy } from "react"
import { Copy, Check, Link2, Loader2 } from 'lucide-react'
import "./skeleton.css"

// Firebase
import { db, auth } from "../services/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"

// Lazy load the charts component
const ChartsSection = lazy(() => import("./charts-section"))

interface OverviewTabProps {
  eventData: any
  availableBalance: number
  totalPaidOut: number
  copiedField: string | null
  bookerBVT: string
  ticketSalesByDay: any[]
  ticketSalesByType: any[]
  ticketTypeData: any[]
  copyToClipboard: (text: string, field: string) => void
}

const OverviewTabSkeleton = () => (
  <div className="overview-tab">
    <div className="stats-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-card skeleton">
          <div className="skeleton-text skeleton-title"></div>
          <div className="skeleton-text skeleton-value"></div>
        </div>
      ))}
    </div>

    <div className="payment-requisites">
      <div className="skeleton-text skeleton-title"></div>
      <div className="requisites-grid">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="requisite-item">
            <div className="skeleton-text skeleton-label"></div>
            <div className="copy-field">
              <div className="skeleton-input"></div>
              <div className="skeleton-button"></div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="event-description">
      <div className="skeleton-text skeleton-title"></div>
      <div className="skeleton-text skeleton-paragraph"></div>
      <div className="skeleton-text skeleton-paragraph short"></div>
    </div>

    <div className="sales-chart-container">
      <div className="skeleton-text skeleton-title"></div>
      <div className="skeleton-chart"></div>
    </div>
  </div>
)

const OverviewTab: React.FC<OverviewTabProps> = ({
  eventData,
  availableBalance,
  totalPaidOut,
  copiedField,
  bookerBVT,
  ticketSalesByDay,
  ticketSalesByType,
  ticketTypeData,
  copyToClipboard,
}) => {
  // Get current user from Firebase Auth
  const [user, loading, error] = useAuthState(auth)
  
  // Normalize core identifiers
  const eventName: string = useMemo(
    () => (eventData?.eventName || eventData?.name || eventData?.title || "").toString().trim(),
    [eventData],
  )
  const eventId: string = useMemo(() => (eventData?.id || eventData?.eventId || "").toString().trim(), [eventData])
  
  // Use current logged-in user's UID as booker ID
  const bookerId: string = useMemo(() => {
    if (user?.uid) {
      return user.uid
    }
    // Fallback to eventData if user is not loaded yet
    return (eventData?.creatorId || eventData?.bookerId || eventData?.uid || eventData?.userId || "").toString().trim()
  }, [user, eventData])

  // Shortlink states
  const [checkingLink, setCheckingLink] = useState(true)
  const [creating, setCreating] = useState(false)
  const [existingSlug, setExistingSlug] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [copiedShort, setCopiedShort] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : ""

  const slugFromName = (name: string) => {
    if (!name || typeof name !== 'string') return ""
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/^-+|-+$/g, "")
  }

  const slugCandidate = useMemo(() => {
    const slug = slugFromName(eventName || "")
    console.log("Generated slug candidate:", slug, "from event name:", eventName)
    return slug
  }, [eventName])

  // Check if shortlink exists on load
  useEffect(() => {
    let active = true
    async function checkExisting() {
      // console.log("Starting checkExisting with slugCandidate:", slugCandidate)
      setLinkError(null)
      setCheckingLink(true)
      
      if (!slugCandidate) {
        // console.log("No slug candidate, skipping check")
        setExistingSlug(null)
        setCheckingLink(false)
        return
      }
      
      try {
        // console.log("Checking Firestore for existing shortlink with slug:", slugCandidate)
        const linkDocRef = doc(db, "Links", slugCandidate)
        const snapshot = await getDoc(linkDocRef)
        
        if (!active) return
        
        if (snapshot.exists()) {
          // console.log("Existing shortlink found:", snapshot.data())
          setExistingSlug(slugCandidate)
        } else {
          // console.log("No existing shortlink found for slug:", slugCandidate)
          setExistingSlug(null)
        }
      } catch (e: any) {
        console.error("Error checking shortlink:", e)
        if (active) {
          setLinkError(`Failed to check shortlink: ${e?.message || 'Unknown error'}`)
          setExistingSlug(null)
        }
      } finally {
        if (active) {
          // console.log("Finished checking, setting checkingLink to false")
          setCheckingLink(false)
        }
      }
    }
    
    checkExisting()
    return () => {
      active = false
    }
  }, [slugCandidate])

  const handleCreateShortlink = async () => {
    
    setLinkError(null)
    
    // Validate required data
    if (!eventName) {
      const errorMsg = "Event name is required to create a shortlink."
      console.error(errorMsg)
      setLinkError(errorMsg)
      return
    }
    if (!eventId) {
      const errorMsg = "Event ID is missing."
      console.error(errorMsg)
      setLinkError(errorMsg)
      return
    }
    if (!bookerId) {
      const errorMsg = "User must be logged in to create a shortlink."
      console.error(errorMsg)
      setLinkError(errorMsg)
      return
    }
    if (!slugCandidate) {
      const errorMsg = "Could not generate a shortlink slug from the event name."
      console.error(errorMsg)
      setLinkError(errorMsg)
      return
    }

    // console.log("All validation passed, proceeding with creation...")

    try {
      setCreating(true)
      console.log("Set creating to true")
      
      // Create the document reference
      const linkDocRef = doc(db, "Links", slugCandidate)
      // console.log("Created document reference for path: Links/" + slugCandidate)
      
      // Check if it already exists (double-check)
      // console.log("Double-checking if document exists...")
      const existing = await getDoc(linkDocRef)
      if (existing.exists()) {
        setExistingSlug(slugCandidate)
        setCreating(false)
        return
      }
      
      // Create the shortlink document
      const linkData = {
        slug: slugCandidate,
        eventName: eventName,
        eventId: eventId,
        bookerId: bookerId,
        createdAt: serverTimestamp(),
      }
      
      await setDoc(linkDocRef, linkData)
      
      
      // Verify the document was created
      const verifyDoc = await getDoc(linkDocRef)
      if (verifyDoc.exists()) {
        console.log("✅ Verified document exists in Firestore:", verifyDoc.data())
        setExistingSlug(slugCandidate)
      } else {
        console.error("❌ Document was not found after creation")
        setLinkError("Failed to verify shortlink creation")
      }
      
    } catch (e: any) {
      console.error("❌ Error creating shortlink:", e)
      console.error("Error details:", {
        code: e?.code,
        message: e?.message,
        stack: e?.stack
      })
      setLinkError(`Failed to create shortlink: ${e?.message || 'Unknown error'}`)
    } finally {
      console.log("Setting creating to false")
      setCreating(false)
    }
  }

  const handleCopyShortlink = async () => {
    if (!existingSlug || !origin) return
    try {
      const shortlinkUrl = `${origin}/discover/${existingSlug}`
      await navigator.clipboard.writeText(shortlinkUrl)
      setCopiedShort(true)
      setTimeout(() => setCopiedShort(false), 2000)
      console.log("Shortlink copied to clipboard:", shortlinkUrl)
    } catch (error) {
      console.error("Failed to copy shortlink:", error)
    }
  }

  // Determine if button should be enabled
  const shouldShowCreateButton = !checkingLink && !existingSlug
  const isButtonDisabled = creating || checkingLink || !eventName || !eventId || !bookerId || !slugCandidate || loading



  return (
    <div className="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Tickets Sold</h3>
          <p className="stat-value">
            {eventData.ticketsSold}
            {eventData.enableMaxSize && eventData.maxSize && (
              <span className="capacity-indicator"> / {eventData.maxSize}</span>
            )}
          </p>
          {eventData.enableMaxSize && eventData.maxSize && (
            <div className="progress-bar">
              <div
                className="progress"
                style={{ width: `${(eventData.ticketsSold / Number.parseInt(eventData.maxSize)) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-value">₦{eventData.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="stat-card highlight">
          <h3>Available Balance</h3>
          <p className="stat-value">₦{availableBalance.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Paid Out</h3>
          <p className="stat-value">₦{totalPaidOut.toFixed(2)}</p>
        </div>
      </div>

      <div className="payment-requisites">
        <h3>Payment Requisites</h3>
        <div className="requisites-grid">
          <div className="requisite-item">
            <label>Event ID</label>
            <div className="copy-field">
              <input type="text" value={eventData.id} readOnly />
              <button className="copy-button" onClick={() => copyToClipboard(eventData.id, "eventId")}>
                {copiedField === "eventId" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="requisite-item">
            <label>Pay ID</label>
            <div className="copy-field">
              <input type="text" value={eventData.payId || "Not set"} readOnly />
              <button
                className="copy-button"
                onClick={() => copyToClipboard(eventData.payId || "", "payId")}
                disabled={!eventData.payId}
              >
                {copiedField === "payId" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="requisite-item">
            <label>Booker Verification Tag (BVT)</label>
            <div className="copy-field">
              <input type="text" value={bookerBVT || "Not verified"} readOnly />
              <button
                className="copy-button"
                onClick={() => copyToClipboard(bookerBVT || "", "bvt")}
                disabled={!bookerBVT}
              >
                {copiedField === "bvt" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Shortlink Section */}
      <section className="shortlink-section" aria-labelledby="shortlink-title">
        <div className="shortlink-header">
          <h3 id="shortlink-title">
            Create Shortlink
            <span className="badge-new" aria-label="New feature">NEW</span>
          </h3>
          <p className="shortlink-subtitle">Click the button to create short link for your event.</p>
        </div>

        {linkError && (
          <div className="shortlink-error" role="alert">
            {linkError}
          </div>
        )}

        {error && (
          <div className="shortlink-error" role="alert">
            Authentication error: {error.message}
          </div>
        )}

        {checkingLink ? (
          <div className="shortlink-loading">
            <Loader2 className="spin" size={16} />
            <span>Checking existing shortlink...</span>
          </div>
        ) : existingSlug ? (
          <div className="shortlink-container" role="status" aria-live="polite">
            <Link2 size={16} />
            <span className="shortlink-label">Your shortlink is</span>
            <a className="shortlink-url" href={`/discover/${existingSlug}`} target="_blank" rel="noopener noreferrer">
              {origin}/discover/{existingSlug}
            </a>
            <button
              className="copy-shortlink-btn"
              type="button"
              onClick={handleCopyShortlink}
              aria-label="Copy shortlink"
              title="Copy shortlink"
            >
              {copiedShort ? <Check size={14} /> : <Copy size={14} />}
              <span className="sr-only">Copy</span>
            </button>
          </div>
        ) : (
          <div className="shortlink-actions">
            <button
              className="create-shortlink-btn"
              onClick={handleCreateShortlink}
              disabled={isButtonDisabled}
              aria-disabled={isButtonDisabled}
              type="button"
            >
              {creating ? (
                <>
                  <Loader2 className="spin" size={16} />
                  <span>Creating...</span>
                </>
              ) : loading ? (
                <>
                  <Loader2 className="spin" size={16} />
                  <span>Loading...</span>
                </>
              ) : (
                "Create Shortlink"
              )}
            </button>
            
            {/* Debug info */}
            {/* <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', padding: '0.5rem', background: '#f9f9f9', borderRadius: '4px' }}>
              <div><strong>Debug Info:</strong></div>
              <div>Event Name: "{eventName}"</div>
              <div>Event ID: "{eventId}"</div>
              <div>Booker ID: "{bookerId}"</div>
              <div>Current User UID: "{user?.uid || 'Not logged in'}"</div>
              <div>Slug: "{slugCandidate}"</div>
              <div>Button Disabled: {isButtonDisabled ? 'Yes' : 'No'}</div>
              <div>Auth Loading: {loading ? 'Yes' : 'No'}</div>
              <div>Checking: {checkingLink ? 'Yes' : 'No'}</div>
              <div>Creating: {creating ? 'Yes' : 'No'}</div>
              <div>Existing Slug: {existingSlug || 'None'}</div>
            </div> */}
          </div>
        )}
      </section>

      <div className="event-description">
        <h3>Event Description</h3>
        <p>{eventData.eventDescription || "No description provided."}</p>
      </div>

      <Suspense fallback={<div className="skeleton-chart"></div>}>
        <ChartsSection
          ticketSalesByDay={ticketSalesByDay}
          ticketTypeData={ticketTypeData}
          ticketSalesByType={ticketSalesByType}
          eventData={eventData}
        />
      </Suspense>

      {/* Inline CSS specific to this page and the shortlink section */}
      <style>{`
        .shortlink-section {
          margin-top: 1.5rem;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 1rem;
          background: #fff;
        }
        .shortlink-header {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }
        .shortlink-header h3 {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          margin: 0;
        }
        .badge-new {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          letter-spacing: 0.04em;
          background: #10b9811a;
          color: #059669;
          border: 1px solid #10b98166;
          border-radius: 9999px;
          padding: 0.15rem 0.45rem;
          font-weight: 700;
          line-height: 1;
        }
        .shortlink-subtitle {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }
        .shortlink-error {
          background: rgba(255, 0, 0, 0.06);
          border: 1px solid rgba(255, 0, 0, 0.2);
          color: #a40000;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
        }
        .shortlink-loading {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #555;
          font-size: 0.9rem;
        }
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }

        .shortlink-container {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem 0.6rem;
          background: #f9fafb;
          border: 1px dashed #e5e7eb;
          padding: 0.6rem 0.75rem;
          border-radius: 10px;
        }
        .shortlink-label {
          color: #374151;
          font-size: 0.95rem;
        }
        .shortlink-url {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          color: #6b2fa5;
          text-decoration: none;
          word-break: break-all;
        }
        .shortlink-url:hover {
          text-decoration: underline;
        }
        .copy-shortlink-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .copy-shortlink-btn:hover {
          background: #f3f4f6;
        }

        .shortlink-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .create-shortlink-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #6b2fa5, #8a4bd6);
          color: #fff;
          border: none;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.06s ease, opacity 0.2s ease;
          width: fit-content;
        }
        .create-shortlink-btn:hover:not(:disabled) { 
          transform: translateY(-1px); 
        }
        .create-shortlink-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Responsive tweaks */
        @media (max-width: 640px) {
          .shortlink-container {
            font-size: 0.9rem;
          }
        }

        /* Screen reader utility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  )
}

export default OverviewTab
export { OverviewTabSkeleton }
