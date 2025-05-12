export const StatCardSkeleton = () => {
  return (
    <div className="stat-card animate-pulse">
      <div className="stat-icon">
        <div className="skeleton-icon"></div>
      </div>
      <div className="stat-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-value"></div>
      </div>
    </div>
  )
}

export const EventRowSkeleton = () => {
  return (
    <tr className="animate-pulse">
      <td>
        <div className="skeleton-text"></div>
      </td>
      <td className="hide-sm">
        <div className="skeleton-text"></div>
      </td>
      <td className="hide-md">
        <div className="skeleton-text"></div>
      </td>
      <td className="hide-md">
        <div className="skeleton-text"></div>
      </td>
      <td className="hide-sm">
        <div className="skeleton-text"></div>
      </td>
      <td>
        <div className="skeleton-badge"></div>
      </td>
      <td>
        <div className="skeleton-button"></div>
      </td>
    </tr>
  )
}

export const MobileEventCardSkeleton = () => {
  return (
    <div className="mobile-event-card animate-pulse">
      <div className="mobile-event-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-badge"></div>
      </div>
      <div className="mobile-event-details">
        <div className="mobile-event-detail">
          <span className="detail-label">Date:</span>
          <div className="skeleton-text"></div>
        </div>
        <div className="mobile-event-detail">
          <span className="detail-label">Tickets:</span>
          <div className="skeleton-text"></div>
        </div>
        <div className="mobile-event-detail">
          <span className="detail-label">Revenue:</span>
          <div className="skeleton-text"></div>
        </div>
        <div className="mobile-event-detail">
          <span className="detail-label">Balance:</span>
          <div className="skeleton-text"></div>
        </div>
      </div>
      <div className="skeleton-button-full"></div>
    </div>
  )
}

export const DashboardSkeleton = () => {
  return (
    <div className="booker-dashboard-container">
      <div className="dashboard-header-container">
        <div className="dashboard-header">
          <div className="greeting-container animate-pulse">
            <div className="skeleton-greeting"></div>
          </div>
          <div className="skeleton-button"></div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="stats-grid">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="recent-events-section">
          <div className="section-header">
            <div className="skeleton-section-title"></div>
            <div className="skeleton-button"></div>
          </div>

          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th className="hide-sm">Date</th>
                  <th className="hide-md">Tickets</th>
                  <th className="hide-md">Revenue</th>
                  <th className="hide-sm">Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <EventRowSkeleton />
                <EventRowSkeleton />
                <EventRowSkeleton />
                <EventRowSkeleton />
                <EventRowSkeleton />
              </tbody>
            </table>
          </div>

          <div className="mobile-events-cards">
            <MobileEventCardSkeleton />
            <MobileEventCardSkeleton />
            <MobileEventCardSkeleton />
          </div>
        </div>

        <div className="quick-actions">
          <div className="skeleton-section-title"></div>
          <div className="actions-grid">
            <div className="action-card animate-pulse">
              <div className="skeleton-icon-large"></div>
              <div className="skeleton-text"></div>
            </div>
            <div className="action-card animate-pulse">
              <div className="skeleton-icon-large"></div>
              <div className="skeleton-text"></div>
            </div>
            <div className="action-card animate-pulse">
              <div className="skeleton-icon-large"></div>
              <div className="skeleton-text"></div>
            </div>
            <div className="action-card animate-pulse">
              <div className="skeleton-icon-large"></div>
              <div className="skeleton-text"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
