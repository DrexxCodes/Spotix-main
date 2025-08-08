"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../services/firebase"
import Preloader from "../components/preloader"

const Discover = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resolveShortlink = async () => {
      if (!eventSlug) {
        setError("No event slug provided")
        setLoading(false)
        return
      }

      try {
        console.log("Resolving shortlink for slug:", eventSlug)
        
        // Look up the shortlink in the Links collection
        const linkDocRef = doc(db, "Links", eventSlug)
        const linkDoc = await getDoc(linkDocRef)

        if (!linkDoc.exists()) {
          console.log("Shortlink not found")
          setError("Shortlink not found")
          setLoading(false)
          return
        }

        const linkData = linkDoc.data()
        console.log("Shortlink data:", linkData)

        const { bookerId, eventId } = linkData

        if (!bookerId || !eventId) {
          console.log("Invalid shortlink data - missing bookerId or eventId")
          setError("Invalid shortlink")
          setLoading(false)
          return
        }

        // Redirect to the actual event page
        console.log(`Redirecting to /event/${bookerId}/${eventId}`)
        navigate(`/event/${bookerId}/${eventId}`, { replace: true })

      } catch (error) {
        console.error("Error resolving shortlink:", error)
        setError("Failed to resolve shortlink")
        setLoading(false)
      }
    }

    resolveShortlink()
  }, [eventSlug, navigate])

  if (loading) {
    return <Preloader loading={true} />
  }

  if (error) {
    return (
      <div className="discover-error">
        <div className="error-container">
          <h1>Shortlink Not Found</h1>
          <p>{error}</p>
          <button 
            className="home-button"
            onClick={() => navigate("/home")}
          >
            Go to Home
          </button>
        </div>

        <style>{`
          .discover-error {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f9fafb;
            padding: 1rem;
          }
          .error-container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
          }
          .error-container h1 {
            color: #374151;
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }
          .error-container p {
            color: #6b7280;
            margin-bottom: 1.5rem;
          }
          .home-button {
            background: linear-gradient(135deg, #6b2fa5, #8a4bd6);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.06s ease;
          }
          .home-button:hover {
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    )
  }

  return null
}

export default Discover
