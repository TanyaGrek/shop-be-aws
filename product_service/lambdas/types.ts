export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number; // Joined from `stocks` table
}

export interface Stock {
  product_id: string;
  count: number;
}
