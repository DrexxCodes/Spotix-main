"use client"

import type React from "react"
import "./skeleton.css"

interface DiscountData {
  code: string
  type: "percentage" | "flat"
  value: number
  maxUses: number
  usedCount: number
  active: boolean
}

interface DiscountsTabProps {
  discounts: DiscountData[]
  newDiscount: DiscountData
  handleDiscountInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  handleAddDiscount: () => void
  handleToggleDiscountStatus: (index: number) => void
}

const DiscountsTabSkeleton = () => (
  <div className="discounts-tab">
    <div className="skeleton-text skeleton-title"></div>
    <div className="discount-form">
      <div className="form-section">
        <div className="skeleton-text skeleton-subtitle"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="form-group">
            <div className="skeleton-text skeleton-label"></div>
            <div className="skeleton-input"></div>
          </div>
        ))}
        <div className="skeleton-button skeleton-button-large"></div>
      </div>
      <div className="form-section">
        <div className="skeleton-text skeleton-subtitle"></div>
        <div className="discounts-table-container">
          <table className="discounts-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Uses</th>
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
    </div>
  </div>
)

const DiscountsTab: React.FC<DiscountsTabProps> = ({
  discounts,
  newDiscount,
  handleDiscountInputChange,
  handleAddDiscount,
  handleToggleDiscountStatus,
}) => {
  return (
    <div className="discounts-tab">
      <h3>Discount Codes</h3>

      <div className="discount-form">
        <div className="form-section">
          <h4>Create New Discount</h4>
          <div className="form-group">
            <label>Discount Code</label>
            <input
              type="text"
              name="code"
              value={newDiscount.code}
              onChange={handleDiscountInputChange}
              placeholder="e.g. SUMMER20"
              required
            />
          </div>

          <div className="form-group">
            <label>Discount Type</label>
            <select name="type" value={newDiscount.type} onChange={handleDiscountInputChange}>
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₦)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Discount Value</label>
            <div className="discount-value-input">
              <input
                type="number"
                name="value"
                value={newDiscount.value}
                onChange={handleDiscountInputChange}
                min="0"
                max={newDiscount.type === "percentage" ? 100 : undefined}
                required
              />
              <span className="discount-value-symbol">{newDiscount.type === "percentage" ? "%" : "₦"}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Maximum Uses</label>
            <input
              type="number"
              name="maxUses"
              value={newDiscount.maxUses}
              onChange={handleDiscountInputChange}
              min="1"
              required
            />
          </div>

          <button type="button" className="add-discount-button" onClick={handleAddDiscount}>
            Add Discount Code
          </button>
        </div>

        <div className="form-section">
          <h4>Active Discount Codes</h4>
          {discounts.length > 0 ? (
            <div className="discounts-table-container">
              <table className="discounts-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Uses</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((discount, index) => (
                    <tr key={index}>
                      <td>{discount.code}</td>
                      <td>{discount.type === "percentage" ? "Percentage" : "Flat Amount"}</td>
                      <td>
                        {discount.value}
                        {discount.type === "percentage" ? "%" : "₦"}
                      </td>
                      <td>
                        {discount.usedCount} / {discount.maxUses}
                      </td>
                      <td>
                        <span className={`status-badge ${discount.active ? "status-verified" : "status-pending"}`}>
                          {discount.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`toggle-status-btn ${discount.active ? "deactivate" : "activate"}`}
                          onClick={() => handleToggleDiscountStatus(index)}
                        >
                          {discount.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-discounts-message">No discount codes created yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DiscountsTab
export { DiscountsTabSkeleton }
