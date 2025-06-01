"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet"
import { auth, db } from "../services/firebase"
import { doc, getDoc, collection, setDoc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import Preloader from "../components/preloader"
import { ArrowRight, Users, Wallet, AlertCircle, CheckCircle, TrendingUp, ArrowDown } from "lucide-react"
import "./ref.css"

interface UserData {
  uid: string
  username: string
  email: string
  referralCode: string
}

interface ReferredUser {
  username: string
  joinedAt: any
}

interface ReferralData {
  uid: string
  username: string
  email: string
  refGain: number
  totalWithdrawn: number
  createdAt: any
  referredUsers: ReferredUser[]
}

const Referrals = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [referralListed, setReferralListed] = useState(false)
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [refGain, setRefGain] = useState(0)
  const [totalWithdrawn, setTotalWithdrawn] = useState(0)
  const [withdrawing, setWithdrawing] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        auth.onAuthStateChanged(async (authUser) => {
          if (authUser) {
            // User is signed in
            const userDocRef = doc(db, "users", authUser.uid)
            const userDoc = await getDoc(userDocRef)

            if (userDoc.exists()) {
              const data = userDoc.data()
              setUserData({
                uid: authUser.uid,
                username: data.username || "",
                email: data.email || "",
                referralCode: data.referralCode || "",
              })

              // Check if referral code exists and is listed in the referrals collection
              if (data.referralCode) {
                const referralDocRef = doc(db, "referrals", data.referralCode)
                const referralDoc = await getDoc(referralDocRef)
                setReferralListed(referralDoc.exists())

                if (referralDoc.exists()) {
                  // Get referred users and referral data
                  const referralData = referralDoc.data() as ReferralData
                  setRefGain(referralData.refGain || 0)
                  setTotalWithdrawn(referralData.totalWithdrawn || 0)

                  // Get referred users if any
                  if (referralData.referredUsers && referralData.referredUsers.length > 0) {
                    setReferredUsers(referralData.referredUsers)
                  }
                }
              }
            }
            setLoading(false)
          } else {
            // User is signed out
            navigate("/login")
          }
        })
      } catch (error) {
        console.error("Error checking authentication:", error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [navigate])

  const handleEnlistReferral = async () => {
    if (!userData || !userData.referralCode) return

    setLoading(true)
    try {
      // Create a document in the referrals collection with the referral code as the document ID
      await setDoc(doc(db, "referrals", userData.referralCode), {
        uid: userData.uid,
        username: userData.username,
        email: userData.email,
        refGain: 0,
        totalWithdrawn: 0, // Initialize totalWithdrawn
        createdAt: serverTimestamp(),
        referredUsers: [],
      })

      setReferralListed(true)
      setMessage({
        text: "Your referral code has been successfully listed!",
        type: "success",
      })
    } catch (error) {
      console.error("Error enlisting referral code:", error)
      setMessage({
        text: "Failed to enlist your referral code. Please try again.",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!userData || refGain <= 0) return

    setWithdrawing(true)
    setMessage({ text: "", type: "" })

    try {
      // Get current user wallet balance
      const userDocRef = doc(db, "users", userData.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        throw new Error("User data not found")
      }

      const currentWalletBalance = userDoc.data().wallet || 0
      const newWalletBalance = currentWalletBalance + refGain

      // Update user's wallet balance
      await updateDoc(userDocRef, {
        wallet: newWalletBalance,
      })

      // Update referral document to reset refGain and update totalWithdrawn
      const referralDocRef = doc(db, "referrals", userData.referralCode)
      const newTotalWithdrawn = totalWithdrawn + refGain

      await updateDoc(referralDocRef, {
        refGain: 0,
        totalWithdrawn: newTotalWithdrawn,
        lastWithdrawalAt: serverTimestamp(),
        lastWithdrawalAmount: refGain,
      })

      // Create wallet-pay entry for the transaction
      const walletPayCollectionRef = collection(db, "users", userData.uid, "wallet-pay")
      await addDoc(walletPayCollectionRef, {
        transactionId: `ref-withdraw-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        transactionDate: new Date().toLocaleDateString(),
        transactionTime: new Date().toLocaleTimeString(),
        transactionType: "Referral Payment",
        amount: refGain,
        tag: "credit",
        status: "completed",
        createdAt: serverTimestamp(),
        previousBalance: currentWalletBalance,
        newBalance: newWalletBalance,
        userEmail: userData.email,
        userFullName: userData.username,
        referralCode: userData.referralCode,
        totalReferrals: referredUsers.length,
      })

      // Update local state
      setTotalWithdrawn(newTotalWithdrawn)
      const withdrawnAmount = refGain
      setRefGain(0)
      setWithdrawSuccess(true)
      setMessage({
        text: `Successfully withdrawn NGN ${formatNumber(withdrawnAmount)} to your wallet!`,
        type: "success",
      })
    } catch (error) {
      console.error("Error withdrawing referral earnings:", error)
      setMessage({
        text: `Failed to withdraw: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setWithdrawing(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const goToProfile = () => {
    navigate("/profile")
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  return (
    <>
      <Helmet>
        <title>Referrals - Spotix</title>
        <meta name="description" content="Manage your referrals and earn rewards on Spotix." />
      </Helmet>
      <UserHeader />
      <div className="referrals-container">
        <div className="referrals-header">
          <h1>Referrals</h1>
          <p className="referrals-subtitle">Invite friends and earn rewards</p>
        </div>

        {message.text && (
          <div className={`message-container ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle size={20} className="message-icon" />
            ) : (
              <AlertCircle size={20} className="message-icon" />
            )}
            <p>{message.text}</p>
            <button className="close-message" onClick={() => setMessage({ text: "", type: "" })}>
              ×
            </button>
          </div>
        )}

        {!userData?.referralCode ? (
          <div className="no-referral-key">
            <div className="no-key-content">
              <h2>Begin Your Referral Journey</h2>
              <p>Create your referral key from your profile to start earning rewards!</p>
              <button className="animated-button" onClick={goToProfile}>
                Go to Profile <ArrowRight size={18} />
              </button>
            </div>
            <div className="referral-illustration">
              <img src="/referral-illustration.svg" alt="Referral Illustration" />
            </div>
          </div>
        ) : !referralListed ? (
          <div className="not-listed-referral">
            <div className="not-listed-content">
              <h2>Hey, {userData.username}!</h2>
              <p>We can see you have a referral key but it isn't listed yet.</p>
              <p>Click the button below to list your referral key and start earning rewards!</p>
              <button className="enlist-button" onClick={handleEnlistReferral}>
                Enlist
              </button>
            </div>
            <div className="referral-illustration">
              <img src="/referral-list.svg" alt="Referral Listing" />
            </div>
          </div>
        ) : (
          <div className="referral-dashboard">
            <div className="referral-stats-container">
              <div className="referral-stats-card earnings">
                <div className="stats-header">
                  <h3>Available Earnings</h3>
                  <Wallet size={24} />
                </div>
                <div className="stats-amount">NGN {formatNumber(refGain)}</div>
                <div className="stats-action">
                  <button className="withdraw-button" onClick={handleWithdraw} disabled={withdrawing || refGain <= 0}>
                    {withdrawing ? "Processing..." : "Withdraw to Wallet"}
                  </button>
                </div>
              </div>

              <div className="referral-stats-card withdrawn">
                <div className="stats-header">
                  <h3>Total Withdrawn</h3>
                  <TrendingUp size={24} />
                </div>
                <div className="stats-amount">NGN {formatNumber(totalWithdrawn)}</div>
                <div className="stats-info">
                  {withdrawSuccess ? (
                    <span className="success-text">
                      <CheckCircle size={16} /> Last withdrawal successful
                    </span>
                  ) : (
                    <span className="info-text">
                      <ArrowDown size={16} /> Lifetime withdrawals
                    </span>
                  )}
                </div>
              </div>

              <div className="referral-stats-card total-earnings">
                <div className="stats-header">
                  <h3>Total Earnings</h3>
                  <TrendingUp size={24} />
                </div>
                <div className="stats-amount">NGN {formatNumber(totalWithdrawn + refGain)}</div>
                <div className="stats-info">
                  <span className="info-text">
                    <Users size={16} /> From {referredUsers.length} referrals
                  </span>
                </div>
              </div>
            </div>

            <div className="referral-code-section">
              <h3>Your Referral Code</h3>
              <div className="referral-code-display">
                <span className="referral-code">{userData.referralCode}</span>
                <button
                  className="copy-code-button"
                  onClick={() => {
                    navigator.clipboard.writeText(userData.referralCode)
                    setMessage({ text: "Referral code copied to clipboard!", type: "success" })
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="referral-instruction">
                Share this code with friends. When they sign up using your code, you'll earn NGN 200 per referral!
              </p>
            </div>

            <div className="referred-users-section">
              <div className="section-header">
                <h3>
                  <Users size={20} /> Referred Users
                </h3>
                <span className="user-count">{referredUsers.length} users</span>
              </div>

              {referredUsers.length > 0 ? (
                <div className="referred-users-list">
                  {referredUsers.map((user, index) => (
                    <div key={index} className="referred-user-card">
                      <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                      <div className="user-details">
                        <span className="user-name">{user.username}</span>
                        <span className="join-date">
                          Joined: {user.joinedAt ? new Date(user.joinedAt.toDate()).toLocaleDateString() : "Recently"}
                        </span>
                      </div>
                      <div className="referral-amount">+NGN 200</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-referred-users">
                  <p>You haven't referred anyone yet. Share your code to start earning!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />

      <style>{`
        /* Additional styles for the new total earnings card */
        .referral-stats-card.total-earnings {
          background: linear-gradient(135deg, #f39c12, #e67e22);
          color: white;
        }

        .referral-stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        /* Responsive adjustments for three cards */
        @media (max-width: 768px) {
          .referral-stats-container {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .referral-stats-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1025px) {
          .referral-stats-container {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </>
  )
}

export default Referrals
