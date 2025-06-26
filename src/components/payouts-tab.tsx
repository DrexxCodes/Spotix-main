"use client"

import type React from "react"
import { Copy, Check, AlertCircle, Shield, Eye, EyeOff, Wallet, ArrowUpRight } from "lucide-react"

interface PayoutData {
  id?: string
  date: string
  amount: number
  status: string
  actionCode?: string
  reference?: string
  createdAt?: any
  payoutAmount?: number
  payableAmount?: number
  agentName?: string
  transactionTime?: string
}

interface PayoutsTabProps {
  payouts: PayoutData[]
  availableBalance: number
  totalPaidOut: number
  selectedPayoutId: string | null
  actionCode: string
  copiedField: string | null
  visibleActionCodes: Record<string, boolean>
  setSelectedPayoutId: (id: string | null) => void
  setActionCode: (code: string) => void
  handleConfirmPayout: (payoutId: string) => void
  copyToClipboard: (text: string, field: string) => void
  toggleActionCodeVisibility: (payoutId: string) => void
  formatTransactionTime: (timestamp: any) => string
}

const PayoutsTabSkeleton = () => (
  <div className="payouts-tab">
    <div className="skeleton-text skeleton-title"></div>
    <div className="payouts-info-alert">
      <div className="skeleton-icon"></div>
      <div className="skeleton-text skeleton-paragraph"></div>
    </div>

    <div className="balance-summary">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="balance-card">
          <div className="skeleton-icon"></div>
          <div className="balance-details">
            <div className="skeleton-text skeleton-subtitle"></div>
            <div className="skeleton-text skeleton-amount"></div>
            <div className="skeleton-text skeleton-label"></div>
          </div>
        </div>
      ))}
    </div>

    <div className="payouts-table-container">
      <table className="payouts-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Reference</th>
            <th>Amount</th>
            <th>Agent</th>
            <th>Action Code</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(3)].map((_, i) => (
            <tr key={i}>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-text skeleton-cell"></div>
              </td>
              <td>
                <div className="skeleton-badge"></div>
              </td>
              <td>
                <div className="skeleton-button"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const PayoutsTab: React.FC<PayoutsTabProps> = ({
  payouts,
  availableBalance,
  totalPaidOut,
  selectedPayoutId,
  actionCode,
  copiedField,
  visibleActionCodes,
  setSelectedPayoutId,
  setActionCode,
  handleConfirmPayout,
  copyToClipboard,
  toggleActionCodeVisibility,
  formatTransactionTime,
}) => {
  return (
    <div className="payouts-tab">
      <h3>Payout History</h3>
      <div className="payouts-info-alert">
        <AlertCircle size={18} />
        <p>
          When an admin initiates a payout, you'll see an action code below. Share this code with the admin to complete
          the payout process.
        </p>
      </div>

      <div className="balance-summary">
        <div className="balance-card">
          <div className="balance-icon">
            <Wallet size={24} />
          </div>
          <div className="balance-details">
            <h4>Available Balance</h4>
            <p className="balance-amount">₦{availableBalance.toFixed(2)}</p>
            <span className="balance-label">Ready to withdraw</span>
          </div>
        </div>
        <div className="balance-card">
          <div className="balance-icon">
            <ArrowUpRight size={24} />
          </div>
          <div className="balance-details">
            <h4>Total Paid Out</h4>
            <p className="balance-amount">₦{totalPaidOut.toFixed(2)}</p>
            <span className="balance-label">Successfully processed</span>
          </div>
        </div>
      </div>

      <div className="payouts-table-container">
        <table className="payouts-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Agent</th>
              <th>Action Code</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length > 0 ? (
              payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.date}</td>
                  <td>{payout.transactionTime || formatTransactionTime(payout.createdAt) || "N/A"}</td>
                  <td>{payout.reference || "N/A"}</td>
                  <td>₦{payout.payoutAmount ? payout.payoutAmount.toFixed(2) : payout.amount.toFixed(2)}</td>
                  <td>{payout.agentName || "Unknown"}</td>
                  <td className="action-code-cell">
                    {payout.actionCode ? (
                      <div className="action-code-container">
                        <span className={visibleActionCodes[payout.id || ""] ? "visible-code" : "hidden-code"}>
                          {visibleActionCodes[payout.id || ""] ? payout.actionCode : "••••••"}
                        </span>
                        <button
                          className="toggle-visibility-btn"
                          onClick={() => toggleActionCodeVisibility(payout.id || "")}
                          title={visibleActionCodes[payout.id || ""] ? "Hide code" : "Show code"}
                        >
                          {visibleActionCodes[payout.id || ""] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          className="copy-button"
                          onClick={() => copyToClipboard(payout.actionCode || "", `actionCode-${payout.id}`)}
                          title="Copy code"
                        >
                          {copiedField === `actionCode-${payout.id}` ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${payout.status.toLowerCase()}`}>{payout.status}</span>
                  </td>
                  <td>
                    {payout.status === "Pending" && payout.actionCode && (
                      <button className="confirm-payout-btn" onClick={() => setSelectedPayoutId(payout.id ?? null)}>
                        Confirm
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="no-payouts-message">
                  No payouts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Code Confirmation Modal */}
      {selectedPayoutId && (
        <div className="action-code-modal">
          <div className="action-code-content">
            <h4>Confirm Payout</h4>
            <p>Enter the action code provided by the admin to confirm this payout.</p>
            <div className="form-group">
              <label>Action Code</label>
              <input
                type="text"
                value={actionCode}
                onChange={(e) => setActionCode(e.target.value)}
                placeholder="Enter action code"
              />
            </div>
            <div className="action-buttons">
              <button className="confirm-button" onClick={() => handleConfirmPayout(selectedPayoutId)}>
                Confirm
              </button>
              <button
                className="cancel-button"
                onClick={() => {
                  setSelectedPayoutId(null)
                  setActionCode("")
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Information */}
      <div className="payout-security-info">
        <div className="security-header">
          <Shield size={18} />
          <h4>Payout Security Information</h4>
        </div>
        <div className="security-content">
          <p>For your security, we use action codes to verify payout requests. When an admin initiates a payout:</p>
          <ol>
            <li>You'll see an action code in the table above</li>
            <li>Share this code with the admin who initiated the payout</li>
            <li>The admin will enter this code to verify and process your payout</li>
            <li>Once verified, your payout will be processed</li>
          </ol>
          <p className="security-warning">
            <strong>Important:</strong> Never share your action codes with anyone except the admin who initiated your
            payout.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PayoutsTab
export { PayoutsTabSkeleton }
