"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { checkCurrentUserIsAdmin } from "../services/admin"
import Footer from "../components/footer"
import {
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react"
import Preloader from "../components/preloader"
import "./admin-refund.css"

interface RefundItem {
  id: string
  refundId: string
  userId: string
  userEmail: string
  ticketId: string
  ticketReference: string
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  purchaseDate: string
  refundReason: string
  customReason?: string
  moreInformation?: string
  status: "requested" | "processing" | "refunded" | "denied"
  requestDate: string
  requestTime: string
  paymentMethod: string
}

const AdminRefund = () => {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [refunds, setRefunds] = useState<RefundItem[]>([])
  const [filteredRefunds, setFilteredRefunds] = useState<RefundItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [message, setMessage] = useState({ text: "", type: "" })
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedRefund, setExpandedRefund] = useState<string | null>(null)

  // Pagination
  const refundsPerPage = 10

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const adminStatus = await checkCurrentUserIsAdmin()
        if (!adminStatus) {
          window.location.href = "/home"
          return
        }

        setIsAdmin(true)
        await fetchRefunds()
      } catch (error) {
        console.error("Error checking admin status:", error)
        window.location.href = "/home"
      }
    }

    checkAdminStatus()
  }, [])

  useEffect(() => {
    filterRefunds()
  }, [refunds, searchTerm, filterStatus])

  const fetchRefunds = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setRefreshing(loadMore ? true : false)
      }

      const refundsRef = collection(db, "refunds")

      let q
      if (loadMore && lastDoc) {
        q = query(refundsRef, orderBy("requestDate", "desc"), startAfter(lastDoc), limit(refundsPerPage))
      } else {
        q = query(refundsRef, orderBy("requestDate", "desc"), limit(refundsPerPage))
      }

      const querySnapshot = await getDocs(q)

      // Set last document for pagination
      if (!querySnapshot.empty) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData>)
        setHasMore(querySnapshot.docs.length === refundsPerPage)
      } else {
        setHasMore(false)
      }

      const refundsList: RefundItem[] = []

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data() as DocumentData

        refundsList.push({
          id: docSnapshot.id,
          refundId: (data.refundId as string) || docSnapshot.id,
          userId: (data.userId as string) || "",
          userEmail: (data.userEmail as string) || "No email",
          ticketId: (data.ticketId as string) || "",
          ticketReference: (data.ticketReference as string) || "",
          eventId: (data.eventId as string) || "",
          eventName: (data.eventName as string) || "Unknown Event",
          ticketType: (data.ticketType as string) || "",
          ticketPrice: (data.ticketPrice as number) || 0,
          purchaseDate: (data.purchaseDate as string) || "",
          refundReason: (data.refundReason as string) || "",
          customReason: (data.customReason as string) || "",
          moreInformation: (data.moreInformation as string) || "",
          status: (data.status as "requested" | "processing" | "refunded" | "denied") || "requested",
          requestDate: data.requestDate ? new Date(data.requestDate as string).toLocaleDateString() : "Unknown",
          requestTime: (data.requestTime as string) || "",
          paymentMethod: (data.paymentMethod as string) || "Unknown",
        })
      }

      if (loadMore) {
        setRefunds((prev) => [...prev, ...refundsList])
      } else {
        setRefunds(refundsList)
      }
    } catch (error) {
      console.error("Error fetching refunds:", error)
      setMessage({
        text: "Failed to load refund requests",
        type: "error",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }

  const filterRefunds = () => {
    let filtered = [...refunds]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (refund) =>
          refund.refundId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          refund.ticketReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
          refund.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          refund.eventName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((refund) => refund.status === filterStatus)
    }

    setFilteredRefunds(filtered)
  }

  const updateRefundStatus = async (
    refundId: string,
    newStatus: "requested" | "processing" | "refunded" | "denied",
  ) => {
    if (!isAdmin) return

    setProcessingRefund(refundId)

    try {
      // Get the refund document
      const refundDocRef = doc(db, "refunds", refundId)
      const refundDoc = await getDoc(refundDocRef)

      if (!refundDoc.exists()) {
        throw new Error("Refund not found")
      }

      const refundData = refundDoc.data() as DocumentData
      const userId = refundData.userId as string

      if (!userId) {
        throw new Error("User ID not found in refund data")
      }

      // Update the main refund document
      await updateDoc(refundDocRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || "Unknown admin",
      })

      // Update the user's refund document
      const userRefundDocRef = doc(db, "TicketHistory", userId, "refunds", refundId)
      const userRefundDoc = await getDoc(userRefundDocRef)

      if (userRefundDoc.exists()) {
        await updateDoc(userRefundDocRef, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.uid || "Unknown admin",
        })
      } else {
        console.warn(`User refund document not found: TicketHistory/${userId}/refunds/${refundId}`)
      }

      // Update local state
      setRefunds((prevRefunds) =>
        prevRefunds.map((refund) => (refund.id === refundId ? { ...refund, status: newStatus } : refund)),
      )

      setMessage({
        text: `Refund status updated to ${newStatus}`,
        type: "success",
      })
    } catch (error) {
      console.error("Error updating refund status:", error)
      setMessage({
        text: `Failed to update refund status: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setProcessingRefund(null)
    }
  }

  const handleRefresh = () => {
    setLastDoc(null)
    fetchRefunds()
  }

  const loadMoreRefunds = () => {
    if (hasMore && !loadingMore) {
      fetchRefunds(true)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "requested":
        return {
          className: "status-requested",
          text: "Requested",
          icon: <Clock size={16} />,
        }
      case "processing":
        return {
          className: "status-processing",
          text: "Processing",
          icon: <RefreshCw size={16} />,
        }
      case "refunded":
        return {
          className: "status-refunded",
          text: "Refunded",
          icon: <CheckCircle size={16} />,
        }
      case "denied":
        return {
          className: "status-denied",
          text: "Denied",
          icon: <XCircle size={16} />,
        }
      default:
        return {
          className: "status-requested",
          text: "Unknown",
          icon: <AlertTriangle size={16} />,
        }
    }
  }

  const handleGoBack = () => {
    window.history.back()
  }

  const toggleExpandRefund = (refundId: string) => {
    setExpandedRefund(expandedRefund === refundId ? null : refundId)
  }

  if (loading && !refreshing) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <div className="admin-refund-container">
        <div className="admin-refund-header">
          <div className="header-top">
            <button className="back-button" onClick={handleGoBack}>
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Refund Management</h1>

            {/* Mobile menu toggle button */}
            <button
              className="menu-toggle-btn md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div className={`controls-section ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
            <div className="search-filter-container">
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by refund ID, ticket reference, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-container">
                <Filter size={18} className="filter-icon" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="requested">Requested</option>
                  <option value="processing">Processing</option>
                  <option value="refunded">Refunded</option>
                  <option value="denied">Denied</option>
                </select>
              </div>

              <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Total Refunds:</span>
                <span className="stat-value">{filteredRefunds.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Requested:</span>
                <span className="stat-value requested">
                  {filteredRefunds.filter((r) => r.status === "requested").length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Processing:</span>
                <span className="stat-value processing">
                  {filteredRefunds.filter((r) => r.status === "processing").length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Refunded:</span>
                <span className="stat-value refunded">
                  {filteredRefunds.filter((r) => r.status === "refunded").length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Denied:</span>
                <span className="stat-value denied">{filteredRefunds.filter((r) => r.status === "denied").length}</span>
              </div>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`admin-message ${message.type}`}>
            {message.text}
            <button onClick={() => setMessage({ text: "", type: "" })}>×</button>
          </div>
        )}

        <div className="refunds-section">
          {filteredRefunds.length === 0 ? (
            <div className="no-refunds">
              <div className="no-refunds-icon">
                <RefreshCw size={60} />
              </div>
              <h3>No Refund Requests Found</h3>
              <p>
                {searchTerm || filterStatus !== "all"
                  ? "No refunds match your current filters."
                  : "There are no refund requests in the system."}
              </p>
              {(searchTerm || filterStatus !== "all") && (
                <button
                  className="clear-filters-button"
                  onClick={() => {
                    setSearchTerm("")
                    setFilterStatus("all")
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="refunds-grid">
              {filteredRefunds.map((refund) => {
                const statusConfig = getStatusConfig(refund.status)
                const isExpanded = expandedRefund === refund.id

                return (
                  <div key={refund.id} className={`refund-card ${isExpanded ? "expanded" : ""}`}>
                    <div className="refund-card-header">
                      <div className="refund-id">
                        <span className="refund-id-label">Refund ID:</span>
                        <span className="refund-id-value">{refund.refundId}</span>
                      </div>
                      <div className={`status-badge ${statusConfig.className}`}>
                        {statusConfig.icon}
                        <span>{statusConfig.text}</span>
                      </div>
                    </div>

                    <div className="refund-card-content">
                      <div className="refund-event">
                        <h3>{refund.eventName}</h3>
                      </div>

                      <div className="refund-amount">
                        <span className="amount-label">Refund Amount:</span>
                        <span className="amount-value">NGN {formatNumber(refund.ticketPrice)}</span>
                      </div>

                      <div className="refund-user">
                        <span className="user-label">User Email:</span>
                        <span className="user-value">{refund.userEmail}</span>
                      </div>

                      <div className="refund-date-time">
                        <div className="date-time-item">
                          <span className="label">Request Date:</span>
                          <span className="value">{refund.requestDate}</span>
                        </div>
                        <div className="date-time-item">
                          <span className="label">Request Time:</span>
                          <span className="value">{refund.requestTime}</span>
                        </div>
                      </div>

                      <div className="refund-reason">
                        <span className="reason-label">Reason:</span>
                        <span className="reason-value">
                          {refund.refundReason === "Other" && refund.customReason
                            ? refund.customReason
                            : refund.refundReason}
                        </span>
                      </div>

                      <button className="expand-button" onClick={() => toggleExpandRefund(refund.id)}>
                        {isExpanded ? "Show Less" : "Show More"}
                        <ChevronDown className={isExpanded ? "rotate-180" : ""} size={16} />
                      </button>

                      {isExpanded && (
                        <div className="expanded-details">
                          <div className="detail-row">
                            <span className="detail-label">Ticket Reference:</span>
                            <span className="detail-value">{refund.ticketReference}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Ticket Type:</span>
                            <span className="detail-value">{refund.ticketType}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Purchase Date:</span>
                            <span className="detail-value">{refund.purchaseDate}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Payment Method:</span>
                            <span className="detail-value">{refund.paymentMethod}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">User ID:</span>
                            <span className="detail-value">{refund.userId}</span>
                          </div>
                          {refund.moreInformation && (
                            <div className="detail-row">
                              <span className="detail-label">Additional Information:</span>
                              <span className="detail-value info-text">{refund.moreInformation}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="refund-card-footer">
                      <div className="status-update">
                        <label>Update Status:</label>
                        <div className="status-actions">
                          <select
                            value={refund.status}
                            onChange={(e) => updateRefundStatus(refund.id, e.target.value as any)}
                            disabled={processingRefund === refund.id}
                            className={`status-select ${refund.status}`}
                          >
                            <option value="requested">Requested</option>
                            <option value="processing">Processing</option>
                            <option value="refunded">Refunded</option>
                            <option value="denied">Denied</option>
                          </select>
                          {processingRefund === refund.id && (
                            <RefreshCw size={16} className="animate-spin processing-icon" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {hasMore && (
            <div className="load-more-container">
              <button className="load-more-button" onClick={loadMoreRefunds} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Refunds"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default AdminRefund
