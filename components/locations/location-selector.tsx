"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";
import { LOCATION_LEVELS, LocationTreeNode, formatLevelLabel } from "@/lib/location";
import { useLocationTree } from "@/hooks/use-location-tree";

type LocationSelectorProps = {
  value?: string | null;
  onChange: (node: LocationTreeNode | null) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
};

const CLEAR_SELECTION_VALUE = "__clear__";

const findPath = (nodes: LocationTreeNode[], targetId?: string | null): LocationTreeNode[] => {
  if (!targetId) return [];

  for (const node of nodes) {
    if (node.id === targetId) {
      return [node];
    }

    const childPath = findPath(node.children, targetId);
    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }

  return [];
};

export function LocationSelector({
  value,
  onChange,
  label,
  helperText,
  disabled,
}: LocationSelectorProps) {
  const { tree, isLoading } = useLocationTree();
  const [childrenCache, setChildrenCache] = useState<Record<string, LocationTreeNode[]>>({});
  const [childrenLoading, setChildrenLoading] = useState<Record<string, boolean>>({});

  const path = useMemo(() => findPath(tree, value), [tree, value]);

  useEffect(() => {
    const parentsToLoad = path
      .map((node) => node.id)
      .filter((id) => !childrenCache[id] && !childrenLoading[id]);

    if (parentsToLoad.length === 0) {
      return;
    }

    parentsToLoad.forEach(async (parentId) => {
      setChildrenLoading((prev) => ({ ...prev, [parentId]: true }));
      try {
        const response = await apiService.locations.getChildren(parentId);
        const responseData = response.data as any;
        const data = responseData?.data ?? responseData;
        setChildrenCache((prev) => ({ ...prev, [parentId]: data }));
      } catch (error) {
        // Swallow errors silently for UI resilience
      } finally {
        setChildrenLoading((prev) => ({ ...prev, [parentId]: false }));
      }
    });
  }, [path, childrenCache, childrenLoading]);

  const getOptionsForLevel = (index: number) => {
    if (index === 0) {
      return tree;
    }

    const parent = path[index - 1];
    if (!parent) {
      return [];
    }

    const cached = childrenCache[parent.id];
    return (cached && cached.length > 0) ? cached : parent.children;
  };

  const handleSelection = (level: number, selectedId: string) => {
    if (selectedId === CLEAR_SELECTION_VALUE) {
      onChange(null);
      return;
    }

    if (!selectedId) {
      onChange(null);
      return;
    }

    const options = getOptionsForLevel(level);
    const selectedNode = options.find((option) => option.id === selectedId);

    if (selectedNode) {
      onChange(selectedNode);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-semibold">{label}</Label>}
      <div className="grid gap-3 md:grid-cols-2">
        {LOCATION_LEVELS.map((level, index) => {
          const options = getOptionsForLevel(index);
          const isDisabled = disabled || (index > 0 && !path[index - 1]);
          const selectedValue = path[index]?.id ?? "";
          const loadingChildren = path[index - 1] ? childrenLoading[path[index - 1].id] : false;

          return (
            <Select
              key={level}
              value={selectedValue}
              onValueChange={(value) => handleSelection(index, value)}
              disabled={isDisabled || isLoading}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue
                  placeholder={`Select ${formatLevelLabel(level)}`}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR_SELECTION_VALUE}>Clear selection</SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading locations...
                  </SelectItem>
                ) : loadingChildren ? (
                  <SelectItem value="loading" disabled>
                    Loading children...
                  </SelectItem>
                ) : options.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No options available
                  </SelectItem>
                ) : (
                  options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          );
        })}
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

