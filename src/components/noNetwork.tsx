"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCcw, WifiOff } from "lucide-react"

interface NoNetworkProps {
  retry: () => void
  // Optional props to allow parent component to control visibility
  forceShow?: boolean
  customMessage?: string
}

const NoNetwork = ({ retry, forceShow = false, customMessage }: NoNetworkProps) => {
  const [show, setShow] = useState(forceShow)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Monitor network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Give a small delay before hiding to ensure connections are restored
      setTimeout(() => setShow(false), 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShow(true)
    }

    // Check network status immediately
    setIsOnline(navigator.onLine)

    // If forceShow is true, show regardless of network status
    if (forceShow) {
      setShow(true)
    } else {
      setShow(!navigator.onLine)
    }

    // Add event listeners for network status changes
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [forceShow])

  // Update show state when forceShow prop changes
  useEffect(() => {
    setShow(forceShow || !isOnline)
  }, [forceShow, isOnline])

  const handleRetry = async () => {
    setIsRefreshing(true)
    setRetryCount((prev) => prev + 1)

    try {
      await retry()
      // If retry is successful and we're online, hide after a short delay
      if (navigator.onLine) {
        setTimeout(() => setShow(false), 1000)
      }
    } catch (error) {
      console.error("Retry failed:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!show) return null

  return (
    <div className="network-error-container" style={styles.container}>
      <div style={styles.content}>
        {isOnline ? <AlertTriangle size={20} style={styles.icon} /> : <WifiOff size={20} style={styles.icon} />}
        <span style={styles.text}>
          {customMessage ||
            (isOnline
              ? "Connection issue. Spotix is unable to load data from server."
              : "No internet connection. Please check your network.")}
        </span>
      </div>
      <button
        onClick={handleRetry}
        style={{
          ...styles.refreshButton,
          ...(isRefreshing ? styles.refreshing : {}),
        }}
        disabled={isRefreshing}
        aria-label="Retry loading"
      >
        <RefreshCcw size={18} className={isRefreshing ? "rotating" : ""} />
      </button>

      {/* Add CSS for animations */}
      <style>{`
        .network-error-container {
          animation: slideDown 0.3s ease-out;
        }
        
        .rotating {
          animation: rotate 1s linear infinite;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @media (max-width: 480px) {
          .network-error-container {
            flex-direction: column;
            gap: 0.75rem;
            padding: 1rem;
          }
        }
      `}</style>
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
    transition: "all 0.3s ease",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexGrow: 1,
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
    transition: "transform 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  refreshing: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
}

export default NoNetwork
