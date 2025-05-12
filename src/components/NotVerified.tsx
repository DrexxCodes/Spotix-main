"use client"

import { useEffect, useState } from "react"
import { auth } from "../services/firebase"
import { sendEmailVerification } from "firebase/auth"

const NotVerified = () => {
  const [shouldShowBanner, setShouldShowBanner] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const user = auth.currentUser
    if (user && !user.emailVerified) {
      setShouldShowBanner(true)
    }
  }, [])

  const handleSendVerification = async () => {
    const user = auth.currentUser
    if (user && !user.emailVerified) {
      try {
        setSending(true)
        await sendEmailVerification(user)
        alert("Verification email sent!")
      } catch (error) {
        console.error("Error sending verification email:", error)
        alert("Failed to send verification email.")
      } finally {
        setSending(false)
      }
    }
  }

  if (!shouldShowBanner) return null

  return (
    <div style={styles.banner}>
      <span>
        Hello, your email isn't verified yet.{" "}
        <button onClick={handleSendVerification} style={styles.link} disabled={sending}>
          Click here
        </button>{" "}
        to send verification link.
      </span>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  banner: {
    width: "100%",
    padding: "1rem",
    backgroundColor: "#6b2fa5",
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "1rem",
  },
  link: {
    color: "#ffdf5e",
    textDecoration: "underline",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  },
}

export default NotVerified