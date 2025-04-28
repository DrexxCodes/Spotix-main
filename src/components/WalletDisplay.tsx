"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"
import { LogOut, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"

const WalletDisplay = () => {
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
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

  const openWalletDialog = () => {
    setShowDialog(true)
    document.body.style.overflow = 'hidden'
  }

  const closeWalletDialog = () => {
    setShowDialog(false)
    document.body.style.overflow = 'auto'
  }

  const goToTelegramBot = () => {
    window.open("https://t.me/spotixNG_bot", "_blank")
    closeWalletDialog()
  }

  return (
    <>
      <div className="wallet-container relative">
        <div 
          className="wallet-balance cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg border border-purple-200"
          onClick={openWalletDialog}
          title="Click to see funding instructions"
        >
          <span className="wallet-label font-medium text-gray-700">My Wallet:</span>
          <span className="wallet-amount font-bold text-lg text-purple-800">₦{loading ? "..." : walletBalance.toFixed(2)}</span>
        </div>
        <button 
          className="logout-icon-btn ml-2 p-2 rounded-full hover:bg-gray-100 transition-colors" 
          onClick={handleLogout} 
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      {showDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            className="absolute inset-0 backdrop-blur-md bg-black/30"
            onClick={closeWalletDialog}
          ></div>
          <div className="bg-white rounded-xl p-8 shadow-2xl z-10 max-w-md w-full m-4 relative border-t-8 border-t-purple-700 min-h-[320px] flex flex-col">
            <button 
              onClick={closeWalletDialog}
              className="absolute top-4 right-4 text-gray-400 hover:text-purple-700 transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-purple-700">Fund Your Wallet</h2>
            <div className="bg-purple-50 p-5 rounded-lg border-l-4 border-l-purple-700 mb-8 flex-grow">
              <p className="text-gray-700 text-lg">
                To fund wallet visit the telegram bot, select fund wallet, fill in the details, fund and you will be automatically credited.
              </p>
            </div>
            <button 
              onClick={goToTelegramBot}
              className="bg-purple-700 text-white py-4 px-6 rounded-lg hover:bg-purple-800 transition-colors w-full font-medium text-lg shadow-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: "#6b2fa5" }}
            >
              Go to Bot
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default WalletDisplay