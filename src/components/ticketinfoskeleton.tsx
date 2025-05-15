import type React from "react"
import "./ticket-info-skeleton.css"

const TicketInfoSkeleton: React.FC = () => {
  return (
    <div className="ticket-info-skeleton">
      <div className="ticket-info-header-skeleton">
        <div className="ticket-title-skeleton"></div>
        <div className="ticket-subtitle-skeleton"></div>
      </div>

      <div className="ticket-details-skeleton">
        <div className="ticket-detail-item-skeleton">
          <div className="detail-label-skeleton"></div>
          <div className="detail-value-skeleton"></div>
        </div>
        <div className="ticket-detail-item-skeleton">
          <div className="detail-label-skeleton"></div>
          <div className="detail-value-skeleton"></div>
        </div>
        <div className="ticket-detail-item-skeleton">
          <div className="detail-label-skeleton"></div>
          <div className="detail-value-skeleton"></div>
        </div>
      </div>

      <div className="ticket-actions-skeleton">
        <div className="action-button-skeleton"></div>
        <div className="action-button-skeleton"></div>
      </div>

      <div className="ticket-qr-skeleton">
        <div className="qr-code-skeleton"></div>
        <div className="qr-label-skeleton"></div>
      </div>
    </div>
  )
}

export default TicketInfoSkeleton
