import { Invoice, Customer, GeneralLedgerSummary } from './types';

export const MOCK_CUSTOMERS: Customer[] = [
    { id: 'CUST-001', name: 'Acme Corp', region: 'North America', address: '123 Elm St, New York, NY', email: 'contact@acme.com', riskProfile: 'Low' },
    { id: 'CUST-002', name: 'Globex Inc', region: 'Europe', address: '456 High St, London, UK', email: 'info@globex.com', riskProfile: 'Medium' },
    { id: 'CUST-003', name: 'Soylent Corp', region: 'Asia', address: '789 Future Way, Tokyo, JP', email: 'sales@soylent.com', riskProfile: 'High' },
    { id: 'CUST-004', name: 'Initech', region: 'North America', address: '101 Tech Blvd, Austin, TX', email: 'bill@initech.com', riskProfile: 'Low' },
    { id: 'CUST-005', name: 'Umbrella Corp', region: 'Europe', address: '666 Bio Lane, Raccoon City', email: 'alert@umbrella.com', riskProfile: 'High' },
];

export const MOCK_GL_DATA: GeneralLedgerSummary = {
    accountCode: '11000',
    accountName: 'Accounts Receivable - Trade',
    balance: 1452500.00, // Intentionally slight mismatch for tie-in test
    asOfDate: '2023-12-31',
};

// Helper to generate random invoices
const generateInvoices = (count: number): Invoice[] => {
    const invoices: Invoice[] = [];
    const baseDate = new Date('2023-12-31').getTime();
    
    for (let i = 0; i < count; i++) {
        const isCutoffRisk = i % 15 === 0; // Simulate cutoff issue
        const isOld = i % 10 === 0;
        
        const daysOffset = isOld ? Math.floor(Math.random() * 120) : Math.floor(Math.random() * 45);
        const invoiceDate = new Date(baseDate - (daysOffset * 86400000));
        
        let shippingDate = new Date(invoiceDate);
        let recordingDate = new Date(invoiceDate);

        if (isCutoffRisk) {
            // Create a cutoff error: Recorded in Dec, Shipped in Jan
            recordingDate = new Date('2023-12-30');
            shippingDate = new Date('2024-01-03');
        }

        invoices.push({
            id: `INV-${1000 + i}`,
            customerId: MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)].id,
            amount: Math.floor(Math.random() * 50000) + 1000,
            invoiceDate: invoiceDate.toISOString().split('T')[0],
            dueDate: new Date(invoiceDate.getTime() + (30 * 86400000)).toISOString().split('T')[0],
            status: 'Open',
            shippingDate: shippingDate.toISOString().split('T')[0],
            recordingDate: recordingDate.toISOString().split('T')[0],
        });
    }
    return invoices;
};

export const MOCK_INVOICES = generateInvoices(50);
