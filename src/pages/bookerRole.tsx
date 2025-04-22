"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "../styles/role.css"

const BookerRole = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleBecomeBooker = () => {
    setLoading(true)
    // Simulate a loading delay before redirecting
    setTimeout(() => {
      setLoading(false)
      navigate("/booker-confirm")
    }, 1500)
  }

  return (
    <>
      <UserHeader />
      <Preloader loading={loading} />
      <div className="booker-role-container">
        <img src="/notBooker.svg" alt="Not a Booker" className="not-booker-image" />
        <h2>You're Not a Booker Yet</h2>
        <p>
          Only bookers can create events and manage analytics. You're currently a regular user, but you can easily level
          up to become a booker and start creating your own events!
        </p>
        <button className="become-booker-button" onClick={handleBecomeBooker}>
          Become a Booker
        </button>
      </div>
      <Footer />
    </>
  )
}

export default BookerRole

