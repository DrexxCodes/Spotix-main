"use client"

import type React from "react"
import "../pages/review.css"

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="dialog-overlay">
      <div className="dialog-container">
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
        </div>
        <div className="dialog-content">
          <p className="dialog-message">{message}</p>
        </div>
        <div className="dialog-actions">
          <button className="dialog-button cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="dialog-button confirm-button" onClick={onConfirm}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
