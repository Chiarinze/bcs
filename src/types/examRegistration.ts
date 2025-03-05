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