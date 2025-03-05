import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ExamRegistration } from '../types/examRegistration';
import axios from 'axios';

export const registerForExam = async (registration: ExamRegistration) => {
  try {
    // Add registration to Firestore
    const docRef = await addDoc(collection(db, 'examRegistrations'), {
      ...registration,
      registrationDate: new Date()
    });

    // Send confirmation email (you'd typically use a backend service for this)
    await sendConfirmationEmail(registration);

    return docRef.id;
  } catch (error) {
    console.error('Error registering for exam:', error);
    throw error;
  }
};

const sendConfirmationEmail = async (registration: ExamRegistration) => {
  // In a real-world scenario, you'd use a backend service or cloud function
  // This is a placeholder for email sending logic
  console.log('Sending confirmation email to:', registration.email);
};

export const processPayment = async (
  registration: ExamRegistration, 
  paystackToken: string
) => {
  try {
    // Integrate with Paystack API
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      amount: registration.totalAmount * 100, // Paystack expects amount in kobo
      email: registration.email,
      callback_url: 'https://your-website.com/exam-registration-confirmation'
    }, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
};