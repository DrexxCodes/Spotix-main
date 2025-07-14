"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, X, HelpCircle, AlertCircle, Ticket } from "lucide-react"
import "./skeleton.css"

interface TicketType {
  policy: string
  price: string
  description?: string
  availableTickets?: string
}

interface EditEventTabProps {
  editFormData: any
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleTicketPriceChange: (index: number, field: keyof TicketType, value: string) => void
  addTicketPrice: () => void
  handleSubmitEdit: (e: React.FormEvent) => void
  setActiveTab: (tab: "overview" | "attendees" | "payouts" | "edit" | "discounts") => void
  setEditFormData: (data: any) => void
}

const EditEventTabSkeleton = () => (
  <div className="edit-tab">
    <div className="skeleton-text skeleton-title"></div>
    <form>
      <div className="event-section">
        <div className="skeleton-text skeleton-subtitle"></div>
        {[...Array(8)].map((_, i) => (
          <div key={i}>
            <div className="skeleton-text skeleton-label"></div>
            <div className="skeleton-input"></div>
          </div>
        ))}
      </div>

      <div className="event-section">
        <div className="skeleton-text skeleton-subtitle"></div>
        <div className="skeleton-switch"></div>
        <div className="skeleton-input"></div>
        <div className="skeleton-button"></div>
      </div>

      <div className="event-section">
        <div className="skeleton-text skeleton-subtitle"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-switch"></div>
        ))}
      </div>

      <div className="edit-actions">
        <div className="skeleton-button skeleton-button-large"></div>
        <div className="skeleton-button skeleton-button-large"></div>
      </div>
    </form>
  </div>
)

const EditEventTab: React.FC<EditEventTabProps> = ({
  editFormData,
  handleInputChange,
  handleTicketPriceChange,
  addTicketPrice,
  handleSubmitEdit,
  setActiveTab,
  setEditFormData,
}) => {
  const [errorMessage, setErrorMessage] = useState("")

  // Validate free tickets
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

  // Validate tickets when they change
  useEffect(() => {
    if (editFormData.enablePricing && editFormData.ticketPrices) {
      validateFreeTickets(editFormData.ticketPrices)
    }
  }, [editFormData.ticketPrices, editFormData.enablePricing])

  const handleTicketChange = (index: number, field: keyof TicketType, value: string) => {
    handleTicketPriceChange(index, field, value)

    // Validate after change
    if (field === "price" || field === "policy") {
      const updatedTickets = [...editFormData.ticketPrices]
      updatedTickets[index][field] = value
      validateFreeTickets(updatedTickets)
    }
  }

  const removeTicketType = (index: number) => {
    if (editFormData.ticketPrices && editFormData.ticketPrices.length > 1) {
      const newTickets = editFormData.ticketPrices.filter((_: any, i: number) => i !== index)
      setEditFormData({
        ...editFormData,
        ticketPrices: newTickets,
      })
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
    <div className="edit-tab">
      <h3>Edit Event</h3>
      <form onSubmit={handleSubmitEdit}>
        <div className="event-section">
          <h3>Event Bio-Data</h3>
          <label>Event Name</label>
          <input type="text" name="eventName" value={editFormData.eventName} onChange={handleInputChange} required />

          <label>Event Description</label>
          <textarea
            name="eventDescription"
            value={editFormData.eventDescription}
            onChange={handleInputChange}
            required
          ></textarea>

          <label>Event Date</label>
          <input
            type="datetime-local"
            name="eventDate"
            value={editFormData.eventDate}
            onChange={handleInputChange}
            required
          />

          <label>Event Venue</label>
          <input type="text" name="eventVenue" value={editFormData.eventVenue} onChange={handleInputChange} required />

          <label>Event Start Time</label>
          <input type="time" name="eventStart" value={editFormData.eventStart} onChange={handleInputChange} required />

          <label>Event End Date</label>
          <input
            type="date"
            name="eventEndDate"
            value={editFormData.eventEndDate}
            onChange={handleInputChange}
            required
          />

          <label>Event End Time</label>
          <input type="time" name="eventEnd" value={editFormData.eventEnd} onChange={handleInputChange} required />

          <label>Event Type</label>
          <select name="eventType" value={editFormData.eventType} onChange={handleInputChange} required>
            <option value="Night party">Night party</option>
            <option value="Concert">Concert</option>
            <option value="Conference">Conference</option>
            <option value="Workshop">Workshop</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="event-section">
          <h3>Event Pricing</h3>
          <div className="option-with-help switch-container">
            <label>
              Enable Pricing
              <div className="switch">
                <input
                  type="checkbox"
                  name="enablePricing"
                  checked={editFormData.enablePricing}
                  onChange={(e) => {
                    const enabled = e.target.checked
                    setEditFormData({
                      ...editFormData,
                      enablePricing: enabled,
                      ticketPrices:
                        enabled && (!editFormData.ticketPrices || editFormData.ticketPrices.length === 0)
                          ? [{ policy: "", price: "", description: "", availableTickets: "" }]
                          : enabled
                            ? editFormData.ticketPrices
                            : [],
                    })
                    if (!enabled) {
                      setErrorMessage("")
                    }
                  }}
                />
                <span className="slider round"></span>
              </div>
            </label>
            <span title="Toggle this to set ticket prices for your event">
              <HelpCircle size={16} />
            </span>
          </div>

          {!editFormData.enablePricing && (
            <div className="free-event-notice">
              <div className="free-badge">FREE EVENT</div>
              <p>Your event is set as free. Attendees can get tickets without payment.</p>
            </div>
          )}

          {editFormData.enablePricing && (
            <div className="pricing-content">
              <div className="pricing-info">
                <p>
                  Configure your ticket types and prices. You can have multiple ticket types, but only{" "}
                  <strong>one</strong> can be set as free. Set availability limits to control how many tickets of each
                  type can be sold.
                </p>
              </div>

              {errorMessage && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="ticket-types-container">
                {editFormData.ticketPrices && editFormData.ticketPrices.length > 0 ? (
                  editFormData.ticketPrices.map((ticket: TicketType, index: number) => (
                    <div key={index} className="ticket-type-card">
                      <div className="ticket-card-header">
                        <h4>Ticket Type {index + 1}</h4>
                        {editFormData.ticketPrices.length > 1 && (
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
                            onChange={(e) => handleTicketChange(index, "policy", e.target.value)}
                            required
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
                            onChange={(e) => handleTicketChange(index, "price", e.target.value)}
                            required
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
                            Available Tickets *
                          </label>
                          <input
                            type="number"
                            placeholder="Number of tickets available"
                            value={ticket.availableTickets || ""}
                            onChange={(e) => handleTicketChange(index, "availableTickets", e.target.value)}
                            required
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
                          value={ticket.description || ""}
                          onChange={(e) => handleTicketChange(index, "description", e.target.value)}
                          className="ticket-description"
                          rows={3}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="ticket-type-card">
                    <div className="ticket-card-header">
                      <h4>Ticket Type 1</h4>
                    </div>

                    <div className="ticket-form-row">
                      <div className="form-group">
                        <label>Ticket Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Early Bird, VIP, General Admission"
                          value=""
                          onChange={(e) => handleTicketChange(0, "policy", e.target.value)}
                          required
                          className="ticket-input"
                        />
                      </div>

                      <div className="form-group">
                        <label>Price (₦) *</label>
                        <input
                          type="number"
                          placeholder="0 for free ticket"
                          value="0"
                          onChange={(e) => handleTicketChange(0, "price", e.target.value)}
                          required
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
                          Available Tickets *
                        </label>
                        <input
                          type="number"
                          placeholder="Number of tickets available"
                          value=""
                          onChange={(e) => handleTicketChange(0, "availableTickets", e.target.value)}
                          required
                          min="1"
                          className="ticket-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Ticket Description</label>
                      <textarea
                        placeholder="Describe what this ticket includes, benefits, or restrictions..."
                        value=""
                        onChange={(e) => handleTicketChange(0, "description", e.target.value)}
                        className="ticket-description"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button type="button" className="add-ticket-btn" onClick={addTicketPrice} disabled={!!errorMessage}>
                <Plus size={16} />
                Add Another Ticket Type
              </button>

              <div className="pricing-summary">
                <h4>Pricing Summary</h4>
                <div className="summary-content">
                  {editFormData.ticketPrices &&
                    editFormData.ticketPrices
                      .filter((t: TicketType) => t.policy.trim())
                      .map((ticket: TicketType, index: number) => (
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
                  {(!editFormData.ticketPrices ||
                    editFormData.ticketPrices.filter((t: TicketType) => t.policy.trim()).length === 0) && (
                    <p className="no-tickets">No ticket types configured yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="event-section">
          <h3>Additional Settings</h3>

          <div className="option-row switch-container">
            <label>
              Enable Stop Date for Ticket Sales
              <div className="switch">
                <input
                  type="checkbox"
                  name="enableStopDate"
                  checked={editFormData.enableStopDate}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      enableStopDate: e.target.checked,
                    })
                  }
                />
                <span className="slider round"></span>
              </div>
            </label>
            {editFormData.enableStopDate && (
              <input
                type="datetime-local"
                name="stopDate"
                value={editFormData.stopDate}
                onChange={handleInputChange}
                required={editFormData.enableStopDate}
              />
            )}
          </div>

          <div className="option-row switch-container">
            <label>
              Enable Color Theme for Event
              <div className="switch">
                <input
                  type="checkbox"
                  name="enableColorCode"
                  checked={editFormData.enableColorCode}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      enableColorCode: e.target.checked,
                    })
                  }
                />
                <span className="slider round"></span>
              </div>
            </label>
            {editFormData.enableColorCode && (
              <input type="color" name="colorCode" value={editFormData.colorCode} onChange={handleInputChange} />
            )}
          </div>

          <div className="option-row switch-container">
            <label>
              Set Maximum Attendees
              <div className="switch">
                <input
                  type="checkbox"
                  name="enableMaxSize"
                  checked={editFormData.enableMaxSize}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      enableMaxSize: e.target.checked,
                    })
                  }
                />
                <span className="slider round"></span>
              </div>
            </label>
            {editFormData.enableMaxSize && (
              <input
                type="number"
                name="maxSize"
                value={editFormData.maxSize}
                onChange={handleInputChange}
                min="1"
                required={editFormData.enableMaxSize}
              />
            )}
          </div>
        </div>

        <div className="edit-actions">
          <button type="submit" className="save-button">
            Save Changes
          </button>
          <button type="button" className="cancel-button" onClick={() => setActiveTab("overview")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditEventTab
export { EditEventTabSkeleton }
