export interface ExamRegistration {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  grade: number;
  instrument: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  totalAmount: number;
  registrationDate: Date;
}

export const EXAM_PRICES = {
  1: 10000,
  2: 18000,
  3: 26000,
  4: 34000,
  5: 42000,
  6: 51000,
  7: 60000,
  8: 69999
};

export const INSTRUMENTS = [
  'Piano', 
  'Guitar', 
  'Violin', 
  'Voice', 
  'Drums', 
  'Saxophone', 
  'Trumpet', 
  'Flute'
];

export interface PaystackResponse {
  reference: string;
  status: string;
  trans: string;
  message: string;
  transaction: string;
  trxref: string;
}

export interface PaystackOptions {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  callback: (response: PaystackResponse) => void;
  onClose: () => void;
  metadata?: Record<string, unknown>;
}

export interface PaystackPopInterface {
  setup(options: PaystackOptions): {
    openIframe(): void;
  };
}

export interface Window {
  PaystackPop?: PaystackPopInterface;
}