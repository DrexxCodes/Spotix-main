"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"

export const useBookerStatus = () => {
  const [isBooker, setIsBooker] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkBookerStatus = async () => {
      setLoading(true)
      try {
        const user = auth.currentUser
        if (!user) {
          setIsBooker(false)
          return
        }

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsBooker(userData.isBooker === true)
        } else {
          setIsBooker(false)
        }
      } catch (error) {
        console.error("Error checking booker status:", error)
        setIsBooker(false)
      } finally {
        setLoading(false)
      }
    }

    checkBookerStatus()
  }, [])

  return { isBooker, loading }
}

export default useBookerStatus

