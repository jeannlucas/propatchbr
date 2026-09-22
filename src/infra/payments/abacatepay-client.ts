import { AbacatePayPaymentData, AbacatePayPaymentResponse } from './types';

const API_KEY = process.env.ABACATEPAY_API_KEY;
const BASE_URL = process.env.ABACATEPAY_BASE_URL || 'https://sandbox.abacatepay.com/api/v1';

export class AbacatePayClient {
  private headers: HeadersInit;

  constructor() {
    if (!API_KEY) {
      console.error('ABACATEPAY_API_KEY not configured');
    }
    this.headers = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async createPayment(data: AbacatePayPaymentData): Promise<AbacatePayPaymentResponse> {
    console.log('AbacatePay API Request:', {
      url: `${BASE_URL}/payments`,
      headers: this.headers,
      body: data,
    });

    const response = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    const responseBody = await response.text();
    console.log('AbacatePay API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    });

    if (!response.ok) {
      try {
        const error = JSON.parse(responseBody);
        console.error('AbacatePay API Error Details:', error);
        throw new Error(error.message || 'Failed to create payment');
      } catch (parseError) {
        console.error('Failed to parse error response:', responseBody);
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }
    }

    return JSON.parse(responseBody);
  }

  async getPayment(paymentId: string): Promise<AbacatePayPaymentResponse> {
    const response = await fetch(`${BASE_URL}/payments/${paymentId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment');
    }

    return response.json();
  }
}