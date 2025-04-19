import type React from "react"
import { Navigate } from "react-router-dom"
import useBookerStatus from "../context/useBookerStatus"
import Preloader from "./preloader"

interface BookerRouteProps {
  children: React.ReactNode
}

const BookerRoute: React.FC<BookerRouteProps> = ({ children }) => {
  const { isBooker, loading } = useBookerStatus()

  if (loading) {
    return <Preloader />
  }

  if (!isBooker) {
    return <Navigate to="/bookerRole" />
  }

  return <>{children}</>
}

export default BookerRoute

