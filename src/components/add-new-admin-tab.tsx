"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"
import { UserPlus, Search, Loader2 } from "lucide-react"

interface AdminUser {
  uid: string
  email: string
  name: string
  addedAt: any
  addedBy: string
  permissions?: {
    addNewAdmin: boolean
    verifyBooker: boolean
    initiatePayout: boolean
  }
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

interface AddNewAdminTabProps {
  setMessage: (message: { text: string; type: string }) => void
  setLoading: (loading: boolean) => void
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

const AddNewAdminTab: React.FC<AddNewAdminTabProps> = ({ setMessage, setLoading }) => {
  const [newAdminUid, setNewAdminUid] = useState("")
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null)
  const [searchingUser, setSearchingUser] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])

  useEffect(() => {
    loadAdminUsers()
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
              permissions: adminData.permissions,
            })
          } else {
            adminsList.push({
              uid: docSnapshot.id,
              email: adminData.email || "",
              name: adminData.name || "Unknown",
              addedAt: adminData.addedAt || null,
              addedBy: adminData.addedBy || "Unknown",
              permissions: adminData.permissions,
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
            permissions: adminData.permissions,
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

      // Add to admins collection with default permissions
      await setDoc(adminDocRef, {
        email: searchedUser.email,
        name: searchedUser.name,
        addedAt: new Date(),
        addedBy: auth.currentUser?.uid || "Unknown",
        permissions: {
          addNewAdmin: false,
          verifyBooker: true,
          initiatePayout: false,
        },
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

  return (
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
          <button className="search-user-btn" onClick={searchUserByUid} disabled={searchingUser || !newAdminUid.trim()}>
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
              <th className="hidden md:table-cell">Added On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length > 0 ? (
              admins.map((admin) => (
                <tr key={admin.uid}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td className="hidden md:table-cell">{formatTimestamp(admin.addedAt)}</td>
                  <td>
                    <button
                      className="remove-admin-btn"
                      onClick={() => removeAdmin(admin.uid)}
                      disabled={admin.uid === auth.currentUser?.uid}
                    >
                      Remove
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
  )
}

export default AddNewAdminTab
