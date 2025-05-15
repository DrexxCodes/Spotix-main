"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { auth } from "./services/firebase"
import { onAuthStateChanged, type User } from "firebase/auth"
import Preloader from "./components/preloader"
import AdminRoute from "./components/AdminRoute"
import BookerRoute from "./components/BookerRoute"
import RouteStyleManager from "./components/RouteStyleManager"
import "./App.css"

// Lazy load all page components
const LandingPage = lazy(() => import("./pages/Landing"))
const Login = lazy(() => import("./pages/login"))
const Signup = lazy(() => import("./pages/signup"))
const Home = lazy(() => import("./pages/home"))
const ForgotPassword = lazy(() => import("./pages/forgot-password"))
const AdminPermissions = lazy(() => import("./pages/AdminPermissions"))
const AdminSuite = lazy(() => import("./pages/AdminSuite"))
const BookerRole = lazy(() => import("./pages/bookerRole"))
const CreateEvent = lazy(() => import("./pages/createEvent"))
const Success = lazy(() => import("./pages/success"))
const Event = lazy(() => import("./pages/event"))
const Payment = lazy(() => import("./pages/Payment"))
const PaystackSuccess = lazy(() => import("./pages/paystack-success"))
const UserProfile = lazy(() => import("./pages/Profile"))
const BookerConfirm = lazy(() => import("./pages/bookerConfirm"))
const LoginBooker = lazy(() => import("./pages/LoginBooker"))
const NotFound = lazy(() => import("./pages/notfound"))
const BookerProfile = lazy(() => import("./pages/BookerProfile"))
const BookerDashboard = lazy(() => import("./pages/BookerDashboard"))
const BookerTickets = lazy(() => import("./pages/BookerTickets"))
const BookerTicketInfo = lazy(() => import("./pages/BookerTicketInfo"))
const VerifyTicket = lazy(() => import("./pages/VerifyTicket"))
const Verification = lazy(() => import("./pages/Verification"))
const TicketHistory = lazy(() => import("./pages/ticketHistory"))
const Team = lazy(() => import("./pages/team"))
const TicketHistoryInfo = lazy(() => import("./pages/ticketHistoryInfo"))
const TailwindTest = lazy(() => import("./pages/TailwindTest"))
const Collabs = lazy(() => import("./pages/collabs"))
const CollabVerify = lazy(() => import("./pages/collab-verify"))
const CollabPayout = lazy(() => import("./pages/collab-payout"))

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
      <Suspense fallback={<Preloader />}>
        <RouteStyleManager>
          <Routes>
            {/* Public routes - accessible regardless of authentication state */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/home" /> : <Signup />} />
            <Route path="/forgot-password" element={user ? <Navigate to="/home" /> : <ForgotPassword />} />
            <Route path="/LoginBooker" element={<LoginBooker />} />
            <Route path="/tailwind-test" element={<TailwindTest />} />

            {/* Modified to be public routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/event/:uid/:id" element={<Event />} />

            {/* Protected routes - require authentication */}
            <Route path="/bookerRole" element={user ? <BookerRole /> : <Navigate to="/login" />} />
            <Route path="/Profile" element={user ? <UserProfile /> : <Navigate to="/login" />} />
            <Route path="/booker-confirm" element={user ? <BookerConfirm /> : <Navigate to="/login" />} />
            <Route path="/payment" element={user ? <Payment /> : <Navigate to="/login" />} />
            <Route path="/paystack-success" element={user ? <PaystackSuccess /> : <Navigate to="/login" />} />
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
              path="/team"
              element={
                user ? (
                  <BookerRoute>
                    <Team />
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
              path="/collabs"
              element={
                user ? (
                  <BookerRoute>
                    <Collabs />
                  </BookerRoute>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/collab-verify"
              element={
                user ? (
                  <BookerRoute>
                    <CollabVerify />
                  </BookerRoute>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/collab-payout"
              element={
                user ? (
                  <BookerRoute>
                    <CollabPayout />
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
        </RouteStyleManager>
      </Suspense>
    </Router>
  )
}

export default App
