import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./client";
import type {
  Collection,
  CreateCollectionData,
  CreateItemData,
  CreateTagData,
  Item,
  ItemFilters,
  Tag,
  UpdateTagData,
  UploadUrl,
} from "./types";

/**
 * Query keys:
 *   ["collections"]                          — the collections list
 *   ["collections", id, "items", filters]    — filtered items of a collection
 *   ["collections", id, "tags", q]           — tags of a collection (q = autocomplete prefix)
 *
 * Mutations invalidate every key whose data they may have changed: item
 * mutations touch items, tag counts, AND the collections list (item_count,
 * recents, updated_at); tag mutations touch tags and items (tag names shown
 * on item cards).
 */
export const keys = {
  collections: ["collections"] as const,
  items: (collectionId: number, filters?: ItemFilters) =>
    ["collections", collectionId, "items", filters ?? {}] as const,
  allItems: (collectionId: number) => ["collections", collectionId, "items"] as const,
  tags: (collectionId: number, q?: string) =>
    q === undefined
      ? (["collections", collectionId, "tags"] as const)
      : (["collections", collectionId, "tags", q] as const),
};

export function useCollections() {
  return useQuery({
    queryKey: keys.collections,
    queryFn: () => api.get<Collection[]>("/collections"),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCollectionData) => api.post<Collection>("/collections", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.collections });
    },
  });
}

export function useItems(collectionId: number, filters: ItemFilters = {}) {
  const params = new URLSearchParams();
  if (filters.tags?.length) params.set("tags", filters.tags.join(","));
  if (filters.match) params.set("match", filters.match);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return useQuery({
    queryKey: keys.items(collectionId, filters),
    queryFn: () => api.get<Item[]>(`/collections/${collectionId}/items${qs ? `?${qs}` : ""}`),
    // Keep the previous grid rendered while a new filter fetches — the
    // store-check flow must never flash empty.
    placeholderData: keepPreviousData,
  });
}

function invalidateItemsSphere(qc: ReturnType<typeof useQueryClient>, collectionId: number) {
  void qc.invalidateQueries({ queryKey: keys.allItems(collectionId) });
  void qc.invalidateQueries({ queryKey: keys.tags(collectionId) });
  void qc.invalidateQueries({ queryKey: keys.collections });
}

export function useCreateItem(collectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemData) =>
      api.post<Item>(`/collections/${collectionId}/items`, data),
    onSuccess: () => invalidateItemsSphere(qc, collectionId),
  });
}

export function useDeleteItem(collectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.delete(`/collections/${collectionId}/items/${itemId}`),
    onSuccess: () => invalidateItemsSphere(qc, collectionId),
  });
}

export function useTags(collectionId: number, q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return useQuery({
    queryKey: keys.tags(collectionId, q ?? ""),
    queryFn: () => api.get<Tag[]>(`/collections/${collectionId}/tags${qs}`),
  });
}

export function useCreateTag(collectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTagData): Promise<Tag> => {
      try {
        return await api.post<Tag>(`/collections/${collectionId}/tags`, data);
      } catch (err) {
        // 409 = tag already exists; create-on-select treats that as success.
        if (err instanceof ApiError && err.status === 409) {
          const detail = err.detail as { tag?: { id: number; name: string } };
          if (detail?.tag) return { ...detail.tag, count: 0 };
        }
        throw err;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.tags(collectionId) });
    },
  });
}

export function useRenameTag(collectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: number; data: UpdateTagData }) =>
      api.patch<Tag>(`/collections/${collectionId}/tags/${tagId}`, data),
    onSuccess: () => invalidateItemsSphere(qc, collectionId),
  });
}

export function useDeleteTag(collectionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tagId: number) => api.delete(`/collections/${collectionId}/tags/${tagId}`),
    onSuccess: () => invalidateItemsSphere(qc, collectionId),
  });
}

export function useUploadUrl(collectionId: number) {
  return useMutation({
    mutationFn: (contentType: string) =>
      api.get<UploadUrl>(
        `/collections/${collectionId}/items/upload-url?content_type=${encodeURIComponent(contentType)}`,
      ),
  });
}
