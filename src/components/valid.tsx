import type React from "react"
import { CheckCircle } from "lucide-react"

interface ValidProps {
  isVerified: boolean
  size?: number
}

const Valid: React.FC<ValidProps> = ({ isVerified, size = 16 }) => {
  if (!isVerified) return null

  return (
    <span className="verified-badge" title="Verified Booker">
      <CheckCircle size={size} className="verified-icon" />
    </span>
  )
}

export default Valid

