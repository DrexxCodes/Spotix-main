"use client"

import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../services/firebase"

const LoginBooker = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Query Firestore for the user with the provided email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setError("No account found with this email")
        setLoading(false)
        return
      }

      // Get the user document
      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // Check if user is a booker
      if (!userData.isBooker) {
        setError("This account is not registered as a booker")
        setLoading(false)
        return
      }

      // Verify the booker password
      if (userData.bookerPassword !== password) {
        setError("Incorrect password")
        setLoading(false)
        return
      }

      // Store booker info in localStorage for session management
      localStorage.setItem(
        "bookerUser",
        JSON.stringify({
          uid: userDoc.id,
          email: userData.email,
          username: userData.username,
          isBooker: true,
        }),
      )

      // Redirect to home page
      navigate("/BookerDashboard")
    } catch (error) {
      console.error("Error during booker login:", error)
      setError("An error occurred during login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="booker-login-container">
      <div className="booker-login-card">
        <div className="booker-logo-container">
          <img src="/logo.svg" alt="Spotix Logo" className="booker-logo" />
        </div>

        <h2 className="booker-login-title">Booker Login</h2>

        {error && <div className="booker-login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="booker-login-form">
          <div className="inputBox1">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <span className="user">Email</span>
          </div>

          <div className="inputBox">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <span>Password</span>
          </div>

          <button type="submit" className="booker-login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="booker-login-footer">
          <p>
            Not a booker yet? <a href="/profile">Become a Booker</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginBooker

