"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, X, HelpCircle, AlertCircle, Ticket } from "lucide-react"
import "./AddPricing.css"

interface TicketType {
  policy: string
  price: string
  description: string
  availableTickets: string
}

interface AddPricingProps {
  enablePricing: boolean
  setEnablePricing: (enabled: boolean) => void
  ticketPrices: TicketType[]
  setTicketPrices: (tickets: TicketType[]) => void
}

const AddPricing: React.FC<AddPricingProps> = ({ enablePricing, setEnablePricing, ticketPrices, setTicketPrices }) => {
  const [errorMessage, setErrorMessage] = useState("")

  // Initialize with one empty ticket if pricing is enabled and no tickets exist
  useEffect(() => {
    if (enablePricing && ticketPrices.length === 0) {
      setTicketPrices([{ policy: "", price: "", description: "", availableTickets: "" }])
    }
  }, [enablePricing, ticketPrices.length, setTicketPrices])

  // Clear error message when pricing is disabled
  useEffect(() => {
    if (!enablePricing) {
      setErrorMessage("")
    }
  }, [enablePricing])

  const handlePricingToggle = () => {
    const newEnablePricing = !enablePricing
    setEnablePricing(newEnablePricing)

    if (!newEnablePricing) {
      // When disabling pricing, clear all tickets (event becomes free)
      setTicketPrices([])
      setErrorMessage("")
    } else {
      // When enabling pricing, start with one empty ticket
      setTicketPrices([{ policy: "", price: "", description: "", availableTickets: "" }])
    }
  }

  const validateFreeTickets = (tickets: TicketType[]) => {
    const freeTickets = tickets.filter(
      (ticket) =>
        ticket.policy.trim() && (ticket.price === "" || ticket.price === "0" || Number.parseFloat(ticket.price) === 0),
    )

    if (freeTickets.length > 1) {
      setErrorMessage("Only one ticket type can be set as free when pricing is enabled.")
      return false
    } else {
      setErrorMessage("")
      return true
    }
  }

  const updateTicket = (index: number, field: keyof TicketType, value: string) => {
    const newTickets = [...ticketPrices]
    newTickets[index][field] = value
    setTicketPrices(newTickets)

    // Validate free tickets when price changes
    if (field === "price" || field === "policy") {
      validateFreeTickets(newTickets)
    }
  }

  const addTicketType = () => {
    const newTickets = [...ticketPrices, { policy: "", price: "", description: "", availableTickets: "" }]
    setTicketPrices(newTickets)
  }

  const removeTicketType = (index: number) => {
    if (ticketPrices.length > 1) {
      const newTickets = ticketPrices.filter((_, i) => i !== index)
      setTicketPrices(newTickets)
      validateFreeTickets(newTickets)
    }
  }

  const isTicketFree = (price: string) => {
    return price === "" || price === "0" || Number.parseFloat(price) === 0
  }

  const formatNumber = (num: string) => {
    const number = Number.parseInt(num)
    return isNaN(number) ? 0 : number.toLocaleString()
  }

  return (
    <div className="add-pricing-container">
      <div className="pricing-header">
        <h3>Event Pricing</h3>
        <div className="pricing-toggle">
          <label className="toggle-label">
            Enable Pricing
            <div className="switch">
              <input type="checkbox" checked={enablePricing} onChange={handlePricingToggle} />
              <span className="slider round"></span>
            </div>
          </label>
          <span className="help-icon" title="Toggle this to set ticket prices for your event">
            <HelpCircle size={16} />
          </span>
        </div>
      </div>

      {!enablePricing && (
        <div className="free-event-notice">
          <div className="free-badge">FREE EVENT</div>
          <p>Your event is set as free. Attendees can get tickets without payment.</p>
        </div>
      )}

      {enablePricing && (
        <div className="pricing-content">
          <div className="pricing-info">
            <p>
              Configure your ticket types and prices. You can have multiple ticket types, but only <strong>one</strong>{" "}
              can be set as free. Set availability limits to control how many tickets of each type can be sold.
            </p>
          </div>

          {errorMessage && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="ticket-types-container">
            {ticketPrices.map((ticket, index) => (
              <div key={index} className="ticket-type-card">
                <div className="ticket-card-header">
                  <h4>Ticket Type {index + 1}</h4>
                  {ticketPrices.length > 1 && (
                    <button
                      type="button"
                      className="remove-ticket-btn"
                      onClick={() => removeTicketType(index)}
                      title="Remove this ticket type"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="ticket-form-row">
                  <div className="form-group">
                    <label>Ticket Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Early Bird, VIP, General Admission"
                      value={ticket.policy}
                      onChange={(e) => updateTicket(index, "policy", e.target.value)}
                      required={enablePricing}
                      className="ticket-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Price (₦) *
                      {isTicketFree(ticket.price) && ticket.policy.trim() && (
                        <span className="free-ticket-badge">FREE</span>
                      )}
                    </label>
                    <input
                      type="number"
                      placeholder="0 for free ticket"
                      value={ticket.price}
                      onChange={(e) => updateTicket(index, "price", e.target.value)}
                      required={enablePricing && !isTicketFree(ticket.price)}
                      min="0"
                      step="0.01"
                      className="ticket-input"
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="form-group">
                    <label>
                      <Ticket size={16} />
                      Available Tickets
                    </label>
                    <input
                      type="number"
                      placeholder="Number of tickets available (optional)"
                      value={ticket.availableTickets}
                      onChange={(e) => updateTicket(index, "availableTickets", e.target.value)}
                      min="1"
                      className="ticket-input"
                    />
                    {ticket.availableTickets && (
                      <div className="availability-info">
                        <span className="availability-count">
                          {formatNumber(ticket.availableTickets)} tickets available
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Ticket Description</label>
                  <textarea
                    placeholder="Describe what this ticket includes, benefits, or restrictions..."
                    value={ticket.description}
                    onChange={(e) => updateTicket(index, "description", e.target.value)}
                    className="ticket-description"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="add-ticket-btn" onClick={addTicketType} disabled={!!errorMessage}>
            <Plus size={16} />
            Add Another Ticket Type
          </button>

          <div className="pricing-summary">
            <h4>Pricing Summary</h4>
            <div className="summary-content">
              {ticketPrices
                .filter((t) => t.policy.trim())
                .map((ticket, index) => (
                  <div key={index} className="summary-item">
                    <div className="summary-ticket-info">
                      <span className="ticket-name">{ticket.policy}</span>
                      <span className="ticket-price">
                        {isTicketFree(ticket.price)
                          ? "FREE"
                          : `₦${Number.parseFloat(ticket.price || "0").toLocaleString()}`}
                      </span>
                    </div>
                    <div className="summary-availability">
                      <Ticket size={14} />
                      <span>
                        {ticket.availableTickets
                          ? `${formatNumber(ticket.availableTickets)} available`
                          : "No limit set"}
                      </span>
                    </div>
                  </div>
                ))}
              {ticketPrices.filter((t) => t.policy.trim()).length === 0 && (
                <p className="no-tickets">No ticket types configured yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddPricing
