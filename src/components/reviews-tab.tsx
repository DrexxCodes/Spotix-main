"use client"

import type React from "react"
import EventReviews from "./event-reviews-section"
import Review from "./review"

interface ReviewsTabProps {
  eventId: string
  eventName: string
  eventEndDate: string
  eventEnd: string
  hasEventEnded: boolean
  isAuthenticated: boolean
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({
  eventId,
  eventName,
  eventEndDate,
  eventEnd,
  hasEventEnded,
  isAuthenticated,
}) => {
  return (
    <div className="reviews-tab">
      <h2>Event Reviews</h2>

      <EventReviews
        eventId={eventId}
        eventName={eventName}
        eventEndDate={eventEndDate}
        eventEnd={eventEnd}
        hasEventEnded={hasEventEnded}
        isAuthenticated={isAuthenticated}
      />

      {hasEventEnded && <Review eventId={eventId} eventName={eventName} />}
    </div>
  )
}

export default ReviewsTab
