"use client"

import { useEffect, useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { auth } from "./services/firebase"
import { onAuthStateChanged, type User } from "firebase/auth"
import LandingPage from "./pages/Landing"
import Login from "./pages/login"
import Signup from "./pages/signup"
import Home from "./pages/home"
import ForgotPassword from "./pages/forgot-password"
import AdminPermissions from "./pages/AdminPermissions"
import AdminRoute from "./components/AdminRoute"
import AdminSuite from "./pages/AdminSuite"
import BookerRole from "./pages/bookerRole"
import CreateEvent from "./pages/createEvent"
import Success from "./pages/success"
import Event from "./pages/event"
import Payment from "./pages/Payment"
import PaystackSuccess from "./pages/paystack-success"
import UserProfile from "./pages/Profile"
import BookerConfirm from "./pages/bookerConfirm"
import LoginBooker from "./pages/LoginBooker"
import NotFound from "./pages/notfound"
import BookerRoute from "./components/BookerRoute"
import Preloader from "./components/preloader"
import BookerProfile from "./pages/BookerProfile"
import BookerDashboard from "./pages/BookerDashboard"
import BookerTickets from "./pages/BookerTickets"
import BookerTicketInfo from "./pages/BookerTicketInfo"
import VerifyTicket from "./pages/VerifyTicket"
import Verification from "./pages/Verification"
import "./App.css"
import TicketHistory from "./pages/ticketHistory"
import TicketHistoryInfo from "./pages/ticketHistoryInfo"

declare global {
  interface Window {
    Tawk_API?: any
  }
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const script = document.createElement("script")
    script.async = true
    script.src = "https://embed.tawk.to/67f231fc2dd176190b3b2db3/1io516hc0"
    script.charset = "UTF-8"
    script.setAttribute("crossorigin", "*")
    document.body.appendChild(script)

    script.onload = () => {
      // Initialize Tawk_API if it doesn't exist
      if (!window.Tawk_API) {
        window.Tawk_API = {}
      }

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser && currentUser.email && window.Tawk_API) {
          window.Tawk_API.visitor = {
            name: currentUser.displayName || "Spotix User",
            email: currentUser.email,
          }
        }
        setUser(currentUser)
        setLoading(false)
      })

      return () => unsubscribe()
    }

    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  if (loading) return <Preloader />


  return (
    <Router>
      <Routes>
        {/* Public routes - accessible regardless of authentication state */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/home" /> : <Signup />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/home" /> : <ForgotPassword />} />
        <Route path="/LoginBooker" element={<LoginBooker />} />
        {/* Protected routes - require authentication */}
        <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/bookerRole" element={user ? <BookerRole /> : <Navigate to="/login" />} />
        <Route path="/Profile" element={user ? <UserProfile /> : <Navigate to="/login" />} />
        <Route path="/event/:uid/:id" element={user ? <Event /> : <Navigate to="/login" />} />
        <Route path="/booker-confirm" element={user ? <BookerConfirm /> : <Navigate to="/login" />} />
        <Route path="/payment" element={user ? <Payment /> : <Navigate to="/login" />} />
        <Route path="/paystack-success" element={user ? <PaystackSuccess /> : <Navigate to="/login" />} />{" "}
        <Route path="/ticket-history" element={user ? <TicketHistory /> : <Navigate to="/login" />} />
        <Route path="/ticket-info/:id" element={user ? <TicketHistoryInfo /> : <Navigate to="/login" />} />
        {/* Booker-only routes */}
        <Route
          path="/createEvent"
          element={
            user ? (
              <BookerRoute>
                <CreateEvent />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/success"
          element={
            user ? (
              <BookerRoute>
                <Success />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/bookerprofile"
          element={
            user ? (
              <BookerRoute>
                <BookerProfile />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/bookerdashboard"
          element={
            user ? (
              <BookerRoute>
                <BookerDashboard />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/bookertickets"
          element={
            user ? (
              <BookerRoute>
                <BookerTickets />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/bookerticketinfo/:id"
          element={
            user ? (
              <BookerRoute>
                <BookerTicketInfo />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/verifyticket"
          element={
            user ? (
              <BookerRoute>
                <VerifyTicket />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/verification"
          element={
            user ? (
              <BookerRoute>
                <Verification />
              </BookerRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

<Route
          path="/admin"
          element={
            user ? (
              <AdminRoute>
                <AdminSuite />
              </AdminRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

<Route
          path="/admin-permissions"
          element={
            user ? (
              <AdminRoute>
                <AdminPermissions />
              </AdminRoute>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        {/* 404 route - must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App
