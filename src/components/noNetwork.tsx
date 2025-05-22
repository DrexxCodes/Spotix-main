"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"

const NoNetwork = ({ retry }: { retry: () => void }) => {
  const [show, setShow] = useState(false)

  // This component should be controlled externally by parent logic when Firestore fails due to timeout.
  // So the parent sets 'show' via props. Here we simulate a quick display logic (optional).
  useEffect(() => {
    // Optional delay in showing in case of retry or short disconnect
    const timeout = setTimeout(() => {
      setShow(true)
    }, 500) // Delay before showing the alert

    return () => clearTimeout(timeout)
  }, [])

  if (!show) return null

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <AlertTriangle size={20} style={styles.icon} />
        <span style={styles.text}>
          Poor network detected. Unable to load events.
        </span>
      </div>
      <button onClick={retry} style={styles.refreshButton} aria-label="Retry loading">
        <RefreshCcw size={18} />
      </button>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#6b2fa5",
    color: "#fff",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    margin: "1rem auto",
    width: "95%",
    maxWidth: "700px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  icon: {
    color: "#ffdf5e",
  },
  text: {
    fontWeight: 500,
    fontSize: "0.95rem",
  },
  refreshButton: {
    backgroundColor: "#fff",
    color: "#6b2fa5",
    border: "none",
    borderRadius: "50%",
    padding: "0.35rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}

export default NoNetwork
