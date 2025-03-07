import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExamRegistration } from '../types/examRegistration';

const ExamSuccessPage: React.FC = () => {
  const [registration, setRegistration] = useState<ExamRegistration | null>(null);

  useEffect(() => {
    // Get the most recent registration from localStorage
    const storedRegistrations = localStorage.getItem('examRegistrations');
    if (storedRegistrations) {
      const registrations = JSON.parse(storedRegistrations) as ExamRegistration[];
      if (registrations.length > 0) {
        // Get the latest registration
        const latestRegistration = registrations[registrations.length - 1];
        setRegistration(latestRegistration);
      }
    }
  }, []);

  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white shadow-md rounded p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-[#70393f]">Registration Not Found</h1>
          <p className="text-gray-700 mb-6 text-center">
            We couldn't find your registration details. Please try registering again.
          </p>
          <div className="text-center">
            <Link 
              to="/exam-registration" 
              className="inline-block bg-[#70393f] hover:bg-[#8a474f] text-white font-bold py-2 px-4 rounded-md transition duration-300"
            >
              Register for an Exam
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-md rounded p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-6 text-center text-[#70393f]">Registration Successful!</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-[#283339]">Registration Details</h2>
          <ul className="space-y-2 text-gray-700">
            <li><span className="font-medium">Name:</span> {registration.firstName} {registration.lastName}</li>
            <li><span className="font-medium">Email:</span> {registration.email}</li>
            <li><span className="font-medium">Instrument:</span> {registration.instrument}</li>
            <li><span className="font-medium">Grade:</span> {registration.grade}</li>
            <li><span className="font-medium">Amount Paid:</span> ₦{registration.totalAmount.toLocaleString()}</li>
            <li><span className="font-medium">Transaction ID:</span> {registration.transactionId}</li>
            <li>
              <span className="font-medium">Registration Date:</span> {new Date(registration.registrationDate).toLocaleDateString()}
            </li>
          </ul>
        </div>
        
        {/* <div className="bg-gray-100 p-4 rounded mb-6">
          <p className="text-gray-700 text-sm">
            A confirmation email with these details has been sent to your email address.
            Please save this information for your records. You will need to present this
            information on the day of your examination.
          </p>
        </div> */}
        
        <div className="text-center">
          <Link 
            to="/exam" 
            className="inline-block bg-[#70393f] hover:bg-[#8a474f] text-white font-bold py-2 px-4 rounded-md transition duration-300"
          >
            Return to Exam Page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ExamSuccessPage;