export interface ProductVersion {
  id: string;
  product_id: string;
  version_name: string;
  release_date: string;
  storage_path: string;
  file_size_bytes: number;
  changelog?: string | null;
}

export interface Plan {
  id: string;
  product_id: string;
  name: string;
  price_cents: number;
  duration: 'lifetime' | 'days_30' | 'days_90' | string;
  duration_days: number | null;
  is_active: boolean;
  abacatepay_product_id?: string | null;
  badge?: string | null;
  description?: string | null;
  features?: string[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  base_game: string;
  is_active: boolean;
  created_at?: string;
  product_versions?: ProductVersion[];
  plans?: Plan[];
}
