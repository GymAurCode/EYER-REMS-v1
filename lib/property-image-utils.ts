/**
 * Utility functions for handling property image URLs
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/**
 * Get the full URL for a property image
 * Handles various image URL formats:
 * - Full HTTP/HTTPS URLs
 * - Secure files paths (/secure-files/...)
 * - Legacy upload paths (/uploads/...)
 * - Base64 data URLs
 * - Property-specific routes (/property/{id})
 */
export function getPropertyImageUrl(propertyId: string | number, imageUrl?: string | null): string | null {
  if (!imageUrl) {
    return null
  }

  // Full HTTP/HTTPS URLs - return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // Base64 data URLs - return as-is
  if (imageUrl.startsWith('data:image/')) {
    return imageUrl
  }

  // Use the property image endpoint for all other cases
  // This handles /secure-files/..., /uploads/..., /property/{id}, etc.
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '')
  let url = `${baseUrl}/api/properties/${propertyId}/image`

  // Append token for authentication if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      url += `?token=${token}`
    }
  }

  return url
}

/**
 * Get image URL for display in img src
 * Falls back to property image endpoint if imageUrl is not a full URL
 */
export function getPropertyImageSrc(propertyId: string | number, imageUrl?: string | null): string {
  if (!imageUrl) {
    return ''
  }

  // Full HTTP/HTTPS URLs - return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // Base64 data URLs - return as-is
  if (imageUrl.startsWith('data:image/')) {
    return imageUrl
  }

  // For all other paths, use the property image endpoint
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '')
  let url = `${baseUrl}/api/properties/${propertyId}/image`

  // Append token for authentication if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      url += `?token=${token}`
    }
  }

  return url
}

