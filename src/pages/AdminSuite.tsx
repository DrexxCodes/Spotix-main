"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore"
import { checkCurrentUserIsAdmin } from "../services/admin"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { UserPlus, UserCheck, Search, DollarSign, Shield, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import Preloader from "../components/preloader"
import { generateBVT, generateActionCode } from "../utils/generators"

// Define interfaces for our data types
interface AdminUser {
  uid: string
  email: string
  name: string
  addedAt: any
  addedBy: string
}

interface UserData {
  email?: string
  fullName?: string
  username?: string
  isBooker?: boolean
  phoneNumber?: string
  accountName?: string
  accountNumber?: string
  bankName?: string
}

interface SearchedUser {
  uid: string
  email: string
  name: string
  isBooker: boolean
}

// Update the VerificationData interface to match the verification data structure
interface VerificationData {
  id: string
  userId: string
  address?: string
  verificationState: string
  nin?: {
    status: string
    dateUploaded: string
    timeUploaded: string
    fileUrl: string
  }
  selfie?: {
    status: string
    dateUploaded: string
    timeUploaded: string
    fileUrl: string
  }
  proofOfAddress?: {
    status: string
    dateUploaded: string
    timeUploaded: string
    fileUrl: string
  }
  userName?: string
  userEmail?: string
  phoneNumber?: string
  accountName?: string
  accountNumber?: string
  bankName?: string
  createdAt?: any
}

// Update the EventData interface to include ticket prices and financial tracking fields
interface EventData {
  id: string
  eventName: string
  eventDate: string
  payId: string
  ticketsSold: number
  totalRevenue: number
  userId: string
  userName: string
  ticketPrices?: { policy: string; price: number }[]
  isFree?: boolean
  availableRevenue?: number
  totalPaidOut?: number
}

interface PayoutData {
  id: string
  payoutAmount: number
  payableAmount: number
  actionCode: string
  status: string
  createdAt: any
  agentId: string
  agentName: string
}

interface TicketSale {
  date: string
  count: number
  amount: number
  sales: {
    name: string
    email: string
    ticketType: string
    amount: number
  }[]
}

// Helper function to safely format timestamps
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return "Unknown"

  // If it's a Firestore timestamp (has seconds property)
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString()
  }

  // If it's already a Date object or string
  try {
    return new Date(timestamp).toLocaleString()
  } catch (e) {
    return "Invalid date"
  }
}

const AdminSuite = () => {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("users")
  const [message, setMessage] = useState({ text: "", type: "" })

  // Admin management states
  const [newAdminUid, setNewAdminUid] = useState("")
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null)
  const [searchingUser, setSearchingUser] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])

  // Verification states
  const [verificationId, setVerificationId] = useState("")
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [searchingVerification, setSearchingVerification] = useState(false)
  const [pendingVerifications, setPendingVerifications] = useState<VerificationData[]>([])

  // Payout states
  const [eventId, setEventId] = useState("")
  const [payId, setPayId] = useState("")
  const [bvt, setBvt] = useState("")
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [searchingEvent, setSearchingEvent] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState("")
  const [payableAmount, setPayableAmount] = useState("")
  const [actionCode, setActionCode] = useState("")
  const [payouts, setPayouts] = useState<PayoutData[]>([])
  const [ticketSales, setTicketSales] = useState<TicketSale[]>([])
  const [actionCodeSent, setActionCodeSent] = useState(false)
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null)

  // Track available balance and total paid out
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [totalPaidOut, setTotalPaidOut] = useState<number>(0)

  useEffect(() => {
    const checkAdminStatus = async () => {
      const isAdmin = await checkCurrentUserIsAdmin()
      if (!isAdmin) {
        window.location.href = "/home"
        return
      }

      // Load pending verifications
      await loadPendingVerifications()

      // Load admin users
      await loadAdminUsers()

      setLoading(false)
    }

    checkAdminStatus()
  }, [])

  const loadAdminUsers = async () => {
    try {
      const adminsRef = collection(db, "admins")
      const querySnapshot = await getDocs(adminsRef)

      const adminsList: AdminUser[] = []
      for (const docSnapshot of querySnapshot.docs) {
        const adminData = docSnapshot.data()

        // Get user details
        try {
          const userDoc = await getDoc(doc(db, "users", docSnapshot.id))
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData
            adminsList.push({
              uid: docSnapshot.id,
              email: userData.email || adminData.email || "",
              name: userData.fullName || userData.username || adminData.name || "Unknown",
              addedAt: adminData.addedAt || null,
              addedBy: adminData.addedBy || "Unknown",
            })
          } else {
            adminsList.push({
              uid: docSnapshot.id,
              email: adminData.email || "",
              name: adminData.name || "Unknown",
              addedAt: adminData.addedAt || null,
              addedBy: adminData.addedBy || "Unknown",
            })
          }
        } catch (error) {
          console.error("Error getting user data for admin:", error)
          adminsList.push({
            uid: docSnapshot.id,
            email: adminData.email || "",
            name: adminData.name || "Unknown",
            addedAt: adminData.addedAt || null,
            addedBy: adminData.addedBy || "Unknown",
          })
        }
      }

      setAdmins(adminsList)
    } catch (error) {
      console.error("Error loading admins:", error)
      setMessage({
        text: "Failed to load admin users",
        type: "error",
      })
    }
  }

  const loadPendingVerifications = async () => {
    try {
      const verificationsRef = collection(db, "verification")
      const q = query(verificationsRef, where("verificationState", "==", "Awaiting Verification"))
      const querySnapshot = await getDocs(q)

      const verificationsList: VerificationData[] = []
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        verificationsList.push({
          id: docSnapshot.id,
          userId: data.uid || "",
          address: data.address || "",
          verificationState: data.verificationState || "Awaiting Verification",
          nin: data.nin || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
          selfie: data.selfie || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
          proofOfAddress: data.proofOfAddress || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
          createdAt: data.selfie?.dateUploaded || null,
        })
      })

      setPendingVerifications(verificationsList)
    } catch (error) {
      console.error("Error loading pending verifications:", error)
    }
  }

  const searchUserByUid = async () => {
    if (!newAdminUid.trim()) {
      setMessage({ text: "Please enter a user ID", type: "error" })
      return
    }

    setSearchingUser(true)
    setSearchedUser(null)

    try {
      const userDocRef = doc(db, "users", newAdminUid.trim())
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData
        setSearchedUser({
          uid: userDoc.id,
          email: userData.email || "No email",
          name: userData.fullName || userData.username || "Unknown",
          isBooker: userData.isBooker || false,
        })
      } else {
        setMessage({ text: "User not found", type: "error" })
      }
    } catch (error) {
      console.error("Error searching for user:", error)
      setMessage({ text: "Error searching for user", type: "error" })
    } finally {
      setSearchingUser(false)
    }
  }

  const addAdmin = async () => {
    if (!searchedUser) {
      setMessage({ text: "Please search for a user first", type: "error" })
      return
    }

    setLoading(true)

    try {
      // Check if already an admin
      const adminDocRef = doc(db, "admins", searchedUser.uid)
      const adminDoc = await getDoc(adminDocRef)

      if (adminDoc.exists()) {
        setMessage({ text: "This user is already an admin", type: "error" })
        setLoading(false)
        return
      }

      // Add to admins collection
      await setDoc(adminDocRef, {
        email: searchedUser.email,
        name: searchedUser.name,
        addedAt: new Date(),
        addedBy: auth.currentUser?.uid || "Unknown",
      })

      setMessage({ text: "Admin added successfully", type: "success" })
      setNewAdminUid("")
      setSearchedUser(null)

      // Refresh admin list
      await loadAdminUsers()
    } catch (error) {
      console.error("Error adding admin:", error)
      setMessage({ text: "Failed to add admin", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const removeAdmin = async (uid: string) => {
    if (uid === auth.currentUser?.uid) {
      setMessage({ text: "You cannot remove yourself as an admin", type: "error" })
      return
    }

    setLoading(true)

    try {
      await deleteDoc(doc(db, "admins", uid))
      setMessage({ text: "Admin removed successfully", type: "success" })

      // Refresh admin list
      await loadAdminUsers()
    } catch (error) {
      console.error("Error removing admin:", error)
      setMessage({ text: "Failed to remove admin", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const searchVerification = async () => {
    if (!verificationId.trim()) {
      setMessage({ text: "Please enter a verification ID", type: "error" })
      return
    }

    setSearchingVerification(true)
    setVerificationData(null)

    try {
      const verificationDocRef = doc(db, "verification", verificationId.trim())
      const verificationDoc = await getDoc(verificationDocRef)

      if (verificationDoc.exists()) {
        const data = verificationDoc.data()

        // Get user details
        const userDocRef = doc(db, "users", data.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData

          setVerificationData({
            id: verificationDoc.id,
            userId: data.uid,
            address: data.address || "Not provided",
            verificationState: data.verificationState || "Awaiting Verification",
            nin: data.nin || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            selfie: data.selfie || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            proofOfAddress: data.proofOfAddress || {
              status: "pending",
              dateUploaded: "",
              timeUploaded: "",
              fileUrl: "",
            },
            userName: userData.fullName || userData.username || "Unknown",
            userEmail: userData.email || "No email",
            phoneNumber: userData.phoneNumber || "Not provided",
            accountName: userData.accountName || "Not provided",
            accountNumber: userData.accountNumber || "Not provided",
            bankName: userData.bankName || "Not provided",
            createdAt: data.selfie?.dateUploaded || null,
          })
        } else {
          setVerificationData({
            id: verificationDoc.id,
            userId: data.uid,
            address: data.address || "Not provided",
            verificationState: data.verificationState || "Awaiting Verification",
            nin: data.nin || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            selfie: data.selfie || { status: "pending", dateUploaded: "", timeUploaded: "", fileUrl: "" },
            proofOfAddress: data.proofOfAddress || {
              status: "pending",
              dateUploaded: "",
              timeUploaded: "",
              fileUrl: "",
            },
            userName: "User not found",
            userEmail: "User not found",
            phoneNumber: "Not provided",
            accountName: "Not provided",
            accountNumber: "Not provided",
            bankName: "Not provided",
            createdAt: data.selfie?.dateUploaded || null,
          })
        }
      } else {
        setMessage({ text: "Verification not found", type: "error" })
      }
    } catch (error) {
      console.error("Error searching for verification:", error)
      setMessage({ text: "Error searching for verification", type: "error" })
    } finally {
      setSearchingVerification(false)
    }
  }

  const verifyBooker = async (verificationId: string, userId: string) => {
    setLoading(true)

    try {
      // Generate BVT
      const bvt = generateBVT()

      const batch = writeBatch(db)

      // Get references to both documents
      const verificationDocRef = doc(db, "verification", verificationId)
      const userDocRef = doc(db, "users", userId)

      // Set the updates in the batch
      batch.update(verificationDocRef, {
        verificationState: "Verified",
        verifiedAt: new Date(),
        verifiedBy: auth.currentUser?.uid || "Unknown",
        bvt: bvt,
      })

      batch.update(userDocRef, {
        isVerified: true,
        bvt: bvt,
      })

      // Commit the batch
      await batch.commit()

      setMessage({ text: "Booker verified successfully", type: "success" })
      setVerificationData(null)
      setVerificationId("")

      // Refresh pending verifications
      await loadPendingVerifications()
    } catch (error) {
      console.error("Error verifying booker:", error)

      // More detailed error handling
      if (error instanceof Error) {
        if (error.message.includes("permission")) {
          setMessage({
            text: "Permission denied. Your account doesn't have sufficient privileges to verify bookers.",
            type: "error",
          })
        } else {
          setMessage({ text: "Failed to verify booker: " + error.message, type: "error" })
        }
      } else {
        setMessage({ text: "Failed to verify booker", type: "error" })
      }

      console.log(
        "This may be a Firebase security rules issue. Make sure your security rules allow admin users to write to the verification and users collections.",
      )
    } finally {
      setLoading(false)
    }
  }

  const searchEvent = async () => {
    if (!eventId.trim() || !payId.trim() || !bvt.trim()) {
      setMessage({ text: "Please enter all required fields", type: "error" })
      return
    }

    setSearchingEvent(true)
    setEventData(null)
    setPayouts([])
    setTicketSales([])

    try {
      // First, find the user with this BVT
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("bvt", "==", bvt.trim()))
      const userSnapshot = await getDocs(q)

      if (userSnapshot.empty) {
        setMessage({ text: "No user found with this BVT", type: "error" })
        setSearchingEvent(false)
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      const userId = userDoc.id

      // Now search for the event
      const eventDocRef = doc(db, "events", userId, "userEvents", eventId.trim())
      const eventDoc = await getDoc(eventDocRef)

      if (!eventDoc.exists()) {
        setMessage({ text: "Event not found", type: "error" })
        setSearchingEvent(false)
        return
      }

      const eventData = eventDoc.data()

      // Verify payId matches
      if (eventData.payId !== payId.trim()) {
        setMessage({ text: "Pay ID does not match for this event", type: "error" })
        setSearchingEvent(false)
        return
      }

      // Get payouts for this event
      const payoutsRef = collection(db, "events", userId, "userEvents", eventId.trim(), "payouts")
      const payoutsQuery = query(payoutsRef, orderBy("createdAt", "desc"))
      const payoutsSnapshot = await getDocs(payoutsQuery)

      const payoutsList: PayoutData[] = []
      let calculatedTotalPaidOut = 0

      payoutsSnapshot.forEach((doc) => {
        const data = doc.data()
        // Only count completed payouts towards total paid out
        if (data.status === "completed") {
          calculatedTotalPaidOut += Number(data.payoutAmount || 0)
        }

        payoutsList.push({
          id: doc.id,
          payoutAmount: data.payoutAmount || 0,
          payableAmount: data.payableAmount || 0,
          actionCode: data.actionCode || "",
          status: data.status || "pending",
          createdAt: data.createdAt,
          agentId: data.agentId || "",
          agentName: data.agentName || "",
        })
      })

      // Calculate available balance
      const totalRevenue = eventData.totalRevenue || 0

      // Use stored values if available, otherwise calculate
      const storedTotalPaidOut = eventData.totalPaidOut !== undefined ? eventData.totalPaidOut : calculatedTotalPaidOut
      const storedAvailableRevenue =
        eventData.availableRevenue !== undefined ? eventData.availableRevenue : totalRevenue - calculatedTotalPaidOut

      setTotalPaidOut(storedTotalPaidOut)
      setAvailableBalance(storedAvailableRevenue)

      // Get attendees (ticket sales) for this event
      const attendeesRef = collection(db, "events", userId, "userEvents", eventId.trim(), "attendees")
      const attendeesSnapshot = await getDocs(attendeesRef)

      const attendeesList: any[] = []
      attendeesSnapshot.forEach((doc) => {
        const data = doc.data()
        attendeesList.push({
          id: doc.id,
          fullName: data.fullName || "Unknown",
          email: data.email || "No email",
          ticketType: data.ticketType || "Standard",
          purchaseDate: data.purchaseDate || "Unknown",
          finalPrice: data.finalPrice || data.ticketPrice || 0,
        })
      })

      // Group ticket sales by date
      const salesByDate: { [key: string]: TicketSale } = {}
      attendeesList.forEach((attendee) => {
        const date = attendee.purchaseDate || "Unknown"
        if (!salesByDate[date]) {
          salesByDate[date] = {
            date,
            count: 0,
            amount: 0,
            sales: [],
          }
        }

        salesByDate[date].count += 1
        salesByDate[date].amount += Number(attendee.finalPrice || 0)
        salesByDate[date].sales.push({
          name: attendee.fullName,
          email: attendee.email,
          ticketType: attendee.ticketType,
          amount: attendee.finalPrice || 0,
        })
      })

      const salesList = Object.values(salesByDate)

      // Set state with all the data
      setEventData({
              id: eventDoc.id,
              eventName: eventData.eventName || "Unknown Event",
              eventDate: eventData.eventDate || "Unknown Date",
              payId: eventData.payId || "",
              ticketsSold: eventData.ticketsSold || 0,
              userId,
              userName: userData.fullName || userData.username || "Unknown",
              // Add ticket prices from the event data
              ticketPrices: eventData.ticketPrices || [],
              isFree: eventData.isFree || false,
              // Add financial tracking fields
              totalRevenue: eventData.totalRevenue || 0,
              availableRevenue: storedAvailableRevenue,
              totalPaidOut: storedTotalPaidOut,
            })
      setPayouts(payoutsList)
      setTicketSales(salesList)
    } catch (error) {
      console.error("Error searching for event:", error)
      setMessage({ text: "Error searching for event", type: "error" })
    } finally {
      setSearchingEvent(false)
    }
  }

  const calculatePayableAmount = () => {
    if (!payoutAmount.trim() || isNaN(Number(payoutAmount))) {
      setMessage({ text: "Please enter a valid payout amount", type: "error" })
      return
    }

    const amount = Number(payoutAmount)

    if (!eventData) {
      setMessage({ text: "No event data available", type: "error" })
      return
    }

    // Use the stored available balance
    if (amount > availableBalance) {
      setMessage({ text: "Payout amount exceeds available balance", type: "error" })
      return
    }

    // Calculate payable amount (80% of payout amount)
    const payable = amount * 0.8
    setPayableAmount(payable.toFixed(2))
  }

  const sendActionCode = async () => {
    if (!payoutAmount.trim() || !payableAmount.trim() || !eventData) {
      setMessage({ text: "Please calculate payable amount first", type: "error" })
      return
    }

    setLoading(true)

    try {
      // Generate action code
      const code = generateActionCode()

      // Generate a payment reference (6 character alphanumeric)
      const generateReference = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        let result = ""
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
      }

      const paymentRef = generateReference()

      // Create payout document
      const payoutRef = collection(db, "events", eventData.userId, "userEvents", eventData.id, "payouts")
      await addDoc(payoutRef, {
        payoutAmount: Number(payoutAmount),
        payableAmount: Number(payableAmount),
        actionCode: code,
        reference: paymentRef,
        status: "pending",
        createdAt: serverTimestamp(),
        agentId: auth.currentUser?.uid || "Unknown",
        agentName: auth.currentUser?.displayName || "Unknown Admin",
        transactionTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })

      setActionCodeSent(true)
      setMessage({ text: "Action code generated and sent to booker successfully", type: "success" })

      // Refresh payouts
      const payoutsRef = collection(db, "events", eventData.userId, "userEvents", eventData.id, "payouts")
      const payoutsQuery = query(payoutsRef, orderBy("createdAt", "desc"))
      const payoutsSnapshot = await getDocs(payoutsQuery)

      const payoutsList: PayoutData[] = []
      payoutsSnapshot.forEach((doc) => {
        const data = doc.data()
        payoutsList.push({
          id: doc.id,
          payoutAmount: data.payoutAmount || 0,
          payableAmount: data.payableAmount || 0,
          actionCode: data.actionCode || "",
          status: data.status || "pending",
          createdAt: data.createdAt,
          agentId: data.agentId || "",
          agentName: data.agentName || "",
        })
      })

      setPayouts(payoutsList)

      // Reset payout amount and payable amount
      setPayoutAmount("")
      setPayableAmount("")
    } catch (error) {
      console.error("Error generating action code:", error)
      setMessage({ text: "Failed to generate action code", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const verifyActionCode = async (payoutId: string, actionCode: string) => {
    if (!eventData) {
      setMessage({ text: "No event data available", type: "error" })
      return
    }

    setLoading(true)

    try {
      // Get the payout document
      const payoutDocRef = doc(db, "events", eventData.userId, "userEvents", eventData.id, "payouts", payoutId)
      const payoutDoc = await getDoc(payoutDocRef)

      if (!payoutDoc.exists()) {
        setMessage({ text: "Payout not found", type: "error" })
        setLoading(false)
        return
      }

      const payoutData = payoutDoc.data()

      // Verify the action code
      if (payoutData.actionCode !== actionCode) {
        setMessage({ text: "Invalid action code. Please check and try again.", type: "error" })
        setLoading(false)
        return
      }

      const payoutAmount = Number(payoutData.payoutAmount || 0)

      // Calculate new financial values
      const newTotalPaidOut = totalPaidOut + payoutAmount
      const newAvailableBalance = availableBalance - payoutAmount

      // Update payout status
      await updateDoc(payoutDocRef, {
        status: "completed",
        completedAt: serverTimestamp(),
        completedBy: auth.currentUser?.uid || "Unknown",
      })

      // Update event document with new financial data
      const eventDocRef = doc(db, "events", eventData.userId, "userEvents", eventData.id)
      await updateDoc(eventDocRef, {
        availableRevenue: newAvailableBalance,
        totalPaidOut: newTotalPaidOut,
        lastPayoutDate: serverTimestamp(),
        lastPayoutAmount: payoutAmount,
      })

      // Update local state
      setTotalPaidOut(newTotalPaidOut)
      setAvailableBalance(newAvailableBalance)

      setMessage({ text: "Payout processed successfully", type: "success" })

      // Refresh payouts
      const payoutsRef = collection(db, "events", eventData.userId, "userEvents", eventData.id, "payouts")
      const payoutsQuery = query(payoutsRef, orderBy("createdAt", "desc"))
      const payoutsSnapshot = await getDocs(payoutsQuery)

      const payoutsList: PayoutData[] = []
      payoutsSnapshot.forEach((doc) => {
        const data = doc.data()
        payoutsList.push({
          id: doc.id,
          payoutAmount: data.payoutAmount || 0,
          payableAmount: data.payableAmount || 0,
          actionCode: data.actionCode || "",
          status: data.status || (data.status === "completed" ? "completed" : "pending"),
          createdAt: data.createdAt,
          agentId: data.agentId || "",
          agentName: data.agentName || "",
        })
      })

      setPayouts(payoutsList)

      // Reset action code input
      setActionCode("")
      setSelectedPayoutId(null)
    } catch (error) {
      console.error("Error processing payout:", error)
      setMessage({ text: "Failed to process payout", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <UserHeader />
      <div className="admin-dashboard-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              <Shield size={18} />
              Admin Users
            </button>
            <button
              className={`admin-tab ${activeTab === "verification" ? "active" : ""}`}
              onClick={() => setActiveTab("verification")}
            >
              <UserCheck size={18} />
              Verify Bookers
            </button>
            <button
              className={`admin-tab ${activeTab === "payout" ? "active" : ""}`}
              onClick={() => setActiveTab("payout")}
            >
              <DollarSign size={18} />
              Create Payout
            </button>
          </div>
          <button className="admin-permissions-btn" onClick={() => (window.location.href = "/admin-permissions")}>
            <Shield size={18} />
            Manage Admin Permissions
          </button>
        </div>

        {message.text && (
          <div className={`admin-message ${message.type}`}>
            {message.text}
            <button onClick={() => setMessage({ text: "", type: "" })}>×</button>
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-section">
            <h2>Admin User Management</h2>

            <div className="add-admin-form">
              <h3>Add New Admin</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Enter user UID"
                  value={newAdminUid}
                  onChange={(e) => setNewAdminUid(e.target.value)}
                />
                <button
                  className="search-user-btn"
                  onClick={searchUserByUid}
                  disabled={searchingUser || !newAdminUid.trim()}
                >
                  {searchingUser ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  Search User
                </button>
              </div>

              {searchedUser && (
                <div className="searched-user-card">
                  <div className="user-details">
                    <h4>{searchedUser.name}</h4>
                    <p>{searchedUser.email}</p>
                    <p className="user-role">Role: {searchedUser.isBooker ? "Booker" : "Regular User"}</p>
                  </div>
                  <button className="add-admin-btn" onClick={addAdmin}>
                    <UserPlus size={16} />
                    Grant Admin Access
                  </button>
                </div>
              )}
            </div>

            <h3>Current Admins</h3>
            <div className="admins-table-container">
              <table className="admins-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Added On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length > 0 ? (
                    admins.map((admin) => (
                      <tr key={admin.uid}>
                        <td>{admin.name}</td>
                        <td>{admin.email}</td>
                        <td>{formatTimestamp(admin.addedAt)}</td>
                        <td>
                          <button
                            className="remove-admin-btn"
                            onClick={() => removeAdmin(admin.uid)}
                            disabled={admin.uid === auth.currentUser?.uid}
                          >
                            Remove Admin
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="no-data">
                        No admin users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "verification" && (
          <div className="admin-section">
            <h2>Booker Verification</h2>

            <div className="verification-search">
              <h3>Verify Booker</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Enter verification ID"
                  value={verificationId}
                  onChange={(e) => setVerificationId(e.target.value)}
                />
                <button
                  className="search-verification-btn"
                  onClick={searchVerification}
                  disabled={searchingVerification || !verificationId.trim()}
                >
                  {searchingVerification ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  Search
                </button>
              </div>
            </div>

            {/* Update the verification details section to match the verification data structure */}
            {verificationData && (
              <div className="verification-details">
                <h3>Verification Details</h3>
                <div className="verification-card">
                  <div className="verification-header">
                    <div>
                      <h4>{verificationData.userName}</h4>
                      <p>{verificationData.userEmail}</p>
                    </div>
                    <div className="verification-status">
                      {verificationData.verificationState === "Verified" ? (
                        <span className="status verified">
                          <CheckCircle size={16} />
                          Verified
                        </span>
                      ) : (
                        <span className="status pending">
                          <AlertCircle size={16} />
                          {verificationData.verificationState}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="verification-content">
                    <div className="verification-field">
                      <span>Phone Number:</span>
                      <span>{verificationData.phoneNumber || "Not provided"}</span>
                    </div>
                    <div className="verification-field">
                      <span>Residential Address:</span>
                      <span>{verificationData.address || "Not provided"}</span>
                    </div>
                    <div className="verification-field">
                      <span>Account Name:</span>
                      <span>{verificationData.accountName || "Not provided"}</span>
                    </div>
                    <div className="verification-field">
                      <span>Account Number:</span>
                      <span>{verificationData.accountNumber || "Not provided"}</span>
                    </div>
                    <div className="verification-field">
                      <span>Bank Name:</span>
                      <span>{verificationData.bankName || "Not provided"}</span>
                    </div>
                    <div className="verification-field">
                      <span>Submitted On:</span>
                      <span>{formatTimestamp(verificationData.selfie?.dateUploaded)}</span>
                    </div>
                  </div>

                  <div className="verification-documents">
                    <h4>Uploaded Documents</h4>
                    <div className="documents-grid">
                      {verificationData.nin && verificationData.nin.fileUrl && (
                        <div className="document-card">
                          <h5>National Identity Number (NIN)</h5>
                          <a href={verificationData.nin.fileUrl} target="_blank" rel="noopener noreferrer">
                            View Document
                          </a>
                        </div>
                      )}

                      {verificationData.selfie && verificationData.selfie.fileUrl && (
                        <div className="document-card">
                          <h5>Selfie Shot</h5>
                          <a href={verificationData.selfie.fileUrl} target="_blank" rel="noopener noreferrer">
                            View Document
                          </a>
                        </div>
                      )}

                      {verificationData.proofOfAddress && verificationData.proofOfAddress.fileUrl && (
                        <div className="document-card">
                          <h5>Proof of Address</h5>
                          <a href={verificationData.proofOfAddress.fileUrl} target="_blank" rel="noopener noreferrer">
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {verificationData.verificationState !== "Verified" && (
                    <div className="verification-actions">
                      <button
                        className="verify-btn"
                        onClick={() => verifyBooker(verificationData.id, verificationData.userId)}
                      >
                        <CheckCircle size={16} />
                        Verify Booker
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Update the pending verifications section to match the verification data structure */}
            <div className="pending-verifications">
              <h3>Pending Verifications</h3>
              {pendingVerifications.length > 0 ? (
                <div className="verifications-grid">
                  {pendingVerifications.map((verification) => (
                    <div key={verification.id} className="verification-item">
                      <div className="verification-item-header">
                        <h4>Verification ID: {verification.id.substring(0, 8)}...</h4>
                        <span className="status pending">Awaiting Verification</span>
                      </div>
                      <p>User ID: {verification.userId.substring(0, 8)}...</p>
                      <p>Submitted: {formatTimestamp(verification.selfie?.dateUploaded)}</p>
                      <button
                        className="view-verification-btn"
                        onClick={() => {
                          setVerificationId(verification.id)
                          searchVerification()
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No pending verifications</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "payout" && (
          <div className="admin-section">
            <h2>Create Payout</h2>

            <div className="payout-search">
              <h3>Search Event</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Event ID</label>
                  <input
                    type="text"
                    placeholder="Enter Event ID"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Pay ID</label>
                  <input
                    type="text"
                    placeholder="Enter Pay ID"
                    value={payId}
                    onChange={(e) => setPayId(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Booker Verification Tag (BVT)</label>
                  <input type="text" placeholder="Enter BVT" value={bvt} onChange={(e) => setBvt(e.target.value)} />
                </div>
                <div className="form-group">
                  <button
                    className="search-event-btn"
                    onClick={searchEvent}
                    disabled={searchingEvent || !eventId.trim() || !payId.trim() || !bvt.trim()}
                  >
                    {searchingEvent ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                    Search
                  </button>
                </div>
              </div>
            </div>

            {eventData && (
              <div className="event-details">
                <h3>Event Details</h3>
                <div className="event-card">
                  <div className="event-header">
                    <h4>{eventData.eventName}</h4>
                    <p className="event-date">{formatTimestamp(eventData.eventDate)}</p>
                  </div>

                  <div className="event-stats">
                    <div className="stat-item">
                      <span>Booker:</span>
                      <span>{eventData.userName}</span>
                    </div>
                    <div className="stat-item">
                      <span>Tickets Sold:</span>
                      <span>{eventData.ticketsSold || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span>Total Revenue:</span>
                      <span>₦{(eventData.totalRevenue || 0).toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span>Total Paid Out:</span>
                      <span>₦{totalPaidOut.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span>Available Revenue:</span>
                      <span>₦{availableBalance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="create-payout">
                    <h4>Create New Payout</h4>
                    <div className="payout-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Payout Amount (₦)</label>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            disabled={actionCodeSent}
                          />
                        </div>
                        <div className="form-group">
                          <button
                            className="calculate-btn"
                            onClick={calculatePayableAmount}
                            disabled={!payoutAmount.trim() || isNaN(Number(payoutAmount)) || actionCodeSent}
                          >
                            Calculate
                          </button>
                        </div>
                      </div>

                      {payableAmount && (
                        <div className="payable-amount">
                          <label>Payable Amount (₦)</label>
                          <input type="text" value={payableAmount} readOnly />
                          <p className="fee-info">20% platform fee applied</p>
                        </div>
                      )}

                      <div className="action-code-section">
                        {actionCodeSent ? (
                          <div className="action-code-display">
                            <h5>Action Code Sent to Booker</h5>
                            <p>
                              The action code has been generated and sent to the booker. Ask the booker to provide you
                              with the code to complete the payout process.
                            </p>
                            <div className="action-code-input">
                              <label>Enter Action Code from Booker</label>
                              <div className="code-input-row">
                                <input
                                  type="text"
                                  placeholder="Enter action code"
                                  value={actionCode}
                                  onChange={(e) => setActionCode(e.target.value)}
                                />
                                <button
                                  className="verify-code-btn"
                                  onClick={() => {
                                    // Find the most recent pending payout
                                    const pendingPayout = payouts.find((p) => p.status === "pending")
                                    if (pendingPayout && pendingPayout.id) {
                                      verifyActionCode(pendingPayout.id, actionCode)
                                    } else {
                                      setMessage({ text: "No pending payout found", type: "error" })
                                    }
                                  }}
                                  disabled={!actionCode.trim()}
                                >
                                  Verify & Process
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button className="send-code-btn" onClick={sendActionCode} disabled={!payableAmount}>
                            Generate Action Code
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="payouts-section">
                    <h4>Payout History</h4>
                    <div className="payouts-table-container">
                      <table className="payouts-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Payout Amount</th>
                            <th>Payable Amount</th>
                            <th>Action Code</th>
                            <th>Agent</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payouts.length > 0 ? (
                            payouts.map((payout) => (
                              <tr key={payout.id}>
                                <td>{formatTimestamp(payout.createdAt)}</td>
                                <td>₦{Number(payout.payoutAmount).toFixed(2)}</td>
                                <td>₦{Number(payout.payableAmount).toFixed(2)}</td>
                                <td>{payout.actionCode}</td>
                                <td>{payout.agentName || "Unknown"}</td>
                                <td>
                                  <span className={`status ${payout.status}`}>
                                    {payout.status === "completed" ? (
                                      <>
                                        <CheckCircle size={14} />
                                        Completed
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle size={14} />
                                        Pending
                                      </>
                                    )}
                                  </span>
                                </td>
                                <td>
                                  {payout.status === "pending" && (
                                    <button
                                      className="verify-payout-btn"
                                      onClick={() => {
                                        setSelectedPayoutId(payout.id)
                                        setActionCode("")
                                      }}
                                    >
                                      Verify Code
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="no-data">
                                No payouts found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="ticket-sales-section">
                    <h4>Ticket Sales</h4>

                    {/* Add ticket types section */}
                    {eventData && (
                      <div className="ticket-types-section">
                        <h5>Ticket Types</h5>
                        <div className="ticket-types-table-container">
                          <table className="ticket-types-table">
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {eventData.isFree ? (
                                <tr>
                                  <td>Free Admission</td>
                                  <td>₦0.00</td>
                                </tr>
                              ) : (
                                eventData.ticketPrices &&
                                eventData.ticketPrices.map((ticket, index) => (
                                  <tr key={index}>
                                    <td>{ticket.policy}</td>
                                    <td>₦{Number(ticket.price).toFixed(2)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <h5 className="sales-by-date">Sales by Date</h5>
                    <div className="sales-accordion">
                      {ticketSales.length > 0 ? (
                        ticketSales.map((day, index) => (
                          <div key={index} className="sales-day">
                            <div className="sales-day-header">
                              <div className="day-info">
                                <h5>
                                  {typeof day.date === "object" && "seconds" in day.date
                                    ? formatTimestamp(day.date)
                                    : day.date}
                                </h5>
                                <span>{day.count} tickets</span>
                              </div>
                              <div className="day-total">₦{day.amount.toFixed(2)}</div>
                            </div>
                            <div className="sales-day-details">
                              <table className="sales-table">
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Ticket Type</th>
                                    <th>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.sales.map((sale, saleIndex) => (
                                    <tr key={saleIndex}>
                                      <td>{sale.name}</td>
                                      <td>{sale.email}</td>
                                      <td>{sale.ticketType}</td>
                                      <td>₦{Number(sale.amount).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-data">No ticket sales found</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default AdminSuite
