import type React from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"


interface ChartsSectionProps {
  ticketSalesByDay: any[]
  ticketTypeData: any[]
  ticketSalesByType: any[]
  eventData: any
}

const ChartsSection: React.FC<ChartsSectionProps> = ({
  ticketSalesByDay,
  ticketTypeData,
  ticketSalesByType,
  eventData,
}) => {
  return (
    <>
      <div className="sales-chart-container">
        <h3>Ticket Sales Over Time</h3>
        {ticketSalesByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={ticketSalesByDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="count" name="Tickets Sold" stroke="#6b2fa5" fill="#d0b9e8" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="no-data-message">No sales data available yet.</p>
        )}
      </div>

      <div className="ticket-types">
        <h3>Ticket Types</h3>
        <div className="ticket-types-chart-container">
          {ticketTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Tickets Sold" fill="#6b2fa5" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data-message">No ticket type data available yet.</p>
          )}
        </div>
        <table className="ticket-types-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Price</th>
              <th>Sold</th>
            </tr>
          </thead>
          <tbody>
            {eventData.isFree ? (
              <tr>
                <td>Free Admission</td>
                <td>₦0.00</td>
                <td>{eventData.ticketsSold}</td>
              </tr>
            ) : (
              eventData.ticketPrices.map((ticket: any, index: number) => {
                const typeData = ticketSalesByType.find((t) => t.type === ticket.policy)
                const soldCount = typeData ? typeData.count : 0

                return (
                  <tr key={index}>
                    <td>{ticket.policy}</td>
                    <td>₦{Number.parseFloat(ticket.price.toString()).toFixed(2)}</td>
                    <td>{soldCount}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ChartsSection
