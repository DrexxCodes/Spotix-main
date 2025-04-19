/**
 * Utility functions for caching data in the application
 * Dev by Drexx
 * Version 1.0
 * Prod: 2025
 */

// Set data in session storage with expiration
export const setWithExpiry = (key: string, value: any, ttl: number) => {
  const now = new Date()
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  }
  sessionStorage.setItem(key, JSON.stringify(item))
}

// Get data from session storage, checking expiration
export const getWithExpiry = (key: string) => {
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
}

// Clear all cached data
export const clearCache = () => {
  sessionStorage.clear()
}

// Clear specific cached data
export const clearCacheItem = (key: string) => {
  sessionStorage.removeItem(key)
}

// Cache ticket data with 30 minute expiry by default
export const cacheTicketData = (ticketId: string, data: any, ttl = 1800000) => {
  setWithExpiry(`ticket_${ticketId}`, data, ttl)
}

// Get cached ticket data
export const getCachedTicketData = (ticketId: string) => {
  return getWithExpiry(`ticket_${ticketId}`)
}

