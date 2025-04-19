"use client"

import { type ReactNode, useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { checkCurrentUserIsAdmin } from "../services/admin"
import Preloader from "./preloader"

interface AdminRouteProps {
  children: ReactNode
  redirectTo?: string
}

const AdminRoute = ({ children, redirectTo = "/home" }: AdminRouteProps) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkCurrentUserIsAdmin()
      setIsAdmin(adminStatus)
    }

    checkAdmin()
  }, [])

  if (isAdmin === null) {
    return <Preloader loading={true} />
  }

  return isAdmin ? <>{children}</> : <Navigate to={redirectTo} />
}

export default AdminRoute
