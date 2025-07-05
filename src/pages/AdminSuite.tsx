"use client"

import { useState, useEffect, Suspense, lazy } from "react"
import { auth } from "../services/firebase"
import { checkCurrentUserIsAdmin } from "../services/admin"
import Footer from "../components/footer"
import { Shield, UserCheck, DollarSign, Menu, X } from "lucide-react"
import Preloader from "../components/preloader"

// Lazy load tab components
const AddNewAdminTab = lazy(() => import("../components/add-new-admin-tab"))
const VerifyBookersTab = lazy(() => import("../components/verify-bookers-tab"))
const CreatePayoutsTab = lazy(() => import("../components/create-payouts-tab"))

// Loading skeleton components
const AddNewAdminTabSkeleton = () => (
  <div className="admin-section">
    <div className="skeleton-text skeleton-title"></div>
    <div className="skeleton-form">
      <div className="skeleton-text skeleton-subtitle"></div>
      <div className="form-row">
        <div className="skeleton-input"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
    <div className="skeleton-table">
      <div className="skeleton-text skeleton-subtitle"></div>
      <div className="skeleton-table-header"></div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton-table-row"></div>
      ))}
    </div>
  </div>
)

const VerifyBookersTabSkeleton = () => (
  <div className="admin-section">
    <div className="skeleton-text skeleton-title"></div>
    <div className="skeleton-form">
      <div className="skeleton-text skeleton-subtitle"></div>
      <div className="form-row">
        <div className="skeleton-input"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
    <div className="skeleton-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton-card"></div>
      ))}
    </div>
  </div>
)

const CreatePayoutsTabSkeleton = () => (
  <div className="admin-section">
    <div className="skeleton-text skeleton-title"></div>
    <div className="skeleton-form">
      <div className="skeleton-text skeleton-subtitle"></div>
      <div className="form-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-input"></div>
        ))}
      </div>
    </div>
    <div className="skeleton-card">
      <div className="skeleton-text skeleton-subtitle"></div>
      <div className="skeleton-stats">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-stat"></div>
        ))}
      </div>
    </div>
  </div>
)

type TabType = "addAdmin" | "verifyBookers" | "createPayouts"

const AdminSuite = () => {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>("addAdmin")
  const [loadedTabs, setLoadedTabs] = useState<Set<TabType>>(new Set<TabType>(["addAdmin"]))
  const [message, setMessage] = useState({ text: "", type: "" })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUserIsRoot, setCurrentUserIsRoot] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      const isAdmin = await checkCurrentUserIsAdmin()
      if (!isAdmin) {
        window.location.href = "/home"
        return
      }

      // Check if current user is root admin (has permission to add admins)
      const currentUser = auth.currentUser
      if (currentUser) {
        try {
          const { doc, getDoc } = await import("firebase/firestore")
          const { db } = await import("../services/firebase")

          const adminDocRef = doc(db, "admins", currentUser.uid)
          const adminDoc = await getDoc(adminDocRef)

          if (adminDoc.exists()) {
            const adminData = adminDoc.data()
            // If permissions field doesn't exist or addNewAdmin is true, consider as root
            const isRoot = !adminData.permissions || adminData.permissions.addNewAdmin !== false
            setCurrentUserIsRoot(isRoot)
          } else {
            // If admin doc exists but no permissions field, consider as root (legacy support)
            setCurrentUserIsRoot(true)
          }
        } catch (error) {
          console.error("Error checking admin permissions:", error)
          setCurrentUserIsRoot(false)
        }
      }

      setLoading(false)
    }

    checkAdminStatus()
  }, [])

  const handleTabSwitch = (tab: TabType) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)

    // Load the tab if it hasn't been loaded yet
    if (!loadedTabs.has(tab)) {
      setLoadedTabs((prev) => new Set([...Array.from(prev), tab]))
    }
  }

  const renderTabContent = () => {
    const tabProps = {
      setMessage,
      setLoading,
    }

    switch (activeTab) {
      case "addAdmin":
        return loadedTabs.has("addAdmin") ? (
          <Suspense fallback={<AddNewAdminTabSkeleton />}>
            <AddNewAdminTab {...tabProps} />
          </Suspense>
        ) : (
          <AddNewAdminTabSkeleton />
        )

      case "verifyBookers":
        return loadedTabs.has("verifyBookers") ? (
          <Suspense fallback={<VerifyBookersTabSkeleton />}>
            <VerifyBookersTab {...tabProps} />
          </Suspense>
        ) : (
          <VerifyBookersTabSkeleton />
        )

      case "createPayouts":
        return loadedTabs.has("createPayouts") ? (
          <Suspense fallback={<CreatePayoutsTabSkeleton />}>
            <CreatePayoutsTab {...tabProps} />
          </Suspense>
        ) : (
          <CreatePayoutsTabSkeleton />
        )

      default:
        return <AddNewAdminTabSkeleton />
    }
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <div className="admin-dashboard-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>

          {/* Mobile menu toggle button */}
          <button
            className="menu-toggle-btn md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop tabs */}
          <div className={`admin-tabs ${mobileMenuOpen ? "mobile-menu-open" : "hidden md:flex"}`}>
            <button
              className={`admin-tab ${activeTab === "addAdmin" ? "active" : ""}`}
              onClick={() => handleTabSwitch("addAdmin")}
            >
              <Shield size={18} />
              Add New Admin
            </button>
            <button
              className={`admin-tab ${activeTab === "verifyBookers" ? "active" : ""}`}
              onClick={() => handleTabSwitch("verifyBookers")}
            >
              <UserCheck size={18} />
              Verify Bookers
            </button>
            <button
              className={`admin-tab ${activeTab === "createPayouts" ? "active" : ""}`}
              onClick={() => handleTabSwitch("createPayouts")}
            >
              <DollarSign size={18} />
              Create Payouts
            </button>

            {/* Admin permissions button - only show if user is root admin */}
            {currentUserIsRoot && (
              <button
                className="admin-permissions-btn"
                onClick={() => {
                  window.location.href = "/admin-permissions"
                  setMobileMenuOpen(false)
                }}
              >
                <Shield size={18} />
                Manage Admin Permissions
              </button>
            )}
          </div>
        </div>

        {message.text && (
          <div className={`admin-message ${message.type}`}>
            {message.text}
            <button onClick={() => setMessage({ text: "", type: "" })}>×</button>
          </div>
        )}

        {renderTabContent()}
      </div>
      <Footer />
    </>
  )
}

export default AdminSuite
