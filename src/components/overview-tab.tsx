"use client"

import type React from "react"
import { Suspense, lazy } from "react"
import { Copy, Check } from "lucide-react"
import "./skeleton.css"

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
    </div>
  )
}

export default OverviewTab
export { OverviewTabSkeleton }
