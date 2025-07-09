"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { Settings, AlertTriangle, Clock, FileText } from "lucide-react"

const Maintenance: React.FC = () => {
  const navigate = useNavigate()

  const handleViewLogs = () => {
    navigate("/logs")
  }

  return (
    <div className="maintenance-container">
      <div className="maintenance-content">
        {/* Header Section */}
        <div className="maintenance-header">
          <div className="maintenance-icon">
            <Settings className="spinning-gear" size={64} />
          </div>
          <h1 className="maintenance-title">Spotix is Under Maintenance</h1>
          <p className="maintenance-subtitle">
            We're currently performing scheduled maintenance to improve your experience
          </p>
        </div>

        {/* Status Section */}
        <div className="status-section">
          <div className="status-card">
            <div className="status-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="status-content">
              <h3>Service Temporarily Unavailable</h3>
              <p>
                Spotix is currently undergoing maintenance and is not available at the moment. We apologize for any
                inconvenience this may cause.
              </p>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">
              <Clock size={24} />
            </div>
            <div className="status-content">
              <h3>Access Restricted</h3>
              <p>
                Access to Spotix will not be available until maintenance is completed. Please check back later or
                monitor our maintenance logs for updates.
              </p>
            </div>
          </div>
        </div>

        {/* Logs Section */}
        <div className="logs-section">
          <div className="logs-info">
            <h2>Stay Updated</h2>
            <p>Check the maintenance logs to know how the maintenance is going</p>
          </div>

          <button className="logs-button" onClick={handleViewLogs}>
            <FileText size={20} />
            View Maintenance Logs
          </button>
        </div>

        {/* Footer */}
        <div className="maintenance-footer">
          <p>Thank you for your patience while we improve Spotix</p>
          <div className="estimated-time">
            <span>Estimated completion: We'll update you soon</span>
          </div>
        </div>
      </div>

      <style>{`
        .maintenance-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .maintenance-content {
          max-width: 800px;
          width: 100%;
          background: white;
          border-radius: 20px;
          padding: 3rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .maintenance-header {
          margin-bottom: 3rem;
        }

        .maintenance-icon {
          margin-bottom: 1.5rem;
        }

        .spinning-gear {
          color: #667eea;
          animation: spin 3s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .maintenance-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1a202c;
          margin: 0 0 1rem 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .maintenance-subtitle {
          font-size: 1.2rem;
          color: #718096;
          margin: 0;
          line-height: 1.6;
        }

        .status-section {
          display: grid;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .status-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 16px;
          border-left: 4px solid #667eea;
          text-align: left;
        }

        .status-icon {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 12px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .status-content h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 0.5rem 0;
        }

        .status-content p {
          color: #4a5568;
          margin: 0;
          line-height: 1.6;
        }

        .logs-section {
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          padding: 2.5rem;
          border-radius: 16px;
          margin-bottom: 2rem;
        }

        .logs-info {
          margin-bottom: 2rem;
        }

        .logs-info h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 0.5rem 0;
        }

        .logs-info p {
          color: #718096;
          font-size: 1.1rem;
          margin: 0;
        }

        .logs-button {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .logs-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .logs-button:active {
          transform: translateY(0);
        }

        .maintenance-footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 2rem;
          color: #718096;
        }

        .maintenance-footer p {
          font-size: 1.1rem;
          margin: 0 0 1rem 0;
        }

        .estimated-time {
          background: #fef5e7;
          color: #d69e2e;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          display: inline-block;
          font-weight: 600;
          border: 1px solid #f6e05e;
        }

        @media (max-width: 768px) {
          .maintenance-container {
            padding: 1rem;
          }

          .maintenance-content {
            padding: 2rem;
          }

          .maintenance-title {
            font-size: 2rem;
          }

          .maintenance-subtitle {
            font-size: 1rem;
          }

          .status-card {
            padding: 1.5rem;
          }

          .logs-section {
            padding: 2rem;
          }
        }

        @media (max-width: 480px) {
          .maintenance-title {
            font-size: 1.75rem;
          }

          .status-card {
            flex-direction: column;
            text-align: center;
          }

          .status-content {
            text-align: center;
          }

          .logs-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default Maintenance
