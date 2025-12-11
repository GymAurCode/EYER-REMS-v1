"use client"

import useSWR from "swr"
import { apiService } from "@/lib/api"

type DropdownCategoryResponse = {
  data: {
    id: string
    key: string
    name: string
    description?: string
    options: {
      id: string
      label: string
      value: string
      sortOrder: number
      isActive: boolean
    }[]
  }[]
}

type DropdownByKeyResponse = {
  data: {
    id: string
    key: string
    name: string
    description?: string
    options: {
      id: string
      label: string
      value: string
      sortOrder: number
      isActive: boolean
    }[]
  }
  options: {
    id: string
    label: string
    value: string
    sortOrder: number
    isActive: boolean
  }[]
}

export const useDropdownCategories = () => {
  const { data, error, mutate, isLoading } = useSWR(
    "dropdown-categories",
    async () => {
      const response = await apiService.advanced.getDropdownCategories()
      return (response.data as any as DropdownCategoryResponse).data
    },
    { revalidateOnFocus: false }
  )

  return {
    categories: data || [],
    isLoading,
    error,
    mutate,
  }
}

export const useDropdownOptions = (categoryKey?: string) => {
  const { data, error, mutate, isLoading } = useSWR(
    categoryKey ? ["dropdown", categoryKey] : null,
    async () => {
      try {
        const response = await apiService.advanced.getDropdownByKey(categoryKey!)
        const payload = response.data as any as DropdownByKeyResponse
        return payload.options || payload.data?.options || []
      } catch (err) {
        // Fallback to empty options if the user lacks access (e.g., non-admin) or API fails
        console.warn("Dropdown load failed", { categoryKey, err })
        return []
      }
    },
    { revalidateOnFocus: false }
  )

  return {
    options: data || [],
    isLoading,
    isError: Boolean(error),
    mutate,
  }
}

