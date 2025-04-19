import { db, auth } from "./firebase"
import { doc, getDoc, setDoc, deleteDoc, collection, query, getDocs } from "firebase/firestore"

// Check if the werey is an admin
export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  try {
    const adminDocRef = doc(db, "admins", uid)
    const adminDoc = await getDoc(adminDocRef)
    return adminDoc.exists()
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}


export const checkCurrentUserIsAdmin = async (): Promise<boolean> => {
  const user = auth.currentUser
  if (!user) return false
  return checkIsAdmin(user.uid)
}

// Fix the addAdminByEmail function to properly type the user data
export const addAdminByEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    // First, find the user with this email
    const usersRef = collection(db, "users")
    const q = query(usersRef)
    const querySnapshot = await getDocs(q)

    let targetUser: { uid: string; email: string; fullName?: string; username?: string } | null = null as {
      uid: string;
      email: string;
      fullName?: string;
      username?: string;
    } | null

    querySnapshot.forEach((doc) => {
      const userData = doc.data() as { email?: string; fullName?: string; username?: string }
      if (userData.email === email) {
        targetUser = {
          uid: doc.id,
          email: userData.email || email,
          fullName: userData.fullName,
          username: userData.username,
        }
      }
    })

    if (!targetUser) {
      return { success: false, message: "User with this email not found" }
    }

    // Add user to admins collection
    await setDoc(doc(db, "admins", targetUser.uid), {
      email: targetUser.email,
      name: targetUser.fullName || targetUser.username || "Unknown",
      addedAt: new Date(),
      addedBy: auth.currentUser?.uid || "Unknown",
    })

    return { success: true, message: "User successfully added as admin" }
  } catch (error) {
    console.error("Error adding admin:", error)
    return {
      success: false,
      message: `Failed to add admin: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Remove a user from admin role
export const removeAdmin = async (uid: string): Promise<{ success: boolean; message: string }> => {
  try {
    await deleteDoc(doc(db, "admins", uid))
    return { success: true, message: "Admin access removed successfully" }
  } catch (error) {
    console.error("Error removing admin:", error)
    return {
      success: false,
      message: `Failed to remove admin: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Get all admin users
export const getAllAdmins = async (): Promise<any[]> => {
  try {
    const adminsRef = collection(db, "admins")
    const querySnapshot = await getDocs(adminsRef)

    const admins: any[] = []
    querySnapshot.forEach((doc) => {
      admins.push({
        uid: doc.id,
        ...doc.data(),
      })
    })

    return admins
  } catch (error) {
    console.error("Error getting admins:", error)
    return []
  }
}

// Check if user has permission to add new admins
export const checkCanAddAdmins = async (uid: string): Promise<boolean> => {
  try {
    const adminDocRef = doc(db, "admins", uid)
    const adminDoc = await getDoc(adminDocRef)

    if (!adminDoc.exists()) return false

    const adminData = adminDoc.data()
    // If permissions field doesn't exist or addNewAdmin is true, allow it (for backward compatibility)
    return !adminData.permissions || adminData.permissions.addNewAdmin !== false
  } catch (error) {
    console.error("Error checking admin permissions:", error)
    return false
  }
}

// Check if user has permission to verify bookers
export const checkCanVerifyBookers = async (uid: string): Promise<boolean> => {
  try {
    const adminDocRef = doc(db, "admins", uid)
    const adminDoc = await getDoc(adminDocRef)

    if (!adminDoc.exists()) return false

    const adminData = adminDoc.data()
    // If permissions field doesn't exist or verifyBooker is true, allow it (for backward compatibility)
    return !adminData.permissions || adminData.permissions.verifyBooker !== false
  } catch (error) {
    console.error("Error checking admin permissions:", error)
    return false
  }
}

// Check if user has permission to initiate payouts
export const checkCanInitiatePayouts = async (uid: string): Promise<boolean> => {
  try {
    const adminDocRef = doc(db, "admins", uid)
    const adminDoc = await getDoc(adminDocRef)

    if (!adminDoc.exists()) return false

    const adminData = adminDoc.data()
    // If permissions field doesn't exist or initiatePayout is true, allow it (for backward compatibility)
    return !adminData.permissions || adminData.permissions.initiatePayout !== false
  } catch (error) {
    console.error("Error checking admin permissions:", error)
    return false
  }
}

// Check current user's specific permission
export const checkCurrentUserPermission = async (
  permission: "addNewAdmin" | "verifyBooker" | "initiatePayout",
): Promise<boolean> => {
  const user = auth.currentUser
  if (!user) return false

  try {
    const adminDocRef = doc(db, "admins", user.uid)
    const adminDoc = await getDoc(adminDocRef)

    if (!adminDoc.exists()) return false

    const adminData = adminDoc.data()
    // If permissions field doesn't exist, allow all permissions (for backward compatibility)
    if (!adminData.permissions) return true

    return adminData.permissions[permission] !== false
  } catch (error) {
    console.error(`Error checking ${permission} permission:`, error)
    return false
  }
}
