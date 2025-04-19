/**
 * Generates a Booker Verification Tag (BVT)
 * Format: SPTX-B-XXXXXX (where X is a random letter or number)
 * Dev by Drexx
 * Prod 2025
 */
export const generateBVT = (): string => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = "SPTX-B-"
  
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
  
    return result
  }
  
  /**
   * Generates a 12-digit action code for payouts
   */
  export const generateActionCode = (): string => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
  
    for (let i = 0; i < 12; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
  
    return result
  }
  
  /**
   * Formats a Firestore timestamp to a readable date string
   */
  export const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Unknown"
  
    if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
      try {
        const date = new Date(timestamp.seconds * 1000)
        return date.toLocaleString()
      } catch (error) {
        console.error("Error formatting timestamp:", error)
        return "Invalid date"
      }
    }
  
    return String(timestamp)
  }
  