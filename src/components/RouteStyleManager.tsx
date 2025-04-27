"use client"

import type React from "react"

import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * Component that manages body styles and ensures they're cleaned up on route changes
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 */
const RouteStyleManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()

  useEffect(() => {
    // Store original body attributes and styles
    const originalBodyClasses = document.body.className
    const originalBodyStyle = document.body.getAttribute("style")
    const originalBodyDataAttributes = Array.from(document.body.attributes)
      .filter((attr) => attr.name.startsWith("data-"))
      .map((attr) => ({ name: attr.name, value: attr.value }))

    // Return cleanup function that runs when route changes or component unmounts
    return () => {
      // Reset body class and style to original state
      document.body.className = originalBodyClasses

      if (originalBodyStyle) {
        document.body.setAttribute("style", originalBodyStyle)
      } else {
        document.body.removeAttribute("style")
      }

      // Remove any data attributes that might have been added
      Array.from(document.body.attributes)
        .filter((attr) => attr.name.startsWith("data-"))
        .forEach((attr) => {
          document.body.removeAttribute(attr.name)
        })

      // Restore original data attributes
      originalBodyDataAttributes.forEach((attr) => {
        document.body.setAttribute(attr.name, attr.value)
      })
    }
  }, [location.pathname]) // Re-run when route changes

  return <>{children}</>
}

export default RouteStyleManager
