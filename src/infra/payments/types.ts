export interface AbacatePayPaymentData {
  amount: number; // em centavos
  description: string;
  customer: {
    name: string;
    email: string;
    document?: string; // CPF
  };
  metadata: {
    order_id: string;
    user_id: string;
    plan_id: string;
  };
}

export interface AbacatePayPaymentResponse {
  id: string;
  status: 'pending' | 'paid' | 'canceled' | 'expired';
  pix_qr_code?: string;
  pix_expiration?: string;
  payment_url?: string;
  created_at: string;
}

export interface AbacatePayWebhookPayload {
  event: 'payment.created' | 'payment.paid' | 'payment.canceled' | 'payment.expired';
  data: {
    id: string;
    status: string;
    amount: number;
    metadata: {
      order_id: string;
      user_id: string;
      plan_id: string;
    };
  };
}