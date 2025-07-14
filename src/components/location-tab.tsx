"use client"

import type React from "react"
import { MapPin } from "lucide-react"

interface LocationTabProps {
  eventVenue: string
  eventName: string
}

const LocationTab: React.FC<LocationTabProps> = ({ eventVenue, eventName }) => {
  const handleOpenMaps = () => {
    const encodedVenue = encodeURIComponent(eventVenue)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedVenue}`
    window.open(mapsUrl, "_blank")
  }

  return (
    <div className="location-tab">
      <div className="location-header">
        <MapPin size={24} className="location-icon" />
        <h2>Event Location</h2>
      </div>

      <div className="location-content">
        <div className="venue-card">
          <div className="venue-info">
            <h3>Venue</h3>
            <p className="venue-address">{eventVenue}</p>
          </div>

          <div className="location-actions">
            <button onClick={handleOpenMaps} className="maps-button">
              <MapPin size={16} />
              Open in Maps
            </button>
          </div>
        </div>

        <div className="location-note">
          <p>
            <strong>Note:</strong> Please arrive at the venue on time. Check the event details for specific timing
            information.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LocationTab
