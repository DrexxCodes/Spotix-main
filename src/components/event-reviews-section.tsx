"use client"

import { useState, useEffect } from "react"
import { ref, onValue, off, set } from "firebase/database"
import { realtimeDb, auth } from "../services/firebase"
import { Star, Heart, MessageCircle, User } from "lucide-react"
import "../pages/event-reviews-section.css"

interface EventRating {
  rating: number
  comment?: string
  timestamp: number
  eventName: string
  userDisplayName: string
  userId: string
}

interface CommentLike {
  userId: string
  timestamp: number
}

interface EventReviewsSectionProps {
  eventId: string
  eventName: string
  eventEndDate: string
  eventEnd?: string
  hasEventEnded: boolean
  isAuthenticated: boolean
}

// Review Skeleton Component
const ReviewSkeleton = () => (
  <div className="review-skeleton">
    <div className="review-skeleton-header">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-info">
        <div className="skeleton-name"></div>
        <div className="skeleton-date"></div>
      </div>
      <div className="skeleton-rating"></div>
    </div>
    <div className="skeleton-comment"></div>
    <div className="skeleton-actions"></div>
  </div>
)

const EventReviewsSection = ({
  eventId,
  eventName,
  eventEndDate,
  eventEnd,
  hasEventEnded,
  isAuthenticated,
}: EventReviewsSectionProps) => {
  const [reviews, setReviews] = useState<Record<string, EventRating>>({})
  const [commentLikes, setCommentLikes] = useState<Record<string, Record<string, CommentLike>>>({})
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [likingComments, setLikingComments] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }

    // Listen for reviews
    const reviewsRef = ref(realtimeDb, `eventRatings/${eventId}`)
    const reviewsUnsubscribe = onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        const reviewsData = snapshot.val()
        setReviews(reviewsData)
      } else {
        setReviews({})
      }
      setLoading(false)
    })

    // Listen for comment likes
    const likesRef = ref(realtimeDb, `commentLikes/${eventId}`)
    const likesUnsubscribe = onValue(likesRef, (snapshot) => {
      if (snapshot.exists()) {
        const likesData = snapshot.val()
        setCommentLikes(likesData)

        // Update user likes status
        const user = auth.currentUser
        if (user) {
          const userLikesStatus: Record<string, boolean> = {}
          Object.keys(likesData).forEach((userId) => {
            userLikesStatus[userId] = !!likesData[userId][user.uid]
          })
          setUserLikes(userLikesStatus)
        }
      } else {
        setCommentLikes({})
        setUserLikes({})
      }
    })

    return () => {
      off(reviewsRef)
      off(likesRef)
    }
  }, [eventId])

  const handleLikeComment = async (reviewUserId: string) => {
    const user = auth.currentUser
    if (!user) return

    setLikingComments((prev) => ({ ...prev, [reviewUserId]: true }))

    try {
      const likeRef = ref(realtimeDb, `commentLikes/${eventId}/${reviewUserId}/${user.uid}`)
      const isCurrentlyLiked = userLikes[reviewUserId]

      if (isCurrentlyLiked) {
        // Remove like
        await set(likeRef, null)
      } else {
        // Add like
        await set(likeRef, {
          userId: user.uid,
          timestamp: Date.now(),
        })
      }

      // Update local state immediately for better UX
      setUserLikes((prev) => ({
        ...prev,
        [reviewUserId]: !isCurrentlyLiked,
      }))
    } catch (error) {
      console.error("Error liking comment:", error)
    } finally {
      setLikingComments((prev) => ({ ...prev, [reviewUserId]: false }))
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="review-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={16} className={`star ${star <= rating ? "filled" : ""}`} />
        ))}
      </div>
    )
  }

  const getCommentLikeCount = (userId: string) => {
    return Object.keys(commentLikes[userId] || {}).length
  }

  const formatEventEndDate = () => {
    if (!eventEndDate) return "the event ends"

    const endDate = new Date(eventEndDate)
    const formattedDate = endDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    if (eventEnd) {
      return `${formattedDate} at ${eventEnd}`
    }

    return formattedDate
  }

  const reviewsArray = Object.entries(reviews).map(([userId, review]) => ({
      ...review,
      userId,
    }))

  return (
    <div className="event-reviews-section">
      <div className="reviews-header">
        <MessageCircle className="reviews-icon" />
        <h2 className="reviews-title">What people said about the event</h2>
      </div>

      {loading ? (
        <div className="reviews-loading">
          {[...Array(3)].map((_, index) => (
            <ReviewSkeleton key={index} />
          ))}
        </div>
      ) : !hasEventEnded ? (
        <div className="event-not-ended-message">
          <div className="message-content">
            <MessageCircle className="message-icon" />
            <p className="message-text">
              Oh, <strong>{eventName}</strong> is yet to have occurred so there's no rating yet. Check back at{" "}
              <strong>{formatEventEndDate()}</strong>.
            </p>
          </div>
        </div>
      ) : reviewsArray.length === 0 ? (
        <div className="no-reviews-message">
          <div className="message-content">
            <Star className="message-icon" />
            <p className="message-text">
              No reviews yet for <strong>{eventName}</strong>. Be the first to share your experience!
            </p>
          </div>
        </div>
      ) : (
        <div className="reviews-list">
          {reviewsArray
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((review) => (
              <div key={review.userId} className="review-item">
                <div className="review-header">
                  <div className="reviewer-info">
                    <div className="reviewer-avatar">
                      <User className="avatar-icon" />
                    </div>
                    <div className="reviewer-details">
                      <h4 className="reviewer-name">{review.userDisplayName}</h4>
                      <p className="review-date">{formatDate(review.timestamp)}</p>
                    </div>
                  </div>
                  <div className="review-rating">
                    {renderStars(review.rating)}
                    <span className="rating-number">({review.rating})</span>
                  </div>
                </div>

                {review.comment && (
                  <div className="review-comment">
                    <p>{review.comment}</p>
                  </div>
                )}

                <div className="review-actions">
                  {isAuthenticated && (
                    <button
                      className={`like-button ${userLikes[review.userId] ? "liked" : ""}`}
                      onClick={() => handleLikeComment(review.userId)}
                      disabled={likingComments[review.userId]}
                    >
                      <Heart className={`like-icon ${userLikes[review.userId] ? "filled" : ""}`} size={16} />
                      <span className="like-count">{getCommentLikeCount(review.userId)}</span>
                    </button>
                  )}
                  {!isAuthenticated && getCommentLikeCount(review.userId) > 0 && (
                    <div className="like-display">
                      <Heart className="like-icon" size={16} />
                      <span className="like-count">{getCommentLikeCount(review.userId)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default EventReviewsSection
