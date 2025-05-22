"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore"
import AgentHeader from "../components/AgentHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import {
  Wallet,
  Tag,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Ticket,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import "./agent-transactions.css"

interface Transaction {
  id: string
  date: Date
  amount: number
  type: string
  [key: string]: any
}

const AgentTransactions = () => {
  const [loading, setLoading] = useState(true)
  const [agentData, setAgentData] = useState<any>(null)
  const [error, setError] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [expandedSections, setExpandedSections] = useState({
    funding: true,
    sales: true,
    payouts: true,
  })

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          window.location.href = "/login"
          return
        }

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()

          // Check if user is an agent
          if (!userData.isAgent) {
            window.location.href = "/home"
            return
          }

          setAgentData({
            uid: user.uid,
            agentId: userData.agentId || "UNKNOWN",
            name: userData.fullName || userData.username || "Agent",
            agentWallet: userData.agentWallet || 0,
            agentGain: userData.agentGain || 0,
          })

          // Load transactions
          await loadTransactions(user.uid)
        } else {
          window.location.href = "/login"
          return
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking agent status:", error)
        setError("Error checking agent status. Please try again.")
        setLoading(false)
      }
    }

    checkAgentStatus()
  }, [])

  const loadTransactions = async (uid: string) => {
    try {
      const allTransactions: Transaction[] = []

      // Load funding transactions
      const fundingRef = collection(db, "users", uid, "transactions", "funding", "records")
      const fundingQuery = query(fundingRef, orderBy("date", "desc"))
      const fundingSnapshot = await getDocs(fundingQuery)

      fundingSnapshot.forEach((doc) => {
        const data = doc.data()
        allTransactions.push({
          id: doc.id,
          date: data.date?.toDate() || new Date(),
          amount: data.amount || 0,
          type: "funding",
          adminName: data.adminName || "Admin",
          previousBalance: data.previousBalance || 0,
          newBalance: data.newBalance || 0,
        })
      })

      // Load sales transactions
      const salesRef = collection(db, "users", uid, "transactions", "sales", "records")
      const salesQuery = query(salesRef, orderBy("purchaseDate", "desc"))
      const salesSnapshot = await getDocs(salesQuery)

      salesSnapshot.forEach((doc) => {
        const data = doc.data()
        allTransactions.push({
          id: doc.id,
          date: data.purchaseDate?.toDate() || new Date(),
          amount: data.ticketPrice || 0,
          type: "sale",
          eventName: data.eventName || "Unknown Event",
          ticketType: data.ticketType || "Standard",
          customerName: data.customerName || "Unknown Customer",
          ticketId: data.ticketId || "",
          commission: 100, // 100 NGN per ticket
        })
      })

      // Load payout transactions
      const payoutsRef = collection(db, "users", uid, "transactions", "payouts", "records")
      const payoutsQuery = query(payoutsRef, orderBy("date", "desc"))
      const payoutsSnapshot = await getDocs(payoutsQuery)

      payoutsSnapshot.forEach((doc) => {
        const data = doc.data()
        allTransactions.push({
          id: doc.id,
          date: data.date?.toDate() || new Date(),
          amount: data.amount || 0,
          type: "payout",
          adminName: data.adminName || "Admin",
          previousBalance: data.previousBalance || 0,
          newBalance: data.newBalance || 0,
          reference: data.reference || "",
        })
      })

      // Sort all transactions by date
      allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime())
      setTransactions(allTransactions)
    } catch (error) {
      console.error("Error loading transactions:", error)
      setError("Error loading transactions. Please try again.")
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filterTransactions = (type: string) => {
    if (type === "all") return transactions
    return transactions.filter((transaction) => transaction.type === type)
  }

  const calculateTotals = () => {
    let totalFunding = 0
    let totalSales = 0
    let totalCommission = 0
    let totalPayouts = 0

    transactions.forEach((transaction) => {
      if (transaction.type === "funding") {
        totalFunding += transaction.amount
      } else if (transaction.type === "sale") {
        totalSales += transaction.amount
        totalCommission += transaction.commission || 0
      } else if (transaction.type === "payout") {
        totalPayouts += transaction.amount
      }
    })

    return {
      totalFunding,
      totalSales,
      totalCommission,
      totalPayouts,
    }
  }

  const { totalFunding, totalSales, totalCommission, totalPayouts } = calculateTotals()

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <AgentHeader />
      <div className="agent-transactions-container">
        <div className="agent-transactions-header">
          <h1>Agent Transactions</h1>
          {agentData && (
            <div className="agent-info">
              <div className="agent-id">
                <Tag size={16} />
                <span>Agent ID: {agentData.agentId}</span>
              </div>
              <div className="agent-wallet">
                <Wallet size={16} />
                <span>Wallet: ₦{agentData.agentWallet.toFixed(2)}</span>
              </div>
              <div className="agent-earnings">
                <DollarSign size={16} />
                <span>Earnings: ₦{agentData.agentGain.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <div className="transaction-summary">
          <div className="summary-card">
            <div className="summary-icon funding">
              <ArrowDownCircle size={24} />
            </div>
            <div className="summary-details">
              <h3>Total Funding</h3>
              <p className="summary-amount">₦{totalFunding.toFixed(2)}</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon sales">
              <Ticket size={24} />
            </div>
            <div className="summary-details">
              <h3>Total Sales</h3>
              <p className="summary-amount">₦{totalSales.toFixed(2)}</p>
              <p className="summary-sub">{transactions.filter((t) => t.type === "sale").length} tickets sold</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon commission">
              <DollarSign size={24} />
            </div>
            <div className="summary-details">
              <h3>Total Commission</h3>
              <p className="summary-amount">₦{totalCommission.toFixed(2)}</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon payouts">
              <ArrowUpCircle size={24} />
            </div>
            <div className="summary-details">
              <h3>Total Payouts</h3>
              <p className="summary-amount">₦{totalPayouts.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="transactions-tabs">
          <button className={`tab-button ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
            All Transactions
          </button>
          <button
            className={`tab-button ${activeTab === "funding" ? "active" : ""}`}
            onClick={() => setActiveTab("funding")}
          >
            Funding
          </button>
          <button className={`tab-button ${activeTab === "sale" ? "active" : ""}`} onClick={() => setActiveTab("sale")}>
            Sales
          </button>
          <button
            className={`tab-button ${activeTab === "payout" ? "active" : ""}`}
            onClick={() => setActiveTab("payout")}
          >
            Payouts
          </button>
        </div>

        <div className="transactions-section">
          {activeTab === "all" && (
            <>
              <div className="section-header" onClick={() => toggleSection("funding")}>
                <h2>
                  <ArrowDownCircle size={18} />
                  Wallet Funding
                </h2>
                <button className="toggle-button">
                  {expandedSections.funding ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {expandedSections.funding && (
                <div className="transaction-table-container">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Amount</th>
                        <th>Admin</th>
                        <th>Previous Balance</th>
                        <th>New Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterTransactions("funding").length > 0 ? (
                        filterTransactions("funding").map((transaction) => (
                          <tr key={transaction.id}>
                            <td>{formatDate(transaction.date)}</td>
                            <td>{formatTime(transaction.date)}</td>
                            <td className="amount-cell positive">+₦{transaction.amount.toFixed(2)}</td>
                            <td>{transaction.adminName}</td>
                            <td>₦{transaction.previousBalance.toFixed(2)}</td>
                            <td>₦{transaction.newBalance.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="no-data">
                            No funding transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="section-header" onClick={() => toggleSection("sales")}>
                <h2>
                  <Ticket size={18} />
                  Sales
                </h2>
                <button className="toggle-button">
                  {expandedSections.sales ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {expandedSections.sales && (
                <div className="transaction-table-container">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Event</th>
                        <th>Ticket Type</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterTransactions("sale").length > 0 ? (
                        filterTransactions("sale").map((transaction) => (
                          <tr key={transaction.id}>
                            <td>{formatDate(transaction.date)}</td>
                            <td>{formatTime(transaction.date)}</td>
                            <td className="event-name">{transaction.eventName}</td>
                            <td>{transaction.ticketType}</td>
                            <td>{transaction.customerName}</td>
                            <td>₦{transaction.amount.toFixed(2)}</td>
                            <td className="commission-cell">+₦{transaction.commission.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="no-data">
                            No sales transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="section-header" onClick={() => toggleSection("payouts")}>
                <h2>
                  <ArrowUpCircle size={18} />
                  Payouts
                </h2>
                <button className="toggle-button">
                  {expandedSections.payouts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {expandedSections.payouts && (
                <div className="transaction-table-container">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Amount</th>
                        <th>Admin</th>
                        <th>Reference</th>
                        <th>Previous Balance</th>
                        <th>New Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterTransactions("payout").length > 0 ? (
                        filterTransactions("payout").map((transaction) => (
                          <tr key={transaction.id}>
                            <td>{formatDate(transaction.date)}</td>
                            <td>{formatTime(transaction.date)}</td>
                            <td className="amount-cell negative">-₦{transaction.amount.toFixed(2)}</td>
                            <td>{transaction.adminName}</td>
                            <td className="reference">{transaction.reference}</td>
                            <td>₦{transaction.previousBalance.toFixed(2)}</td>
                            <td>₦{transaction.newBalance.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="no-data">
                            No payout transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "funding" && (
            <div className="transaction-table-container">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Admin</th>
                    <th>Previous Balance</th>
                    <th>New Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filterTransactions("funding").length > 0 ? (
                    filterTransactions("funding").map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{formatTime(transaction.date)}</td>
                        <td className="amount-cell positive">+₦{transaction.amount.toFixed(2)}</td>
                        <td>{transaction.adminName}</td>
                        <td>₦{transaction.previousBalance.toFixed(2)}</td>
                        <td>₦{transaction.newBalance.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="no-data">
                        No funding transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "sale" && (
            <div className="transaction-table-container">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Ticket Type</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {filterTransactions("sale").length > 0 ? (
                    filterTransactions("sale").map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{formatTime(transaction.date)}</td>
                        <td className="event-name">{transaction.eventName}</td>
                        <td>{transaction.ticketType}</td>
                        <td>{transaction.customerName}</td>
                        <td>₦{transaction.amount.toFixed(2)}</td>
                        <td className="commission-cell">+₦{transaction.commission.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="no-data">
                        No sales transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "payout" && (
            <div className="transaction-table-container">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Admin</th>
                    <th>Reference</th>
                    <th>Previous Balance</th>
                    <th>New Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filterTransactions("payout").length > 0 ? (
                    filterTransactions("payout").map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{formatTime(transaction.date)}</td>
                        <td className="amount-cell negative">-₦{transaction.amount.toFixed(2)}</td>
                        <td>{transaction.adminName}</td>
                        <td className="reference">{transaction.reference}</td>
                        <td>₦{transaction.previousBalance.toFixed(2)}</td>
                        <td>₦{transaction.newBalance.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="no-data">
                        No payout transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default AgentTransactions
