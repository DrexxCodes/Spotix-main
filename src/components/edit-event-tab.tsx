"use client"

import type React from "react"
import "./skeleton.css"

interface EditEventTabProps {
  editFormData: any
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleTicketPriceChange: (index: number, field: "policy" | "price", value: string) => void
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
          <h3>Pricing</h3>
          <div className="option-with-help switch-container">
            <label>
              Enable Pricing
              <div className="switch">
                <input
                  type="checkbox"
                  name="enablePricing"
                  checked={editFormData.enablePricing}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      enablePricing: e.target.checked,
                    })
                  }
                />
                <span className="slider round"></span>
              </div>
            </label>
          </div>

          {editFormData.enablePricing && (
            <>
              {editFormData.ticketPrices && editFormData.ticketPrices.length > 0 ? (
                editFormData.ticketPrices.map((ticket: any, index: number) => (
                  <div key={index} className="ticket-pricing-row">
                    <input
                      type="text"
                      placeholder="Ticket Type"
                      value={ticket.policy}
                      onChange={(e) => handleTicketPriceChange(index, "policy", e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={ticket.price}
                      onChange={(e) => handleTicketPriceChange(index, "price", e.target.value)}
                      required
                    />
                  </div>
                ))
              ) : (
                <div className="ticket-pricing-row">
                  <input
                    type="text"
                    placeholder="Ticket Type"
                    value=""
                    onChange={(e) => handleTicketPriceChange(0, "policy", e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value="0"
                    onChange={(e) => handleTicketPriceChange(0, "price", e.target.value)}
                    required
                  />
                </div>
              )}
              <button type="button" className="add-price-button" onClick={addTicketPrice}>
                + Add Ticket Type
              </button>
            </>
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
