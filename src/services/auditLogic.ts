
import { Invoice, AgingBucket, ConfirmationRequest, AuditFinding, Customer, GeneralLedgerSummary } from '../types';

/**
 * Menghitung selisih hari antara dua tanggal.
 */
export const daysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.ceil((d2 - d1) / (1000 * 3600 * 24));
};

/**
 * Mesin Kalkulasi Ulang Independen: Analisis Umur Piutang
 */
export const calculateAging = (invoices: Invoice[], auditDate: string): AgingBucket[] => {
  const buckets: AgingBucket[] = [
    { label: 'Belum Jatuh Tempo', minDays: -9999, maxDays: 0, amount: 0, allowanceRate: 0.5, allowanceAmount: 0 },
    { label: '1-30 Hari', minDays: 1, maxDays: 30, amount: 0, allowanceRate: 2, allowanceAmount: 0 },
    { label: '31-60 Hari', minDays: 31, maxDays: 60, amount: 0, allowanceRate: 5, allowanceAmount: 0 },
    { label: '61-90 Hari', minDays: 61, maxDays: 90, amount: 0, allowanceRate: 15, allowanceAmount: 0 },
    { label: '> 90 Hari', minDays: 91, maxDays: null, amount: 0, allowanceRate: 50, allowanceAmount: 0 },
  ];

  invoices.forEach(inv => {
    const age = daysBetween(inv.invoiceDate, auditDate);
    const bucket = buckets.find(b => {
      if (b.maxDays === null) return age >= b.minDays;
      return age >= b.minDays && age <= b.maxDays;
    });
    if (bucket) bucket.amount += inv.amount;
  });

  buckets.forEach(b => {
    b.allowanceAmount = (b.amount * b.allowanceRate) / 100;
  });

  return buckets;
};

/**
 * Logika Sampling Audit
 */
export const generateConfirmationSample = (
  invoices: Invoice[], 
  customers: Customer[], 
  sampleSize: number
): ConfirmationRequest[] => {
  // Logic: Ambil Top 3 Terbesar + 2 Random
  const sorted = [...invoices].sort((a, b) => b.amount - a.amount);
  const topItems = sorted.slice(0, 3);
  const remaining = sorted.slice(3);
  const randomItems = remaining.sort(() => 0.5 - Math.random()).slice(0, Math.max(0, sampleSize - 3));
  
  const selected = [...topItems, ...randomItems];

  return selected.map(inv => {
    const cust = customers.find(c => c.id === inv.customerId);
    return {
      id: `CONF-${inv.id}`,
      invoiceId: inv.id,
      customerName: cust?.name || 'Tidak Diketahui',
      customerEmail: cust?.email || 'N/A',
      recordedAmount: inv.amount,
      status: 'Sent',
      difference: 0
    };
  });
};

/**
 * Logika Uji Pisah Batas (Cutoff Test)
 */
export const performCutoffTest = (invoices: Invoice[], auditDate: string): AuditFinding[] => {
  const findings: AuditFinding[] = [];
  const yearEnd = new Date(auditDate);
  
  // Window period: H-7 s.d H+7
  const windowStart = new Date(yearEnd); windowStart.setDate(yearEnd.getDate() - 7);
  const windowEnd = new Date(yearEnd); windowEnd.setDate(yearEnd.getDate() + 7);

  invoices.forEach(inv => {
    const recDate = new Date(inv.recordingDate);
    const shipDate = new Date(inv.shippingDate);
    
    // Cek apakah transaksi berada di sekitar tanggal neraca (Cutoff Window)
    const isInWindow = (recDate >= windowStart && recDate <= windowEnd) || (shipDate >= windowStart && shipDate <= windowEnd);

    if (isInWindow) {
        // 1. Premature Recognition (Catat Tahun Ini, Kirim Tahun Depan)
        if (recDate <= yearEnd && shipDate > yearEnd) {
            findings.push({
                id: `CUTOFF-PREM-${inv.id}`,
                type: 'Cutoff',
                severity: 'High',
                description: `Salah Saji Pisah Batas (Premature): Faktur #${inv.id} dicatat ${inv.recordingDate} (Tahun Ini), tetapi Surat Jalan (DO) #${inv.doNumber || 'N/A'} menunjukkan pengiriman pada ${inv.shippingDate} (Tahun Depan).`,
                amountDifference: inv.amount
            });
        }
        // 2. Unrecorded Revenue (Kirim Tahun Ini, Catat Tahun Depan)
        else if (shipDate <= yearEnd && recDate > yearEnd) {
             findings.push({
                id: `CUTOFF-UNREC-${inv.id}`,
                type: 'Cutoff',
                severity: 'High',
                description: `Salah Saji Pisah Batas (Unrecorded): Barang dengan DO #${inv.doNumber || 'N/A'} dikirim ${inv.shippingDate} (Tahun Ini), namun Faktur #${inv.id} baru dicatat pada ${inv.recordingDate} (Tahun Depan).`,
                amountDifference: inv.amount
            });
        }
    }
  });

  return findings;
};

// Helper for random number
const randomAmount = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * GENERATOR DATA REALISTIS (3-WAY MATCH SIMULATOR)
 */
export const generateRandomData = (auditYear: string): { invoices: Invoice[], customers: Customer[], glData: GeneralLedgerSummary } => {
    const customers: Customer[] = [
        { id: 'C-001', name: 'PT Sinar Jaya Abadi', region: 'Jawa Barat', address: 'Jl. Industri No. 45, Bekasi', email: 'finance@sinarjaya.co.id', riskProfile: 'Low' },
        { id: 'C-002', name: 'CV Maju Mundur', region: 'Jawa Timur', address: 'Kawasan Rungkut Industri Blok A', email: 'accounting@majumundur.com', riskProfile: 'Medium' },
        { id: 'C-003', name: 'Toko Bangunan Sejahtera', region: 'Sumatera', address: 'Jl. Medan Merdeka, Medan', email: 'owner@tokosejahtera.com', riskProfile: 'High' },
        { id: 'C-004', name: 'PT Teknindo Solusi', region: 'Jakarta', address: 'Gedung Cyber Lt 5, Jakarta Selatan', email: 'ap@teknindo.com', riskProfile: 'Low' },
        { id: 'C-005', name: 'UD Bali Makmur', region: 'Bali', address: 'Jl. Sunset Road, Denpasar', email: 'admin@balimakmur.net', riskProfile: 'Medium' },
        { id: 'C-006', name: 'PT Global Ekspor', region: 'Banten', address: 'Kawasan Pergudangan Bandara', email: 'exim@globalekspor.id', riskProfile: 'High' },
    ];

    const invoices: Invoice[] = [];
    const year = parseInt(auditYear);
    const shortYear = year.toString().slice(-2);
    const baseDate = new Date(`${year}-12-31`).getTime();
    
    // Items Dictionary for realism
    const items = ['Laptop Business Series', 'Server Rack 42U', 'Switch Catalyst 24 Port', 'Kabel Fiber Optic 1000m', 'Lisensi Software Enterprise', 'Jasa Konsultasi Implementasi', 'Sparepart Mesin Produksi'];
    
    // 1. Generate Base Population (60 - 90 Faktur Normal)
    const count = 60 + Math.floor(Math.random() * 30);
    
    for (let i = 0; i < count; i++) {
        const daysOffset = Math.floor(Math.random() * 120); // 0-4 bulan ke belakang
        const invoiceDate = new Date(baseDate - (daysOffset * 86400000));
        const dateStr = invoiceDate.toISOString().split('T')[0];
        const cust = customers[Math.floor(Math.random() * customers.length)];
        
        let amount = Math.floor(Math.random() * 45000) * 1000 + 2500000; 

        const suffix = (1000 + i).toString();
        const randPO = Math.floor(Math.random() * 900) + 100;
        
        invoices.push({
            id: `INV/${year}/${suffix}`,
            customerId: cust.id,
            amount: amount,
            invoiceDate: dateStr,
            dueDate: new Date(invoiceDate.getTime() + (30 * 86400000)).toISOString().split('T')[0],
            status: 'Open',
            shippingDate: dateStr,
            recordingDate: dateStr,
            // Data ini diasumsikan sudah di-merge dari file Warehouse & Sales
            soNumber: `SO-${year}-${suffix}`,
            doNumber: `DO-${year}-${suffix}`,
            poNumber: `PO-${cust.id.split('-')[1]}-${randPO}`,
            taxInvoiceNumber: `010.000-${shortYear}.${suffix}00`,
            description: `${items[Math.floor(Math.random() * items.length)]} - Qty ${Math.floor(Math.random() * 50) + 1}`,
            currency: 'IDR',
            term: 'Net 30'
        });
    }

    // 2. Inject Cutoff Data (PROBABILITAS 50:50)
    const hasCutoffRisk = Math.random() > 0.5;

    if (hasCutoffRisk) {
        invoices.push({
            id: `INV/${year}/9991`, customerId: customers[0].id, amount: 85500000,
            invoiceDate: `${year}-12-30`, dueDate: `${year+1}-01-30`, status: 'Open',
            recordingDate: `${year}-12-30`, shippingDate: `${year+1}-01-04`, 
            soNumber: `SO-${year}-9991`, doNumber: `DO-${year+1}-0004`, 
            poNumber: 'PO-EXT-001', taxInvoiceNumber: `010.000-${shortYear}.9991`,
            description: 'Pengiriman Akhir Tahun (Pending)', currency: 'IDR', term: 'Net 30'
        });
        invoices.push({
            id: `INV/${year}/9992`, customerId: customers[1].id, amount: 62000000,
            invoiceDate: `${year}-12-28`, dueDate: `${year+1}-01-28`, status: 'Open',
            recordingDate: `${year+1}-01-03`, shippingDate: `${year}-12-28`,
            soNumber: `SO-${year}-9992`, doNumber: `DO-${year}-9992`, 
            poNumber: 'PO-EXT-002', taxInvoiceNumber: `010.000-${shortYear}.9992`,
            description: 'Barang Terkirim Belum Tagih', currency: 'IDR', term: 'Net 30'
        });
    } else {
        invoices.push({
            id: `INV/${year}/9995`, customerId: customers[0].id, amount: 90000000,
            invoiceDate: `${year}-12-30`, dueDate: `${year+1}-01-30`, status: 'Open',
            recordingDate: `${year}-12-30`, shippingDate: `${year}-12-30`, 
            soNumber: `SO-${year}-9995`, doNumber: `DO-${year}-9995`,
            poNumber: 'PO-CLEAN-01', taxInvoiceNumber: `010.000-${shortYear}.9995`,
            description: 'Penjualan Rutin Q4', currency: 'IDR', term: 'Net 30'
        });
    }

    // --- LOGIKA REKONSILIASI (PROBABILITAS 50:50) ---
    const trueSubledgerTotal = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    let sabotagedGLBalance = trueSubledgerTotal;

    const hasTieInDiff = Math.random() > 0.5; 

    if (hasTieInDiff) {
        if (Math.random() > 0.6) {
            const idx = Math.floor(Math.random() * invoices.length);
            sabotagedGLBalance -= invoices[idx].amount; 
        }
        if (Math.random() > 0.6) {
            const idx = Math.floor(Math.random() * invoices.length);
            sabotagedGLBalance += invoices[idx].amount;
        }
        if (sabotagedGLBalance === trueSubledgerTotal) {
             sabotagedGLBalance += 10000000;
        }
    } 

    return {
        customers,
        invoices,
        glData: {
            accountCode: '1-1200',
            accountName: 'Piutang Usaha - Pihak Ketiga',
            balance: sabotagedGLBalance,
            asOfDate: `${year}-12-31`
        }
    };
};
