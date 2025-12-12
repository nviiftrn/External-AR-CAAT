
// Data Models matching the Audit Domain

export interface Customer {
  id: string;
  name: string;
  region: string;
  address: string; // Added for Confirmation Letter
  email: string;   // Added for Digital Confirmation
  riskProfile: 'Low' | 'Medium' | 'High';
}

export interface Invoice {
  id: string;
  customerId: string;
  invoiceDate: string; // YYYY-MM-DD
  amount: number;
  dueDate: string;
  shippingDate: string; // For cutoff testing
  recordingDate: string; // When it hit the GL
  status: 'Open' | 'Paid' | 'Disputed';
  subsequentPaymentAmount?: number; // Added: Payment received after audit date
  subsequentPaymentDate?: string;   // Added: Date of payment
  
  // --- COMPLEX AUDIT FIELDS (Traceability) ---
  soNumber?: string;       // Sales Order Number (Internal - Bukti Pesanan)
  doNumber?: string;       // Delivery Order / Surat Jalan (Bukti Fisik Kirim - Cutoff)
  poNumber?: string;       // Purchase Order (Bukti Pesanan Pelanggan - Existence)
  taxInvoiceNumber?: string; // Faktur Pajak (Compliance)
  description?: string;    // Detail Barang/Jasa
  currency?: string;       // Mata Uang
  term?: string;           // Termin Pembayaran (e.g., Net 30)
}

export interface GeneralLedgerSummary {
  accountCode: string;
  accountName: string;
  balance: number;
  asOfDate: string;
}

export interface AuditFinding {
  id: string;
  type: 'Tie-in' | 'Cutoff' | 'Confirmation' | 'Aging' | 'Analytical';
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  amountDifference?: number;
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null; // null for infinity
  amount: number;
  allowanceRate: number; // Percentage
  allowanceAmount: number;
}

export interface ConfirmationRequest {
  id: string;
  invoiceId: string;
  customerName: string;
  customerEmail: string; // Added
  recordedAmount: number;
  confirmedAmount?: number;
  status: 'Sent' | 'Received' | 'Exception' | 'Non-Response';
  difference: number;
}

// --- NEW TYPES FOR SYSTEM CONTROLS ---

export type UserRole = 'Partner' | 'Senior Auditor' | 'Junior Auditor' | 'Viewer';

export interface User {
    id: string;
    name: string;
    role: UserRole;
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    user: string;
    role: string;
    action: string;
    details: string;
    category: 'Data' | 'Procedure' | 'System' | 'Reporting';
}

export interface SystemTestResult {
    testName: string;
    status: 'Pass' | 'Fail';
    message: string;
    timestamp: string;
}

// Global App State Context Interface
export interface AuditState {
  clientName: string;
  auditYear: string;
  glData: GeneralLedgerSummary | null;
  invoices: Invoice[];
  customers: Customer[];
  findings: AuditFinding[];
  isDataLoaded: boolean;
  auditDate: string;
  // New Fields
  currentUser: User;
  auditLogs: AuditLogEntry[];
}
