import React, { useState, useEffect } from 'react';
import { EXAM_PRICES, INSTRUMENTS, ExamRegistration } from '../types/examRegistration';
import { useNavigate, useLocation } from 'react-router-dom';

const ExamRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState<Omit<ExamRegistration, 'paymentStatus' | 'registrationDate' | 'id'>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    grade: 1,
    instrument: '',
    totalAmount: EXAM_PRICES[1]
  });
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrations, setRegistrations] = useState<ExamRegistration[]>([]);

  // Function to generate a simple unique ID
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
  };

  // Load any existing registrations from localStorage
  useEffect(() => {
    const storedRegistrations = localStorage.getItem('examRegistrations');
    if (storedRegistrations) {
      setRegistrations(JSON.parse(storedRegistrations));
    }
  }, []);

  // Check for Paystack reference in URL on component mount
  useEffect(() => {
    const verifyPaymentAndRegister = async () => {
      const urlParams = new URLSearchParams(location.search);
      const reference = urlParams.get('reference');
      const trxref = urlParams.get('trxref');
      
      // If there's a reference and trxref in the URL, verify the payment
      if (reference && trxref) {
        setIsLoading(true);
        setError('');
        
        try {
          // Get the pending registration from localStorage
          const pendingRegistration = localStorage.getItem('pendingRegistration');
          
          if (!pendingRegistration) {
            throw new Error('No pending registration found');
          }
          
          const registration = JSON.parse(pendingRegistration);
          
          // Verify payment with Paystack public API
          // Note: In a production app, you should verify on the backend
          // This is a simplified frontend-only approach
          const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`
            }
          });
          
          const data = await response.json();
          
          if (data.status && data.data.status === 'success') {
            // Payment was successful
            const newRegistration: ExamRegistration = {
              ...registration,
              id: generateId(),
              paymentStatus: 'completed',
              transactionId: reference,
              registrationDate: new Date()
            };
            
            // Add to registrations and save to localStorage
            const updatedRegistrations = [...registrations, newRegistration];
            setRegistrations(updatedRegistrations);
            localStorage.setItem('examRegistrations', JSON.stringify(updatedRegistrations));
            
            // Remove pending registration
            localStorage.removeItem('pendingRegistration');
            
            // Show success message and redirect
            // setSuccess('Registration successful! Redirecting to exam page...');
            
            navigate('/exam-success');
          } else {
            // Payment failed
            setError('Payment verification failed. Please try again.');
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          setError('An error occurred while verifying your payment. Please contact support.');
          setIsLoading(false); // Reset loading state on error
        }
      }
    };

    verifyPaymentAndRegister();
  }, [location, navigate, registrations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      // Create updated data with the new field value
      const updatedData = {
        ...prev,
        [name]: name === 'grade' ? Number(value) : value
      };
      
      // Calculate the total amount based on the updated grade value
      // Use the updated grade if the grade field is being changed, otherwise use the previous grade
      const currentGrade = name === 'grade' ? Number(value) : prev.grade;
      
      // Set the total amount based on the coupon code and current grade
      const totalAmount = couponCode === 'GRADED-BCS' 
        ? 10000 
        : EXAM_PRICES[currentGrade as keyof typeof EXAM_PRICES];
      
      return {
        ...updatedData,
        totalAmount
      };
    });
  };

  const initializePaystack = (email: string, amount: number) => {
    // @ts-expect-error - PaystackPop is loaded from the script in public/index.html
    const handler = window.PaystackPop?.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email,
      amount: amount * 100, // Paystack expects amount in kobo (x100)
      currency: 'NGN',
      ref: `bima_exam_${Date.now()}`,
      callback: function(response: { reference: string }) {
        // Instead of handling verification here, we'll do an immediate redirect to our success page
        // This will trigger the useEffect verification logic with the reference in URL
        window.location.href = `/exam-registration?reference=${response.reference}&trxref=${response.reference}`;
      },
      onClose: function() {
        setIsLoading(false);
        console.log('Payment window closed');
      }
    });
    
    handler.openIframe();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Validate form data
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.instrument) {
        throw new Error('Please fill in all required fields');
      }

      // Create pending registration
      const pendingRegistration: Omit<ExamRegistration, 'id'> = {
        ...formData,
        paymentStatus: 'pending',
        registrationDate: new Date()
      };
      
      // Save pending registration to localStorage
      localStorage.setItem('pendingRegistration', JSON.stringify(pendingRegistration));
      
      // Initialize Paystack payment
      initializePaystack(formData.email, formData.totalAmount);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">BIMA Graded Exam Registration</h1>
      
      <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstName">
            First Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="firstName"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lastName">
            Last Name
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="lastName"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
            Phone Number
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="grade">
            Grade
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="grade"
            name="grade"
            value={formData.grade}
            onChange={handleInputChange}
            required
          >
            {Object.keys(EXAM_PRICES).map(grade => (
              <option key={grade} value={grade}>
                Grade {grade} - ₦{EXAM_PRICES[Number(grade) as keyof typeof EXAM_PRICES].toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="instrument">
            Instrument
          </label>
          <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="instrument"
            name="instrument"
            value={formData.instrument}
            onChange={handleInputChange}
            required
          >
            <option value="">Select an Instrument</option>
            {INSTRUMENTS.map(instrument => (
              <option key={instrument} value={instrument}>
                {instrument}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="couponCode">
            Coupon Code (Optional)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="couponCode"
            type="text"
            value={couponCode}
            onChange={(e) => {
              const newCouponCode = e.target.value;
              setCouponCode(newCouponCode);
              
              // Update the total amount based on the new coupon code
              setFormData(prev => ({
                ...prev,
                totalAmount: newCouponCode === 'GRADED-BCS' 
                  ? 10000 
                  : EXAM_PRICES[prev.grade as keyof typeof EXAM_PRICES]
              }));
            }}
          />
        </div>

        <div className="mb-6">
          <p className="text-gray-700 text-sm">
            Total Amount: ₦{formData.totalAmount?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-[#70393f] hover:bg-[#8a474f] text-white py-2 px-4 rounded-md transition duration-300"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Register and Pay'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExamRegistrationPage;