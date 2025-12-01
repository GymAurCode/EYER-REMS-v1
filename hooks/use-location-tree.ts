"use client";

import useSWR from "swr";
import { apiService } from "@/lib/api";
import type { LocationTreeNode } from "@/lib/location";

const fetchLocationTree = async () => {
  const response = await apiService.locations.getTree();
  const responseData = response.data as any;
  return responseData?.data ?? responseData;
};

export function useLocationTree() {
  const { data, error, mutate, isValidating } = useSWR<LocationTreeNode[]>(
    "locations/tree",
    fetchLocationTree,
    {
      revalidateOnFocus: true,
    },
  );

  return {
    tree: data ?? [],
    isLoading: !error && !data,
    isError: !!error,
    refresh: mutate,
    isValidating,
  };
}
