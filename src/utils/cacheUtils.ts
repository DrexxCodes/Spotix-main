/**
 * Utility functions for caching data in the application
 * Dev by Drexx
 * Version 1.1
 * Prod: 2025
 * Updated with dashboard caching support
 */

// Cache keys for consistent access
export const CACHE_KEYS = {
  DASHBOARD_DATA: "dashboard_data",
  USER_PROFILE: "user_profile",
  TICKET_PREFIX: "ticket_",
  EVENT_DATA: "event_data",
}

// Default cache expiration times (in milliseconds)
export const CACHE_EXPIRATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  DASHBOARD: 5 * 60 * 1000, // 5 minutes for dashboard data
}

// Set data in session storage with expiration
export const setWithExpiry = (key: string, value: any, ttl: number) => {
  const now = new Date()
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    console.error("Error saving to cache:", error)
  }
}

// Get data from session storage, checking expiration
export const getWithExpiry = (key: string) => {
  try {
    const itemStr = sessionStorage.getItem(key)

    if (!itemStr) {
      return null
    }

    const item = JSON.parse(itemStr)
    const now = new Date()

    if (now.getTime() > item.expiry) {
      // If the item is expired, remove it from storage
      sessionStorage.removeItem(key)
      return null
    }

    return item.value
  } catch (error) {
    console.error("Error retrieving from cache:", error)
    return null
  }
}

// Clear all cached data
export const clearCache = () => {
  try {
    sessionStorage.clear()
  } catch (error) {
    console.error("Error clearing cache:", error)
  }
}

// Clear specific cached data
export const clearCacheItem = (key: string) => {
  try {
    sessionStorage.removeItem(key)
  } catch (error) {
    console.error("Error clearing cache item:", error)
  }
}

// Cache ticket data with 30 minute expiry by default
export const cacheTicketData = (ticketId: string, data: any, ttl = CACHE_EXPIRATION.MEDIUM) => {
  setWithExpiry(`${CACHE_KEYS.TICKET_PREFIX}${ticketId}`, data, ttl)
}

// Get cached ticket data
export const getCachedTicketData = (ticketId: string) => {
  return getWithExpiry(`${CACHE_KEYS.TICKET_PREFIX}${ticketId}`)
}

// Check if cache is expired without removing it
export const isCacheExpired = (key: string): boolean => {
  try {
    const itemStr = sessionStorage.getItem(key)
    if (!itemStr) return true

    const item = JSON.parse(itemStr)
    const now = new Date()

    return now.getTime() > item.expiry
  } catch (error) {
    console.error("Error checking cache expiration:", error)
    return true
  }
}

// Cache dashboard data with default expiry
export const cacheDashboardData = (data: any, ttl = CACHE_EXPIRATION.DASHBOARD) => {
  setWithExpiry(CACHE_KEYS.DASHBOARD_DATA, data, ttl)
}

// Get cached dashboard data
export const getCachedDashboardData = () => {
  return getWithExpiry(CACHE_KEYS.DASHBOARD_DATA)
}

// Cache user profile data
export const cacheUserProfile = (data: any, ttl = CACHE_EXPIRATION.MEDIUM) => {
  setWithExpiry(CACHE_KEYS.USER_PROFILE, data, ttl)
}

// Get cached user profile data
export const getCachedUserProfile = () => {
  return getWithExpiry(CACHE_KEYS.USER_PROFILE)
}

// Cache event data
export const cacheEventData = (eventId: string, data: any, ttl = CACHE_EXPIRATION.MEDIUM) => {
  setWithExpiry(`${CACHE_KEYS.EVENT_DATA}_${eventId}`, data, ttl)
}

// Get cached event data
export const getCachedEventData = (eventId: string) => {
  return getWithExpiry(`${CACHE_KEYS.EVENT_DATA}_${eventId}`)
}

// Background refresh helper - returns true if cache exists but is nearing expiration
export const shouldBackgroundRefresh = (key: string, thresholdPercent = 80): boolean => {
  try {
    const itemStr = sessionStorage.getItem(key)
    if (!itemStr) return false

    const item = JSON.parse(itemStr)
    const now = new Date().getTime()
    const created = item.expiry - (item.ttl || CACHE_EXPIRATION.MEDIUM)
    const expiresIn = item.expiry - now
    const totalTtl = item.expiry - created

    // If less than threshold% of TTL remains, suggest a background refresh
    return expiresIn > 0 && expiresIn < (totalTtl * thresholdPercent) / 100
  } catch (error) {
    console.error("Error checking background refresh:", error)
    return false
  }
}
