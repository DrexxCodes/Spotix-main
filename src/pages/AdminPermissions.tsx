"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../services/firebase"
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, orderBy, type Timestamp } from "firebase/firestore"
import { checkCurrentUserIsAdmin } from "../services/admin"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import {
  UserPlus,
  Search,
  Shield,
  CheckCircle,
  DollarSign,
  Loader2,
  AlertTriangle,
  UserCheck,
  Edit,
  Save,
  X,
  Menu,
} from "lucide-react"
import Preloader from "../components/preloader"

interface AdminUser {
  uid: string
  name: string
  email: string
  addedAt: Timestamp | null
  addedBy: string
  permissions: {
    addNewAdmin: boolean
    verifyBooker: boolean
    initiatePayout: boolean
  }
}

const AdminPermissions = () => {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [currentUserIsRoot, setCurrentUserIsRoot] = useState(false)
  const [currentUserAddedBySetup, setCurrentUserAddedBySetup] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Add admin states
  const [newAdminUid, setNewAdminUid] = useState("")
  const [searchedUser, setSearchedUser] = useState<any>(null)
  const [searchingUser, setSearchingUser] = useState(false)

  // New admin permissions
  const [newAdminPermissions, setNewAdminPermissions] = useState({
    addNewAdmin: false,
    verifyBooker: true,
    initiatePayout: false,
  })

  // Edit states
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null)
  const [editPermissions, setEditPermissions] = useState<{
    addNewAdmin: boolean
    verifyBooker: boolean
    initiatePayout: boolean
  }>({
    addNewAdmin: false,
    verifyBooker: false,
    initiatePayout: false,
  })

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isAdmin = await checkCurrentUserIsAdmin()
        if (!isAdmin) {
          window.location.href = "/home"
          return
        }

        // Check if current user is root admin (has permission to add admins)
        const currentUser = auth.currentUser
        if (currentUser) {
          const adminDocRef = doc(db, "admins", currentUser.uid)
          const adminDoc = await getDoc(adminDocRef)

          if (adminDoc.exists()) {
            const adminData = adminDoc.data()
            // If permissions field doesn't exist or addNewAdmin is true, consider as root
            const isRoot = !adminData.permissions || adminData.permissions.addNewAdmin !== false
            setCurrentUserIsRoot(isRoot)

            // Check if user was added by "setup"
            const wasAddedBySetup = adminData.addedBy === "setup"
            setCurrentUserAddedBySetup(wasAddedBySetup)

            if (!isRoot) {
              setMessage({
                text: "You don't have permission to manage admins",
                type: "error",
              })
            }

            if (!wasAddedBySetup) {
              setMessage({
                text: "Only administrators added by setup can modify permissions",
                type: "error",
              })
            }
          } else {
            // If admin doc exists but no permissions field, consider as root (legacy support)
            setCurrentUserIsRoot(true)
          }
        }

        await loadAdminUsers()
        setLoading(false)
      } catch (error) {
        console.error("Error checking admin status:", error)
        setMessage({
          text: "Error checking permissions. Please try again.",
          type: "error",
        })
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  const loadAdminUsers = async () => {
    try {
      const adminsRef = collection(db, "admins")
      const q = query(adminsRef, orderBy("addedAt", "desc"))
      const querySnapshot = await getDocs(q)

      const adminsList: AdminUser[] = []
      for (const adminDoc of querySnapshot.docs) {
        const adminData = adminDoc.data()

        // Get user details
        try {
          const userDoc = await getDoc(doc(db, "users", adminDoc.id))
          const userData = userDoc.exists() ? userDoc.data() : null

          // Default permissions if not set
          const permissions = adminData.permissions || {
            addNewAdmin: true,
            verifyBooker: true,
            initiatePayout: true,
          }

          adminsList.push({
            uid: adminDoc.id,
            name: userData?.fullName || userData?.username || adminData.name || "Unknown",
            email: userData?.email || adminData.email || "Unknown",
            addedAt: adminData.addedAt || null,
            addedBy: adminData.addedBy || "Unknown",
            permissions,
          })
        } catch (error) {
          console.error("Error getting user data for admin:", error)
          adminsList.push({
            uid: adminDoc.id,
            name: adminData.name || "Unknown",
            email: adminData.email || "Unknown",
            addedAt: adminData.addedAt || null,
            addedBy: adminData.addedBy || "Unknown",
            permissions: adminData.permissions || {
              addNewAdmin: true,
              verifyBooker: true,
              initiatePayout: true,
            },
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
      // Check if user is already an admin
      const adminDocRef = doc(db, "admins", newAdminUid.trim())
      const adminDoc = await getDoc(adminDocRef)

      if (adminDoc.exists()) {
        setMessage({ text: "This user is already an admin", type: "error" })
        setSearchingUser(false)
        return
      }

      // Get user details
      const userDocRef = doc(db, "users", newAdminUid.trim())
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
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

    if (!currentUserIsRoot) {
      setMessage({ text: "You don't have permission to add new admins", type: "error" })
      return
    }

    if (!currentUserAddedBySetup) {
      setMessage({ text: "Only administrators added by setup can add new admins", type: "error" })
      return
    }

    setLoading(true)

    try {
      // Add to admins collection with permissions
      const adminDocRef = doc(db, "admins", searchedUser.uid)
      await setDoc(adminDocRef, {
        email: searchedUser.email,
        name: searchedUser.name,
        addedAt: new Date(),
        addedBy: auth.currentUser?.uid || "Unknown",
        permissions: newAdminPermissions,
      })

      setMessage({ text: "Admin added successfully", type: "success" })
      setNewAdminUid("")
      setSearchedUser(null)
      setNewAdminPermissions({
        addNewAdmin: false,
        verifyBooker: true,
        initiatePayout: false,
      })

      // Refresh admin list
      await loadAdminUsers()
    } catch (error) {
      console.error("Error adding admin:", error)
      setMessage({ text: "Failed to add admin", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const startEditingAdmin = (admin: AdminUser) => {
    setEditingAdminId(admin.uid)
    setEditPermissions({ ...admin.permissions })
  }

  const cancelEditingAdmin = () => {
    setEditingAdminId(null)
  }

  const saveAdminPermissions = async (adminId: string) => {
    if (!currentUserIsRoot) {
      setMessage({ text: "You don't have permission to modify admin permissions", type: "error" })
      return
    }

    if (!currentUserAddedBySetup) {
      setMessage({ text: "Only administrators added by setup can modify permissions", type: "error" })
      return
    }

    setLoading(true)

    try {
      const adminDocRef = doc(db, "admins", adminId)
      await updateDoc(adminDocRef, {
        permissions: editPermissions,
      })

      setMessage({ text: "Admin permissions updated successfully", type: "success" })
      setEditingAdminId(null)

      // Update local state
      setAdmins(
        admins.map((admin) => (admin.uid === adminId ? { ...admin, permissions: { ...editPermissions } } : admin)),
      )
    } catch (error) {
      console.error("Error updating admin permissions:", error)
      setMessage({ text: "Failed to update admin permissions", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permission: keyof typeof editPermissions) => {
    setEditPermissions({
      ...editPermissions,
      [permission]: !editPermissions[permission],
    })
  }

  const handleNewAdminPermissionToggle = (permission: keyof typeof newAdminPermissions) => {
    setNewAdminPermissions({
      ...newAdminPermissions,
      [permission]: !newAdminPermissions[permission],
    })
  }

  if (loading) {
    return <Preloader loading={true} />
  }

  // If user is not added by setup, show access denied message
  if (!currentUserAddedBySetup && !loading) {
    return (
      <>
        <UserHeader />
        <div className="admin-permissions-container">
          <div className="admin-header">
            <h1>Admin Permissions Management</h1>
            <div className="admin-header-actions">
              <button className="back-to-dashboard" onClick={() => (window.location.href = "/AdminSuite")}>
                Back to Dashboard
              </button>
            </div>
          </div>

          <div className="admin-message error">
            <AlertTriangle size={18} />
            Access Denied: Only administrators added by setup can access this page
            <button onClick={() => setMessage({ text: "", type: "" })}>×</button>
          </div>

          <div className="permission-warning">
            <AlertTriangle size={20} />
            <p>You don't have permission to view or modify admin permissions. Please contact a system administrator.</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <UserHeader />
      <div className="admin-permissions-container">
        <div className="admin-header">
          <h1>Admin Permissions Management</h1>

          {/* Mobile menu toggle */}
          <button
            className="menu-toggle-btn md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className={`admin-header-actions ${mobileMenuOpen ? "mobile-menu-open" : "hidden md:block"}`}>
            <button className="back-to-dashboard" onClick={() => (window.location.href = "/AdminSuite")}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`admin-message ${message.type}`}>
            {message.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            {message.text}
            <button onClick={() => setMessage({ text: "", type: "" })}>×</button>
          </div>
        )}

        {!currentUserIsRoot && (
          <div className="permission-warning">
            <AlertTriangle size={20} />
            <p>You don't have permission to add or modify admin users. You can only view the current admins.</p>
          </div>
        )}

        {currentUserIsRoot && (
          <div className="add-admin-section">
            <h2>
              <UserPlus size={20} />
              Add New Admin
            </h2>
            <div className="add-admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>User ID</label>
                  <div className="search-input-container">
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
                      Search
                    </button>
                  </div>
                </div>
              </div>

              {searchedUser && (
                <>
                  <div className="searched-user-card">
                    <div className="user-details">
                      <h4>{searchedUser.name}</h4>
                      <p>{searchedUser.email}</p>
                      <p className="user-role">Role: {searchedUser.isBooker ? "Booker" : "Regular User"}</p>
                    </div>
                  </div>

                  <div className="permissions-section">
                    <h3>
                      <Shield size={18} />
                      Assign Permissions
                    </h3>
                    <div className="permissions-grid">
                      <div className="permission-item">
                        <div className="permission-header">
                          <UserPlus size={16} />
                          <span>Add New Admins</span>
                        </div>
                        <p className="permission-description">Can add new admin users and modify admin permissions</p>
                        <div className="permission-toggle">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={newAdminPermissions.addNewAdmin}
                              onChange={() => handleNewAdminPermissionToggle("addNewAdmin")}
                            />
                            <span className="slider round"></span>
                          </label>
                          <span className="toggle-label">{newAdminPermissions.addNewAdmin ? "Allow" : "Disallow"}</span>
                        </div>
                      </div>

                      <div className="permission-item">
                        <div className="permission-header">
                          <UserCheck size={16} />
                          <span>Verify Bookers</span>
                        </div>
                        <p className="permission-description">Can verify booker accounts and issue verification tags</p>
                        <div className="permission-toggle">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={newAdminPermissions.verifyBooker}
                              onChange={() => handleNewAdminPermissionToggle("verifyBooker")}
                            />
                            <span className="slider round"></span>
                          </label>
                          <span className="toggle-label">
                            {newAdminPermissions.verifyBooker ? "Allow" : "Disallow"}
                          </span>
                        </div>
                      </div>

                      <div className="permission-item">
                        <div className="permission-header">
                          <DollarSign size={16} />
                          <span>Initiate Payouts</span>
                        </div>
                        <p className="permission-description">Can create and process payouts for booker events</p>
                        <div className="permission-toggle">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={newAdminPermissions.initiatePayout}
                              onChange={() => handleNewAdminPermissionToggle("initiatePayout")}
                            />
                            <span className="slider round"></span>
                          </label>
                          <span className="toggle-label">
                            {newAdminPermissions.initiatePayout ? "Allow" : "Disallow"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="add-admin-actions">
                      <button className="add-admin-btn" onClick={addAdmin}>
                        <UserPlus size={16} />
                        Add as Admin
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="current-admins-section">
          <h2>
            <Shield size={20} />
            Current Admins
          </h2>
          <div className="admins-table-container">
            <table className="admins-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="hidden md:table-cell">Added On</th>
                  <th className="hidden md:table-cell">Added By</th>
                  <th>Permissions</th>
                  {currentUserIsRoot && currentUserAddedBySetup && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {admins.length > 0 ? (
                  admins.map((admin) => (
                    <tr key={admin.uid} className={admin.uid === auth.currentUser?.uid ? "current-user" : ""}>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td className="hidden md:table-cell">
                        {admin.addedAt ? new Date(admin.addedAt.seconds * 1000).toLocaleDateString() : "Unknown"}
                      </td>
                      <td className="hidden md:table-cell">{admin.addedBy}</td>
                      <td>
                        {editingAdminId === admin.uid ? (
                          <div className="edit-permissions">
                            <div className="edit-permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={editPermissions.addNewAdmin}
                                  onChange={() => handlePermissionToggle("addNewAdmin")}
                                />
                                Add Admins
                              </label>
                            </div>
                            <div className="edit-permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={editPermissions.verifyBooker}
                                  onChange={() => handlePermissionToggle("verifyBooker")}
                                />
                                Verify Bookers
                              </label>
                            </div>
                            <div className="edit-permission-item">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={editPermissions.initiatePayout}
                                  onChange={() => handlePermissionToggle("initiatePayout")}
                                />
                                Initiate Payouts
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="permission-badges">
                            {admin.permissions.addNewAdmin && (
                              <span className="permission-badge admin">
                                <UserPlus size={12} />
                                Admin
                              </span>
                            )}
                            {admin.permissions.verifyBooker && (
                              <span className="permission-badge verify">
                                <UserCheck size={12} />
                                Verify
                              </span>
                            )}
                            {admin.permissions.initiatePayout && (
                              <span className="permission-badge payout">
                                <DollarSign size={12} />
                                Payout
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {currentUserIsRoot && currentUserAddedBySetup && (
                        <td>
                          {editingAdminId === admin.uid ? (
                            <div className="edit-actions">
                              <button className="save-btn" onClick={() => saveAdminPermissions(admin.uid)}>
                                <Save size={14} />
                                Save
                              </button>
                              <button className="cancel-btn" onClick={cancelEditingAdmin}>
                                <X size={14} />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="edit-btn"
                              onClick={() => startEditingAdmin(admin)}
                              disabled={admin.uid === auth.currentUser?.uid}
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={currentUserIsRoot && currentUserAddedBySetup ? 6 : 5} className="no-data">
                      No admin users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default AdminPermissions
