"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../services/firebase"
import { Helmet } from "react-helmet"
import { collection, query, getDocs, limit, startAfter, type DocumentSnapshot } from "firebase/firestore"
import { ArrowLeft, CreditCard, Filter, Download, RefreshCw } from "lucide-react"
import UserHeader from "../components/UserHeader"
import Search from "../components/search"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import "boxicons/css/boxicons.min.css"
import "../styles/payment-override.css"

interface WalletTransaction {
  id: string
  transactionId: string
  transactionDate: string
  transactionTime: string
  transactionType: string
  amount: number
  tag: "debit" | "credit"
  status: string
  eventName?: string
  ticketType?: string
  ticketId?: string
  ticketReference?: string
  eventId?: string
  eventCreatorId?: string
  createdAt?: any
  previousBalance?: number
  newBalance?: number
  userEmail?: string
  userFullName?: string
  transactionFee?: number
}

const WalletHistory = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<WalletTransaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "debit" | "credit">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [transactionsPerPage] = useState(10)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm, filterType])

  const fetchTransactions = async (loadMore = false) => {
    try {
      const user = auth.currentUser
      if (!user) {
        navigate("/login")
        return
      }

      setError(null)
      if (!loadMore) {
        setLoading(true)
      }

      console.log("Fetching wallet transactions from IWSS Miami...")

      const walletPayRef = collection(db, "users", user.uid, "wallet-pay")

      // Simple query without orderBy to avoid issues with missing fields
      let q = query(walletPayRef, limit(transactionsPerPage))

      if (loadMore && lastDoc) {
        q = query(walletPayRef, startAfter(lastDoc), limit(transactionsPerPage))
      }

      const querySnapshot = await getDocs(q)
      console.log("IWSS Snapshot Size:", querySnapshot.size)

      const newTransactions: WalletTransaction[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()

        newTransactions.push({
          id: doc.id,
          transactionId: data.transactionId || doc.id,
          transactionDate: data.transactionDate || new Date().toLocaleDateString(),
          transactionTime: data.transactionTime || new Date().toLocaleTimeString(),
          transactionType: data.transactionType || data.eventName || "Wallet Transaction",
          amount: Number(data.amount) || 0,
          tag: data.tag || "debit",
          status: data.status || "completed",
          eventName: data.eventName || null,
          ticketType: data.ticketType || null,
          ticketId: data.ticketId || null,
          ticketReference: data.ticketReference || null,
          eventId: data.eventId || null,
          eventCreatorId: data.eventCreatorId || null,
          createdAt: data.createdAt || null,
          previousBalance: data.previousBalance || null,
          newBalance: data.newBalance || null,
          userEmail: data.userEmail || null,
          userFullName: data.userFullName || null,
          transactionFee: Number(data.transactionFee) || 0,
        })
      })

      // Sort transactions by date and time (most recent first)
      newTransactions.sort((a, b) => {
        const dateA = new Date(`${a.transactionDate} ${a.transactionTime}`)
        const dateB = new Date(`${b.transactionDate} ${b.transactionTime}`)
        return dateB.getTime() - dateA.getTime()
      })

      if (loadMore) {
        setTransactions((prev) => [...prev, ...newTransactions])
      } else {
        setTransactions(newTransactions)
      }

      setTotalTransactions((prev) => (loadMore ? prev + newTransactions.length : newTransactions.length))

      // Set last document for pagination
      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1])
      }

      // Check if there are more documents
      setHasMore(querySnapshot.docs.length === transactionsPerPage)

      setLoading(false)
    } catch (error) {
      console.error("Error fetching wallet transactions:", error)
      setError("Failed to load transaction history. Please try again.")
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (transaction) =>
          transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.transactionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (transaction.eventName && transaction.eventName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.ticketId && transaction.ticketId.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((transaction) => transaction.tag === filterType)
    }

    setFilteredTransactions(filtered)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setCurrentPage(1)
    setLastDoc(null)
    setHasMore(true)
    await fetchTransactions()
    setRefreshing(false)
  }

  const loadMoreTransactions = async () => {
    if (hasMore && !loading) {
      await fetchTransactions(true)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string): string => {
    try {
      // If it's already a formatted time, return as is
      if (timeString.includes(":")) {
        return timeString
      }
      const date = new Date(timeString)
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return timeString
    }
  }

  const getTransactionTypeDisplay = (transaction: WalletTransaction): string => {
    if (transaction.tag === "credit") {
      return "Wallet Funding"
    }

    // Check if it's a free event (transaction fee is 0 and it's an event ticket)
    const isFreeEvent = transaction.transactionFee === 0 && transaction.eventName

    if (isFreeEvent) {
      return `${transaction.eventName || transaction.transactionType} (Free Event)`
    }

    return transaction.eventName || transaction.transactionType || "Event Ticket"
  }

  const isFreeEvent = (transaction: WalletTransaction): boolean => {
    return transaction.transactionFee === 0 && !!transaction.eventName && transaction.tag === "debit"
  }

  const getTransactionFeeDisplay = (transaction: WalletTransaction): string => {
    if (isFreeEvent(transaction)) {
      return "Waived"
    }
    return `NGN ${formatNumber(transaction.transactionFee || 0)}`
  }

  const exportTransactions = () => {
    const csvContent = [
      ["Date", "Time", "Transaction ID", "Type", "Amount", "Transaction Fee", "Tag", "Status", "Free Event"].join(","),
      ...filteredTransactions.map((transaction) =>
        [
          transaction.transactionDate,
          transaction.transactionTime,
          transaction.transactionId,
          getTransactionTypeDisplay(transaction),
          transaction.amount,
          isFreeEvent(transaction) ? "Waived" : transaction.transactionFee || 0,
          transaction.tag,
          transaction.status,
          isFreeEvent(transaction) ? "Yes" : "No",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `wallet-history-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  // Pagination for filtered results
  const indexOfLastTransaction = currentPage * transactionsPerPage
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction)
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  if (loading && transactions.length === 0) {
    return <Preloader loading={true} />
  }

  return (
    <>
    <Search></Search>
      <Helmet>
        <title>Wallet History - Spotix</title>
        <meta name="description" content="View your wallet transaction history on Spotix." />
        <link rel="canonical" href={`${window.location.origin}/wallet-history`} />
        <meta property="og:title" content="Wallet History - Spotix" />
        <meta property="og:description" content="View your wallet transaction history on Spotix." />
      </Helmet>
      <UserHeader />
      <div className="wallet-history-container">
        <div className="wallet-history-header">
          <div className="header-top">
            <button className="back-button" onClick={handleGoBack}>
              <ArrowLeft size={20} />
              Back
            </button>
            <h1>Wallet History</h1>
            <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="controls-section">
            <div className="search-filter-container">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-container">
                <Filter size={18} className="filter-icon" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | "debit" | "credit")}
                  className="filter-select"
                >
                  <option value="all">All Transactions</option>
                  <option value="debit">Debits Only</option>
                  <option value="credit">Credits Only</option>
                </select>
              </div>

              <button className="export-button" onClick={exportTransactions}>
                <Download size={18} />
                Export CSV
              </button>
            </div>

            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Total Transactions:</span>
                <span className="stat-value">{filteredTransactions.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Debits:</span>
                <span className="stat-value debit">{filteredTransactions.filter((t) => t.tag === "debit").length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Credits:</span>
                <span className="stat-value credit">
                  {filteredTransactions.filter((t) => t.tag === "credit").length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <i className="bx bx-error-circle"></i>
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-button">
              Try Again
            </button>
          </div>
        )}

        {/* {process.env.NODE_ENV === "development" && (
          <div style={{ background: "#f0f0f0", padding: "1rem", margin: "1rem 0", borderRadius: "4px" }}>
            <h4>Debug Info:</h4>
            <p>Total transactions loaded: {transactions.length}</p>
            <p>Filtered transactions: {filteredTransactions.length}</p>
            <p>Current user: {auth.currentUser?.uid}</p>
            <p>Loading: {loading.toString()}</p>
            <p>Error: {error || "None"}</p>
          </div>
        )} */}

        <div className="transactions-section">
          {filteredTransactions.length === 0 ? (
            <div className="no-transactions">
              <CreditCard size={60} className="no-transactions-icon" />
              <h3>No Transactions Found</h3>
              <p>
                {searchTerm || filterType !== "all"
                  ? "No transactions match your current filters."
                  : "You haven't made any wallet transactions yet."}
              </p>
              {(searchTerm || filterType !== "all") && (
                <button
                  className="clear-filters-button"
                  onClick={() => {
                    setSearchTerm("")
                    setFilterType("all")
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="transactions-table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Transaction ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Transaction Fee</th>
                      <th>Tag</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className={`transaction-row ${isFreeEvent(transaction) ? "free-event" : ""}`}
                      >
                        <td className="date-time-cell">
                          <div className="date-time-container">
                            <span className="date">{formatDate(transaction.transactionDate)}</span>
                            <span className="time">{formatTime(transaction.transactionTime)}</span>
                          </div>
                        </td>
                        <td className="transaction-id-cell">
                          <span className="transaction-id" title={transaction.transactionId}>
                            {transaction.transactionId.length > 20
                              ? `${transaction.transactionId.substring(0, 20)}...`
                              : transaction.transactionId}
                          </span>
                        </td>
                        <td className="type-cell">
                          <div className="type-container">
                            <span className="type-main">{getTransactionTypeDisplay(transaction)}</span>
                            {transaction.ticketType && <span className="type-sub">{transaction.ticketType}</span>}
                            {isFreeEvent(transaction) && (
                              <span className="free-event-badge">
                                <i className="bx bx-gift"></i>
                                Free Event
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="amount-cell">
                          <span className={`amount ${transaction.tag}`}>
                            {transaction.tag === "debit" ? "-" : "+"}NGN {formatNumber(transaction.amount)}
                          </span>
                        </td>
                        <td className="fee-cell">
                          <span className={`fee-amount ${isFreeEvent(transaction) ? "waived" : ""}`}>
                            {getTransactionFeeDisplay(transaction)}
                          </span>
                        </td>
                        <td className="tag-cell">
                          <span className={`tag-badge ${transaction.tag}`}>
                            {transaction.tag === "debit" ? (
                              <i className="bx bx-minus-circle"></i>
                            ) : (
                              <i className="bx bx-plus-circle"></i>
                            )}
                            {transaction.tag.charAt(0).toUpperCase() + transaction.tag.slice(1)}
                          </span>
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${transaction.status.toLowerCase()}`}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Card layout for mobile devices */}
              <div className="transaction-cards">
                {currentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`transaction-card ${transaction.tag} ${isFreeEvent(transaction) ? "free-event" : ""}`}
                  >
                    <div className="card-header">
                      <div className="card-date-time">
                        <span className="card-date">{formatDate(transaction.transactionDate)}</span>
                        <span className="card-time">{formatTime(transaction.transactionTime)}</span>
                      </div>
                      <span className={`card-amount ${transaction.tag}`}>
                        {transaction.tag === "debit" ? "-" : "+"}NGN {formatNumber(transaction.amount)}
                      </span>
                    </div>
                    <div className="card-details">
                      <div className="card-detail-row">
                        <span className="card-detail-label">Type:</span>
                        <span className="card-detail-value">{getTransactionTypeDisplay(transaction)}</span>
                      </div>
                      <div className="card-detail-row">
                        <span className="card-detail-label">Transaction ID:</span>
                        <span className="card-detail-value card-transaction-id">
                          {transaction.transactionId.length > 15
                            ? `${transaction.transactionId.substring(0, 15)}...`
                            : transaction.transactionId}
                        </span>
                      </div>
                      <div className="card-detail-row">
                        <span className="card-detail-label">Tag:</span>
                        <span className={`tag-badge ${transaction.tag}`}>
                          {transaction.tag === "debit" ? (
                            <i className="bx bx-minus-circle"></i>
                          ) : (
                            <i className="bx bx-plus-circle"></i>
                          )}
                          {transaction.tag.charAt(0).toUpperCase() + transaction.tag.slice(1)}
                        </span>
                      </div>
                      <div className="card-detail-row">
                        <span className="card-detail-label">Transaction Fee:</span>
                        <span className={`card-detail-value ${isFreeEvent(transaction) ? "fee-waived" : ""}`}>
                          {getTransactionFeeDisplay(transaction)}
                        </span>
                      </div>
                      <div className="card-detail-row">
                        <span className="card-detail-label">Status:</span>
                        <span className={`status-badge ${transaction.status.toLowerCase()}`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </div>
                      {transaction.ticketType && (
                        <div className="card-detail-row">
                          <span className="card-detail-label">Ticket Type:</span>
                          <span className="card-detail-value">{transaction.ticketType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing {indexOfFirstTransaction + 1} to{" "}
                    {Math.min(indexOfLastTransaction, filteredTransactions.length)} of {filteredTransactions.length}{" "}
                    transactions
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-button"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }

                      return (
                        <button
                          key={pageNumber}
                          className={`pagination-button ${currentPage === pageNumber ? "active" : ""}`}
                          onClick={() => paginate(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      )
                    })}
                    <button
                      className="pagination-button"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Load More Button for infinite scroll */}
              {hasMore && transactions.length >= transactionsPerPage && (
                <div className="load-more-container">
                  <button className="load-more-button" onClick={loadMoreTransactions} disabled={loading}>
                    {loading ? "Loading..." : "Load More Transactions"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />

      {/* Styles */}
      <style>{`
.wallet-history-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.wallet-history-header {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.wallet-history-header h1 {
  margin: 0;
  color: #333;
  font-size: 2rem;
  font-weight: 600;
  text-align: center;
  flex: 1;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #6b2fa5;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.refresh-button:hover:not(:disabled) {
  background: #5a2589;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-filter-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.filter-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-icon {
  color: #666;
}

.filter-select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  min-width: 150px;
}

.export-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.export-button:hover {
  background: #218838;
}

.summary-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: space-between;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.stat-value.debit {
  color: #dc3545;
}

.stat-value.credit {
  color: #28a745;
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.retry-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
}

.transactions-section {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.no-transactions {
  text-align: center;
  padding: 4rem 2rem;
}

.no-transactions-icon {
  color: #ccc;
  margin-bottom: 1rem;
}

.no-transactions h3 {
  margin: 0 0 0.5rem 0;
  color: #666;
}

.no-transactions p {
  color: #999;
  margin-bottom: 1.5rem;
}

.clear-filters-button {
  background: #6b2fa5;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
}

/* Enhanced table container with horizontal scroll */
.transactions-table-container {
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #6b2fa5 #f1f1f1;
}

.transactions-table-container::-webkit-scrollbar {
  height: 8px;
}

.transactions-table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.transactions-table-container::-webkit-scrollbar-thumb {
  background: #6b2fa5;
  border-radius: 4px;
}

.transactions-table-container::-webkit-scrollbar-thumb:hover {
  background: #5a2589;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px; /* Ensures table maintains minimum width */
}

.transactions-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.transactions-table td {
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  vertical-align: middle;
  white-space: nowrap;
}

.transaction-row:hover {
  background-color: #f8f9fa;
}

.date-time-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
}

.date {
  font-weight: 500;
  color: #333;
}

.time {
  font-size: 0.85rem;
  color: #666;
}

.transaction-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: #666;
  cursor: pointer;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 140px;
  max-width: 180px;
}

.type-main {
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-sub {
  font-size: 0.8rem;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
}

.amount {
  font-weight: 600;
  font-size: 0.95rem;
  min-width: 100px;
}

.amount.debit {
  color: #dc3545;
}

.amount.credit {
  color: #28a745;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
}

.tag-badge.debit {
  background: #f8d7da;
  color: #721c24;
}

.tag-badge.credit {
  background: #d4edda;
  color: #155724;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-badge.completed {
  background: #d4edda;
  color: #155724;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.pagination-container {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #dee2e6;
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-info {
  color: #666;
  font-size: 0.9rem;
}

.pagination-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pagination-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  min-width: 40px;
  text-align: center;
}

.pagination-button:hover:not(:disabled) {
  background: #f5f5f5;
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-button.active {
  background: #6b2fa5;
  color: white;
  border-color: #6b2fa5;
}

.load-more-container {
  padding: 1.5rem;
  text-align: center;
  border-top: 1px solid #dee2e6;
}

.load-more-button {
  background: #6b2fa5;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-button:hover:not(:disabled) {
  background: #5a2589;
}

.load-more-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Card layout for very small screens */
.transaction-cards {
  display: none;
}

/* Tablet Responsive Design */
@media (max-width: 1024px) {
  .wallet-history-container {
    padding: 1.5rem 1rem;
  }

  .transactions-table {
    min-width: 700px;
  }

  .summary-stats {
    gap: 1.5rem;
  }
}

/* Mobile Responsive Design */
@media (max-width: 768px) {
  .wallet-history-container {
    padding: 1rem 0.5rem;
  }

  .wallet-history-header {
    padding: 1.5rem;
  }

  .header-top {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .wallet-history-header h1 {
    font-size: 1.5rem;
    text-align: center;
    order: 1;
  }

  .back-button {
    order: 0;
    align-self: flex-start;
  }

  .refresh-button {
    order: 2;
    align-self: flex-end;
  }

  .search-filter-container {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .search-box {
    min-width: auto;
    width: 100%;
  }

  .filter-container {
    width: 100%;
  }

  .filter-select {
    width: 100%;
    min-width: auto;
  }

  .export-button {
    width: 100%;
    justify-content: center;
  }

  .summary-stats {
    justify-content: space-between;
    gap: 1rem;
  }

  .stat-item {
    min-width: auto;
    flex: 1;
    text-align: center;
  }

  .transactions-table {
    min-width: 600px;
  }

  .transactions-table th,
  .transactions-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.85rem;
  }

  .date-time-container {
    min-width: 100px;
  }

  .type-container {
    min-width: 120px;
    max-width: 150px;
  }

  .pagination-container {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .pagination-controls {
    justify-content: center;
  }
}

/* Small Mobile Screens - Card Layout */
@media (max-width: 480px) {
  .wallet-history-container {
    padding: 0.5rem;
  }

  .wallet-history-header {
    padding: 1rem;
  }

  .wallet-history-header h1 {
    font-size: 1.25rem;
  }

  .summary-stats {
    flex-direction: column;
    gap: 0.75rem;
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    padding: 0.75rem;
    border-radius: 6px;
  }

  /* Hide table and show cards on very small screens */
  .transactions-table-container {
    display: none;
  }

  .transaction-cards {
    display: block;
    padding: 1rem;
  }

  .transaction-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    border-left: 4px solid #6b2fa5;
  }

  .transaction-card.debit {
    border-left-color: #dc3545;
  }

  .transaction-card.credit {
    border-left-color: #28a745;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .card-date-time {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .card-date {
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
  }

  .card-time {
    font-size: 0.8rem;
    color: #666;
  }

  .card-amount {
    font-weight: 600;
    font-size: 1rem;
  }

  .card-amount.debit {
    color: #dc3545;
  }

  .card-amount.credit {
    color: #28a745;
  }

  .card-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .card-detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
  }

  .card-detail-label {
    color: #666;
    font-weight: 500;
  }

  .card-detail-value {
    color: #333;
    text-align: right;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-transaction-id {
    font-family: monospace;
    font-size: 0.75rem;
  }

  .pagination-controls {
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .pagination-button {
    min-width: 35px;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
}

/* Extra small screens */
@media (max-width: 360px) {
  .wallet-history-header h1 {
    font-size: 1.1rem;
  }

  .back-button,
  .refresh-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .transaction-card {
    padding: 0.75rem;
  }

  .card-amount {
    font-size: 0.9rem;
  }

  .card-detail-row {
    font-size: 0.8rem;
  }
}

/* Landscape orientation adjustments */
@media (max-height: 500px) and (orientation: landscape) {
  .wallet-history-container {
    padding: 1rem;
  }

  .wallet-history-header {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .header-top {
    margin-bottom: 1rem;
  }

  .controls-section {
    gap: 1rem;
  }
}

.fee-amount.waived {
  color: #28a745;
  font-weight: 600;
  position: relative;
}

.fee-amount.waived::after {
  content: " (Free Event)";
  font-size: 0.75rem;
  color: #28a745;
  font-weight: normal;
}

.card-detail-value.fee-waived {
  color: #28a745;
  font-weight: 600;
}

.card-detail-value.fee-waived::after {
  content: " (Free)";
  font-size: 0.75rem;
  color: #28a745;
  font-weight: normal;
}

.transaction-row.free-event {
  background-color: rgba(40, 167, 69, 0.05);
}

.transaction-card.free-event {
  border-left-color: #28a745;
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.05), rgba(40, 167, 69, 0.1));
}

.type-container .free-event-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #d4edda;
  color: #155724;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  margin-top: 0.25rem;
}
`}</style>
    </>
  )
}

export default WalletHistory
