"use client"

import { useState } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"

interface PaymentProps {
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  eventCreatorId: string
}

interface PaymentResult {
  success: boolean
  message: string
  ticketId?: string
  ticketReference?: string
  userData?: {
    fullName: string
    email: string
  }
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [stepStatus, setStepStatus] = useState<"loading" | "success" | "error" | null>(null)

  const generateTicketId = () => {
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000).toString()
    const randomLetters = Math.random().toString(36).substring(2, 4).toUpperCase()

    // Insert the random letters at random positions in the numbers
    const pos1 = Math.floor(Math.random() * 8)
    const pos2 = Math.floor(Math.random() * 7) + pos1 + 1

    const part1 = randomNumbers.substring(0, pos1)
    const part2 = randomNumbers.substring(pos1, pos2)
    const part3 = randomNumbers.substring(pos2)

    return `SPTX-TX-${part1}${randomLetters[0]}${part2}${randomLetters[1]}${part3}`
  }

  const generateReference = () => {
    const letters = Math.random().toString(36).substring(2, 8).toUpperCase()
    const numbers = Math.floor(1000 + Math.random() * 9000).toString()
    return `${letters}${numbers}`
  }

  const processPayment = async (paymentData: PaymentProps): Promise<PaymentResult> => {
    setLoading(true)
    setCurrentStep("initializing")
    setStepStatus("loading")

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Simulate initializing payment
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setStepStatus("success")

      // Read wallet
      setCurrentStep("reading")
      setStepStatus("loading")
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        throw new Error("User data not found")
      }

      const userData = userDoc.data()
      const walletBalance = userData.wallet || 0
      setStepStatus("success")

      // Charge wallet
      setCurrentStep("charging")
      setStepStatus("loading")
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (walletBalance < paymentData.ticketPrice) {
        setStepStatus("error")
        return {
          success: false,
          message: "Insufficient funds in wallet",
        }
      }

      // Update wallet balance
      const newBalance = walletBalance - paymentData.ticketPrice
      await updateDoc(userDocRef, {
        wallet: newBalance,
      })

      setStepStatus("success")
      setCurrentStep("finalizing")
      setStepStatus("loading")

      // Generate ticket ID and reference
      const ticketId = generateTicketId()
      const ticketReference = generateReference()

      // Add to attendees collection for the event
      const attendeesCollectionRef = collection(
        db,
        "events",
        paymentData.eventCreatorId,
        "userEvents",
        paymentData.eventId,
        "attendees",
      )

      await addDoc(attendeesCollectionRef, {
        uid: user.uid,
        fullName: userData.fullName || "",
        email: userData.email || "",
        ticketType: paymentData.ticketType,
        ticketId,
        ticketReference,
        purchaseDate: serverTimestamp(),
        verified: false,
      })

      // Add to user's ticket history
      const ticketHistoryRef = collection(db, "TicketHistory", user.uid, "tickets")
      await addDoc(ticketHistoryRef, {
        eventId: paymentData.eventId,
        eventName: paymentData.eventName,
        ticketType: paymentData.ticketType,
        ticketPrice: paymentData.ticketPrice,
        ticketId,
        ticketReference,
        purchaseDate: serverTimestamp(),
      })

      // Update event stats (increment tickets sold and revenue)
      const eventDocRef = doc(db, "events", paymentData.eventCreatorId, "userEvents", paymentData.eventId)

      const eventDoc = await getDoc(eventDocRef)
      if (eventDoc.exists()) {
        const eventData = eventDoc.data()
        await updateDoc(eventDocRef, {
          ticketsSold: (eventData.ticketsSold || 0) + 1,
          totalRevenue: (eventData.totalRevenue || 0) + paymentData.ticketPrice,
        })
      }

      setStepStatus("success")

      return {
        success: true,
        message: "Payment successful",
        ticketId,
        ticketReference,
        userData: {
          fullName: userData.fullName || "",
          email: userData.email || "",
        },
      }
    } catch (error) {
      console.error("Payment processing error:", error)
      setStepStatus("error")
      return {
        success: false,
        message: "An error occurred during payment processing",
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    processPayment,
    loading,
    currentStep,
    stepStatus,
  }
}

export default usePayment

/**
 * This was never implemented
 * why?
 * I never saw the use of using a hook like this just to process payment
 */


