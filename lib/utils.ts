import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "Rs 0"
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(numValue)) return "Rs 0"
  
  // Pakistani Rupees formatting
  if (numValue >= 10000000) {
    // Crores
    return `Rs ${(numValue / 10000000).toFixed(2)}Cr`
  } else if (numValue >= 100000) {
    // Lakhs
    return `Rs ${(numValue / 100000).toFixed(2)}L`
  } else {
    // Regular formatting
    return `Rs ${Math.round(numValue).toLocaleString("en-PK")}`
  }
}

/**
 * Trigger a client-side JSON download for any data object.
 */
export function downloadJSON(data: unknown, filename: string) {
  const safeName = filename.endsWith('.json') ? filename : `${filename}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeName
  link.click()
  URL.revokeObjectURL(url)
}
