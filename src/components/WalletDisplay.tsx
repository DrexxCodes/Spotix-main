"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { doc, getDoc } from "firebase/firestore"
import { LogOut, X, Wallet } from "lucide-react"
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
    document.body.style.overflow = "hidden"
  }

  const closeWalletDialog = () => {
    setShowDialog(false)
    document.body.style.overflow = "auto"
  }

  const goToTelegramBot = () => {
    window.open("https://t.me/spotixNG_bot", "_blank")
    closeWalletDialog()
  }

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  return (
    <>
      <div className="wallet-container relative">
        <div
          className="wallet-balance cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2 rounded-lg shadow-md"
          onClick={openWalletDialog}
          title="Click to see funding instructions"
        >
          <Wallet size={18} className="text-white" />
          <span className="wallet-label font-medium event-white">Balance:</span>
          <span className="wallet-amount font-bold text-lg event-white">
            ₦{loading ? "..." : formatNumber(walletBalance)}
          </span>
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
          <div className="absolute inset-0 backdrop-blur-md bg-black/30" onClick={closeWalletDialog}></div>
          <div className="bg-white rounded-xl p-8 shadow-2xl z-10 max-w-md w-full m-4 relative border-t-8 border-t-purple-700 min-h-[320px] flex flex-col">
            <button
              onClick={closeWalletDialog}
              className="text-gray-400 hover:text-purple-700 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 p-3 rounded-full">
                <Wallet size={28} className="text-purple-700" />
              </div>
              <h2 className="text-2xl font-bold text-purple-700">Fund Your Wallet</h2>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-lg border-l-4 border-l-purple-700 mb-8 flex-grow">
              <div className="flex flex-col gap-4">
                <p className="text-gray-700 text-lg leading-relaxed">To fund your wallet, follow these simple steps:</p>
                <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                  <li>Visit the Spotix Telegram bot</li>
                  <li>Select the "Fund Wallet" option</li>
                  <li>Enter your funding details</li>
                  <li>Complete the payment</li>
                </ol>
                <p className="text-purple-700 font-medium mt-2">Your account will be credited automatically!</p>
              </div>
            </div>

            <button
              onClick={goToTelegramBot}
              className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-4 px-6 rounded-lg hover:from-purple-700 hover:to-purple-900 transition-colors w-full font-medium text-lg shadow-lg flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-send"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              Open Telegram Bot
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default WalletDisplay
