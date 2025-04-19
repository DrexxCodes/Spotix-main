"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"
import { LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"

const WalletDisplay = () => {
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setWalletBalance(userData.wallet || 0)
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWalletBalance()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    navigate("/login")
  }

  return (
    <div className="wallet-container">
      <div className="wallet-balance">
        <span className="wallet-label">My Wallet:</span>
        <span className="wallet-amount">₦{loading ? "..." : walletBalance.toFixed(2)}</span>
      </div>
      <button className="logout-icon-btn" onClick={handleLogout} title="Logout">
        <LogOut size={18} />
      </button>
    </div>
  )
}

export default WalletDisplay

