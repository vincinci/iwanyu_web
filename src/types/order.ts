export type PaymentMethod =
  | { type: "momo"; network: "MTN" | "Airtel"; phone: string };

export type OrderStatus = "Placed" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

export type OrderItem = {
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  vendorId?: string;
  status?: OrderStatus;
};

export type Order = {
  id: string;
  createdAt: string; // ISO
  status: OrderStatus;

  buyerUserId?: string;
  buyerEmail: string;

  shippingAddress: string;
  payment: PaymentMethod;

  items: OrderItem[];
  total: number;
};
