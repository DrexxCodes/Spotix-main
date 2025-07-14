"use client"

import type React from "react"
import { formatCurrency } from "../utils/formatters"
import { Ticket, AlertTriangle } from "lucide-react"

interface TicketType {
  policy: string
  price: number
  description?: string
  availableTickets?: number
  soldTickets?: number
}

interface BuyTicketTabProps {
  eventData: {
    isFree: boolean
    ticketPrices?: TicketType[]
    enableStopDate?: boolean
    stopDate?: string
  }
  isEventToday: boolean
  isEventPassed: boolean
  isSoldOut: boolean
  isSaleEnded: boolean
  onBuyTicket: (ticketType: string, ticketPrice: number | string) => void
  onShowPassedDialog: () => void
}

const BuyTicketTab: React.FC<BuyTicketTabProps> = ({
  eventData,
  isEventToday,
  isEventPassed,
  isSoldOut,
  isSaleEnded,
  onBuyTicket,
  onShowPassedDialog,
}) => {
  // Check if a specific ticket type is sold out
  const isTicketTypeSoldOut = (ticket: TicketType) => {
    if (!ticket.availableTickets) return false
    const soldCount = ticket.soldTickets || 0
    return soldCount >= ticket.availableTickets
  }

  // Get remaining tickets for a ticket type
  const getRemainingTickets = (ticket: TicketType) => {
    if (!ticket.availableTickets) return null
    const soldCount = ticket.soldTickets || 0
    return Math.max(0, ticket.availableTickets - soldCount)
  }

  // Check if all ticket types are sold out
  const areAllTicketTypesSoldOut = () => {
    if (!eventData.ticketPrices || eventData.ticketPrices.length === 0) return false
    return eventData.ticketPrices.every((ticket) => isTicketTypeSoldOut(ticket))
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  return (
    <div className="tickets-tab">
      <h2>Ticket Information</h2>

      {isEventToday && !isEventPassed && (
        <div className="event-today-message">Event is happening today! Grab your tickets now</div>
      )}

      {(isSoldOut || areAllTicketTypesSoldOut()) && (
        <div className="sold-out-message">This event is sold out! No more tickets are available.</div>
      )}

      {isSaleEnded && <div className="sale-ended-message">Ticket sales have ended for this event.</div>}

      {isEventPassed && <div className="event-passed-message">This event has already taken place.</div>}

      {eventData.enableStopDate && eventData.stopDate && !isSaleEnded && (
        <div className="ticket-sale-info">
          <p>Ticket sales end on: {new Date(eventData.stopDate).toLocaleString()}</p>
        </div>
      )}

      {eventData.isFree ? (
        <div className="free-event-section">
          <p className="free-tag">This is a free event</p>
          {isEventPassed ? (
            <button className="passed-btn" onClick={onShowPassedDialog}>
              Passed
            </button>
          ) : (
            <button
              className="get-ticket-btn"
              onClick={() => onBuyTicket("Free Admission", 0)}
              disabled={isSoldOut || isSaleEnded}
            >
              {isEventToday ? "Get Tickets Today" : "Get Free Ticket"}
            </button>
          )}
        </div>
      ) : (
        <div className="ticket-prices">
          <h3>Available Tickets:</h3>
          {Array.isArray(eventData.ticketPrices) && eventData.ticketPrices.length > 0 ? (
            <div className="tickets-grid">
              {eventData.ticketPrices.map((ticket, index) => {
                const isThisTicketSoldOut = isTicketTypeSoldOut(ticket)
                const remainingTickets = getRemainingTickets(ticket)
                const isLowStock = remainingTickets !== null && remainingTickets <= 10 && remainingTickets > 0

                return (
                  <div key={index} className={`ticket-card ${isThisTicketSoldOut ? "sold-out" : ""}`}>
                    <div className="ticket-header">
                      <h4 className="ticket-name">{ticket.policy}</h4>
                      <div className="ticket-price-display">
                        {ticket.price === 0 ? (
                          <span className="free-price">FREE</span>
                        ) : (
                          <span className="price">{formatCurrency(Number.parseFloat(String(ticket.price)))}</span>
                        )}
                      </div>
                    </div>

                    {ticket.description && (
                      <div className="ticket-description">
                        <p>{ticket.description}</p>
                      </div>
                    )}

                    <div className="ticket-availability">
                      {remainingTickets !== null && (
                        <div className={`availability-info ${isLowStock ? "low-stock" : ""}`}>
                          <Ticket size={14} />
                          <span>
                            {isThisTicketSoldOut ? (
                              <span className="sold-out-text">Sold Out</span>
                            ) : (
                              <>
                                {formatNumber(remainingTickets)} of {formatNumber(ticket.availableTickets!)} remaining
                                {isLowStock && <AlertTriangle size={14} className="low-stock-icon" />}
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="ticket-actions">
                      {isEventPassed ? (
                        <button className="passed-btn" onClick={onShowPassedDialog}>
                          Passed
                        </button>
                      ) : (
                        <button
                          className={`buy-ticket-btn ${isThisTicketSoldOut ? "sold-out-btn" : ""}`}
                          onClick={() => onBuyTicket(ticket.policy, ticket.price)}
                          disabled={isSoldOut || isSaleEnded || isThisTicketSoldOut}
                        >
                          {isThisTicketSoldOut ? "Sold Out" : isEventToday ? "Get Tickets Today" : "Buy Ticket"}
                        </button>
                      )}
                    </div>

                    {isLowStock && !isThisTicketSoldOut && (
                      <div className="low-stock-warning">
                        <AlertTriangle size={16} />
                        <span>Only {remainingTickets} tickets left!</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p>No ticket pricing information available for this event.</p>
          )}
        </div>
      )}

      <style>{`
        .tickets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .ticket-card {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .ticket-card:hover:not(.sold-out) {
          border-color: #6b2fa5;
          box-shadow: 0 8px 25px rgba(107, 47, 165, 0.15);
          transform: translateY(-2px);
        }

        .ticket-card.sold-out {
          background: #f7fafc;
          border-color: #cbd5e0;
          opacity: 0.7;
        }

        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .ticket-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0;
        }

        .ticket-price-display {
          text-align: right;
        }

        .price {
          font-size: 1.5rem;
          font-weight: 700;
          color: #6b2fa5;
        }

        .free-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: #48bb78;
          background: #f0fff4;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          border: 2px solid #48bb78;
        }

        .ticket-description {
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #6b2fa5;
        }

        .ticket-description p {
          margin: 0;
          color: #4a5568;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .ticket-availability {
          margin-bottom: 1rem;
        }

        .availability-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #718096;
          font-size: 0.875rem;
        }

        .availability-info.low-stock {
          color: #d69e2e;
          font-weight: 500;
        }

        .sold-out-text {
          color: #e53e3e;
          font-weight: 600;
        }

        .low-stock-icon {
          color: #d69e2e;
        }

        .ticket-actions {
          margin-top: 1rem;
        }

        .buy-ticket-btn {
          width: 100%;
          background: #6b2fa5;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .buy-ticket-btn:hover:not(:disabled) {
          background: #553c9a;
          transform: translateY(-1px);
        }

        .buy-ticket-btn:disabled,
        .sold-out-btn {
          background: #a0aec0;
          cursor: not-allowed;
          transform: none;
        }

        .low-stock-warning {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.5rem;
          background: #fef5e7;
          border: 1px solid #f6e05e;
          border-radius: 6px;
          color: #d69e2e;
          font-size: 0.875rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .tickets-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .ticket-card {
            padding: 1rem;
          }

          .ticket-header {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .ticket-price-display {
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}

export default BuyTicketTab
