"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { collection, getDocs, orderBy, limit, query } from "firebase/firestore"
import { db } from "../services/firebase"
import { useNavigate } from "react-router-dom"
import "./search.css"

interface SearchResult {
  eventName: string
  imageURL: string
  creatorID: string
  eventId: string
  freeOrPaid: boolean
  collection: "publicEvents" | "EventCollection"
}

interface SearchProps {
  onClose?: () => void
  className?: string
}

const Search: React.FC<SearchProps> = ({ onClose, className = "" }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<"all" | "publicEvents" | "EventCollection">("all")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const placeholderWords = ["events", "parties", "meetings", "programs", "conferences"]

  // Animated placeholder cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderWords.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [placeholderWords.length])

  // Search functionality
  const performSearch = useCallback(
    async (searchText: string) => {
      if (searchText.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsLoading(true)
      try {
        const results: SearchResult[] = []
        const searchLower = searchText.toLowerCase()

        // Search in publicEvents collection
        if (selectedFilter === "all" || selectedFilter === "publicEvents") {
          const publicEventsQuery = query(collection(db, "publicEvents"), orderBy("timestamp", "desc"), limit(20))
          const publicSnapshot = await getDocs(publicEventsQuery)

          publicSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            if (data.eventName && data.eventName.toLowerCase().includes(searchLower)) {
              results.push({
                eventName: data.eventName,
                imageURL: data.imageURL || "/placeholder.svg",
                creatorID: data.creatorID,
                eventId: data.eventId || doc.id,
                freeOrPaid: data.freeOrPaid || false,
                collection: "publicEvents",
              })
            }
          })
        }

        // Search in EventCollection
        if (selectedFilter === "all" || selectedFilter === "EventCollection") {
          const eventCollectionQuery = query(collection(db, "EventCollection"), orderBy("timestamp", "desc"), limit(20))
          const collectionSnapshot = await getDocs(eventCollectionQuery)

          collectionSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            if (data.eventName && data.eventName.toLowerCase().includes(searchLower)) {
              results.push({
                eventName: data.eventName,
                imageURL: data.imageURL || "/placeholder.svg",
                creatorID: data.creatorID,
                eventId: data.eventId || doc.id,
                freeOrPaid: data.freeOrPaid || false,
                collection: "EventCollection",
              })
            }
          })
        }

        // Sort results by relevance
        results.sort((a, b) => {
          const aRelevance = a.eventName.toLowerCase().indexOf(searchLower)
          const bRelevance = b.eventName.toLowerCase().indexOf(searchLower)
          return aRelevance - bRelevance
        })

        setSearchResults(results.slice(0, 10))
      } catch (error) {
        console.error("Search error:", error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [selectedFilter],
  )

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, performSearch])

  // Handle search focus
  const handleFocus = () => {
    setIsExpanded(true)
  }

  // Handle search blur
  const handleBlur = (e: React.FocusEvent) => {
    // Don't close if clicking on results or filters
    if (searchRef.current && !searchRef.current.contains(e.relatedTarget as Node)) {
      setTimeout(() => {
        setIsExpanded(false)
        setSearchQuery("")
        setSearchResults([])
      }, 200)
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(`/event/${result.creatorID}/${result.eventId}`)
    setIsExpanded(false)
    setSearchQuery("")
    setSearchResults([])
    onClose?.()
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false)
        setSearchQuery("")
        setSearchResults([])
        onClose?.()
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isExpanded, onClose])

  return (
    <>
      {/* Backdrop for expanded state */}
      {isExpanded && <div className="search-backdrop" onClick={() => setIsExpanded(false)} />}

      <div ref={searchRef} className={`search-container ${isExpanded ? "expanded" : ""} ${className}`}>
        <div className="search-wrapper">
          {/* Search Input */}
          <div className="search-input-wrapper">
            <div className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="search-input"
              placeholder={`Search for your ${placeholderWords[placeholderIndex]}`}
            />

            {isLoading && (
              <div className="search-loading">
                <div className="loading-spinner"></div>
              </div>
            )}

            {isExpanded && (
              <button
                className="search-close"
                onClick={() => {
                  setIsExpanded(false)
                  setSearchQuery("")
                  setSearchResults([])
                  onClose?.()
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Filters */}
          {isExpanded && (
            <div className="search-filters">
              <button
                className={`filter-btn ${selectedFilter === "all" ? "active" : ""}`}
                onClick={() => setSelectedFilter("all")}
              >
                All Events
              </button>
              <button
                className={`filter-btn ${selectedFilter === "publicEvents" ? "active" : ""}`}
                onClick={() => setSelectedFilter("publicEvents")}
              >
                Public Events
              </button>
              <button
                className={`filter-btn ${selectedFilter === "EventCollection" ? "active" : ""}`}
                onClick={() => setSelectedFilter("EventCollection")}
              >
                Event Collections
              </button>
            </div>
          )}

          {/* Search Results */}
          {isExpanded && searchQuery.trim().length >= 2 && (
            <div className="search-results">
              {isLoading ? (
                <div className="search-loading-state">
                  <div className="loading-spinner"></div>
                  <span>Searching for event...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="results-header">
                    <span>
                      {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                    </span>
                  </div>
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.collection}-${result.eventId}-${index}`}
                      className="search-result-item"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="result-image">
                        <img src={result.imageURL || "/placeholder.svg"} alt={result.eventName} />
                      </div>

                      <div className="result-content">
                        <h3 className="result-title">{result.eventName}</h3>
                        <div className="result-price">
                          <span className={`price-badge ${result.freeOrPaid ? "paid" : "free"}`}>
                            {result.freeOrPaid ? "Paid Event" : "Free Event"}
                          </span>
                        </div>
                      </div>

                      <div className="result-arrow">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="9,18 15,12 9,6" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-results">
                  <div className="no-results-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <h3>No events found</h3>
                  <p>Try adjusting your search terms or filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Search
