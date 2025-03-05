import axios from 'axios';

export const initializePaystackPayment = async (
  email: string, 
  amount: number, 
  callbackUrl: string
) => {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize', 
      {
        email,
        amount: amount * 100, // Paystack expects amount in kobo
        callback_url: callbackUrl
      }, 
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack payment initialization error:', error);
    throw error;
  }
};

export const verifyPayment = async (reference: string) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack payment verification error:', error);
    throw error;
  }
};