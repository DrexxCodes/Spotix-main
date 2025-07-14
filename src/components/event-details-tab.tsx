"use client"

import type React from "react"
import { formatNumber } from "../utils/formatters"
import ShareBtn from "./shareBtn" // Declare the ShareBtn variable

interface EventDetailsTabProps {
  eventData: {
    eventName: string
    eventType: string
    eventDate: string
    eventEndDate: string
    eventStart: string
    eventEnd: string
    enableMaxSize?: boolean
    maxSize?: string
    ticketsSold?: number
    enableColorCode?: boolean
    colorCode?: string
    eventDescription?: string
    allowAgents?: boolean
  }
  eventUrl: string
  isLiked: boolean
  likeCount: number
  isLiking: boolean
  isSoldOut: boolean
  onToggleLike: () => void
}

const EventDetailsTab: React.FC<EventDetailsTabProps> = ({
  eventData,
  eventUrl,
  isLiked,
  likeCount,
  isLiking,
  isSoldOut,
  onToggleLike,
}) => {
  return (
    <div className="event-details-tab">
      <h1 className="event-title">{eventData.eventName}</h1>

      <div className="event-actions-container">
        <div className="event-share-container">
          <ShareBtn url={eventUrl} title={`Join me at ${eventData.eventName}`} />
        </div>

        <div className="event-like-container">
          <button className={`event-like-button ${isLiked ? "liked" : ""}`} onClick={onToggleLike} disabled={isLiking}>
            {isLiked ? <i className="bx bxs-heart like-icon"></i> : <i className="bx bx-heart like-icon"></i>}
            <span className="like-count">{formatNumber(likeCount)}</span>
          </button>
        </div>
      </div>

      <div className="detail-row">
        <span className="detail-label">Event Type:</span>
        <span className="detail-value">{eventData.eventType}</span>
      </div>

      <div className="detail-row">
        <span className="detail-label">Start Date:</span>
        <span className="detail-value">
          {new Date(eventData.eventDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="detail-row">
        <span className="detail-label">Start Time:</span>
        <span className="detail-value">{eventData.eventStart || "Not specified"}</span>
      </div>

      <div className="detail-row">
        <span className="detail-label">End Date:</span>
        <span className="detail-value">
          {eventData.eventEndDate
            ? new Date(eventData.eventEndDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Not specified"}
        </span>
      </div>

      <div className="detail-row">
        <span className="detail-label">End Time:</span>
        <span className="detail-value">{eventData.eventEnd || "Not specified"}</span>
      </div>

      {eventData.enableMaxSize && eventData.maxSize && (
        <div className="detail-row">
          <span className="detail-label">Maximum Attendees:</span>
          <span className="detail-value">
            {formatNumber(eventData.ticketsSold || 0)} / {formatNumber(Number.parseInt(eventData.maxSize))}
            {isSoldOut && <span className="sold-out-badge">SOLD OUT</span>}
          </span>
        </div>
      )}

      {eventData.enableColorCode && eventData.colorCode && (
        <div className="detail-row">
          <span className="detail-label">Event Color:</span>
          <span className="detail-value">
            <span className="color-preview" style={{ backgroundColor: eventData.colorCode }}></span>
            {eventData.colorCode}
          </span>
        </div>
      )}

      {eventData.eventDescription && (
        <div className="event-description">
          <h3>Description</h3>
          <p>{eventData.eventDescription}</p>
          <div className="detail-row">
            <span className="detail-label">Agent Activity:</span>
            <span className="detail-value">
              {eventData.allowAgents ? (
                <span className="agent-status enabled">Enabled - Agents can sell tickets for this event</span>
              ) : (
                <span className="agent-status disabled">Disabled - Only organizer can sell tickets</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventDetailsTab
