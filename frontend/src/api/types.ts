// Mirrors backend/app/schemas — the backend is the source of truth.

export interface Collection {
  id: number;
  name: string;
  description: string;
  item_count: number;
  updated_at: string;
  recent_image_urls: string[];
  role: string;
}

export interface CreateCollectionData {
  name: string;
  description?: string;
}

export interface ItemTagRef {
  id: number;
  name: string;
}

export interface Item {
  id: number;
  name: string;
  notes: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  added_by: string;
  tags: ItemTagRef[];
}

export interface CreateItemData {
  name: string;
  image_url?: string | null;
  notes?: string;
  tag_ids: number[];
}

export interface ItemFilters {
  tags?: string[];
  match?: "all" | "any";
  limit?: number;
  offset?: number;
}

export interface Tag {
  id: number;
  name: string;
  count: number;
}

export interface CreateTagData {
  name: string;
}

export interface UpdateTagData {
  name: string;
}

export interface UploadUrl {
  upload_url: string;
  image_url: string;
  expires_in: number;
}
