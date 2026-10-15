export const API_URL = "/api";

export type Product = {
  id: number;
  name: string;
  category?: string;
  scent?: string;
  price: number | string;
  stock: number;
  active: boolean;
  description?: string;

  // Nouveauté
  isNew?: boolean;
  newProduct?: boolean;
  nouveaute?: boolean;

  // Ancien prix / promotion
  oldPrice?: number | string;
  previousPrice?: number | string;
};

export type CustomerRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
};

export type OrderItemRequest = {
  productId: number;
  quantity: number;
};

export type CreateOrderRequest = {
  customer: CustomerRequest;
  items: OrderItemRequest[];
  deliveryMethod: "STANDARD" | "EXPRESS";
  paymentMethod: "CASH_ON_DELIVERY";
  giftMessage?: string;
};

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/products`);

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      text || `Impossible de charger les produits (${response.status})`
    );
  }

  return response.json();
}

export async function createOrder(
  payload: CreateOrderRequest
) {
  console.log(
    "📦 Données envoyées au backend :",
    JSON.stringify(payload, null, 2)
  );

  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(
      "❌ Erreur backend :",
      response.status,
      text
    );

    throw new Error(
      text ||
        `Erreur lors de la création de la commande (${response.status})`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}