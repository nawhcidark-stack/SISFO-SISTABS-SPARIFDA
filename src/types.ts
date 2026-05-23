export interface Student {
  id: string;
  nis: string;
  name: string;
  class: string;
  email: string;
  phone: string;
  savingsBalance: number;
  password?: string;
}

export interface SppBill {
  id: string;
  studentId: string;
  month: string; // e.g., "Januari", "Februari"
  year: number;
  amount: number;
  status: 'paid' | 'unpaid' | 'pending';
  paidAt?: string;
  paymentMethod?: string;
  orderId?: string;
}

export interface SavingsTransaction {
  id: string;
  studentId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  paymentMethod?: string;
  orderId?: string;
  notes?: string;
}

export interface RealtimeNotification {
  id: string;
  studentId?: string; // all if undefined
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'payment';
  createdAt: string;
}

export interface MidtransConfig {
  merchantId: string;
  clientKey: string;
  serverKey: string;
  isProduction: boolean;
  adminFee?: number;
  systemMaintenanceFee?: number;
  chargeFeesToUser?: boolean;
}

export interface SchoolIdentity {
  name: string;
  subheading: string;
  accreditation: string;
  address: string;
  phone: string;
  principal: string;
  treasurer: string;
  logo: string;
  logo2?: string;
  letterhead?: string;
  treasurerSignature?: string;
  schoolStamp?: string;
  sppRates?: {
    grade7: number;
    grade8: number;
    grade9: number;
  };
}

export interface WhatsappConfig {
  token: string;
  sender: string;
  provider: string;
  baseUrl: string;
  enabled: boolean;
  notifyOnBilling: boolean;
  notifyOnPayment: boolean;
  notifyOnSavings: boolean;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  date: string; // "YYYY-MM-DD"
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';
  notes?: string;
}

export interface HomeroomTeacher {
  id: string;
  username: string;
  name: string;
  className: string; // e.g., "7-A", "7-B", "8-A", "9-C"
  password?: string;
}
