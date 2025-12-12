
import React, { useState, useEffect } from 'react';
import { useAuditContext } from '../App';
import { generateRandomData } from '../services/auditLogic';
import { UploadCloud, CheckCircle, AlertTriangle, Download, RefreshCw, Briefcase, DollarSign, Table, HelpCircle, Layers, ArrowRight, Link as LinkIcon, Microscope, Info, FileInput, FileUp } from 'lucide-react';
import { AuditFinding, Invoice, GeneralLedgerSummary } from '../types';
import * as XLSX from 'xlsx';

// Helper: Parsing Tanggal Excel yang sering bermasalah
const parseExcelDate = (input: any): string => {
    if (!input) return '';
    if (typeof input === 'number') {
        const date = new Date(Math.round((input - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof input === 'string') {
        const cleanInput = input.trim();
        // Cek format YYYY-MM-DD
        if (cleanInput.match(/^\d{4}-\d{2}-\d{2}$/)) return cleanInput;
        const d = new Date(cleanInput);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return '';
};

const DataIngestion: React.FC = () => {
  const { state, setState, logAction } = useAuditContext();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // State Penampung 3 File Sumber
  const [financeFile, setFinanceFile] = useState<any[] | null>(null);
  const [warehouseFile, setWarehouseFile] = useState<any[] | null>(null);
  const [salesFile, setSalesFile] = useState<any[] | null>(null);
  
  const [fileNames, setFileNames] = useState({ finance: '', warehouse: '', sales: '' });

  // State Rekonsiliasi (UI Persistence)
  const [reconItems, setReconItems] = useState<{desc: string, amount: number, ref: string, tag?: string}[]>([]);
  const [isReconComplete, setIsReconComplete] = useState(false);

  // Efek: Mengembalikan status rekonsiliasi jika user kembali ke halaman ini
  useEffect(() => {
    if (state.isDataLoaded && state.findings.length > 0) {
        setIsReconComplete(true);
        const items = state.findings
            .filter(f => f.type === 'Tie-in')
            .map(f => {
                let amount = 0;
                // Logic restorasi nilai positif/negatif berdasarkan deskripsi temuan
                if (f.description.includes('Ganda') || f.description.includes('Manual') || f.description.includes('Unsupported')) {
                    amount = -(f.amountDifference || 0); // Pengurangan GL
                } else {
                    amount = (f.amountDifference || 0); // Penambahan GL
                }
                
                return { desc: f.description.split(':')[0], amount: amount, ref: f.id };
            });
        setReconItems(items);
    }
  }, [state.isDataLoaded, state.findings]);

  // Form Input Parameter
  const [clientInput, setClientInput] = useState(state.clientName);
  const [yearInput, setYearInput] = useState(state.auditYear);
  const [glBalanceInput, setGlBalanceInput] = useState<string>(state.glData ? state.glData.balance.toString() : '');

  const canEdit = state.currentUser.role !== 'Viewer';
  
  // --- REVISI VALIDASI ---
  // Simulasi hanya butuh Nama & Tahun
  const isBasicParamsValid = clientInput.trim() !== '' && yearInput.trim() !== '';
  // Upload Manual butuh Nama, Tahun, & Saldo GL
  const isFullParamsValid = isBasicParamsValid && glBalanceInput.trim() !== '';

  // --- 1. FITUR SIMULASI DATA (GENERATOR) ---
  const handleGenerateDummy = () => {
    if (!canEdit) { alert("Akses Ditolak: Role Viewer."); return; }
    
    // Validasi khusus simulasi (GL Balance boleh kosong, nanti diisi otomatis oleh generator)
    if (!isBasicParamsValid) { alert("Mohon lengkapi Nama Klien & Tahun Buku untuk menjalankan simulasi."); return; }
    
    setLoading(true);
    setTimeout(() => {
        const { invoices, customers, glData } = generateRandomData(yearInput);
        
        // Auto-fill GL Balance Input jika sebelumnya kosong atau berbeda
        setGlBalanceInput(glData.balance.toString());
        
        logAction('DATA_GENERATED', `Menghasilkan dataset simulasi terintegrasi (Finance, Gudang, Sales).`, 'Data');

        setState(prev => ({
            ...prev,
            clientName: clientInput,
            auditYear: yearInput,
            auditDate: `${yearInput}-12-31`,
            invoices,
            customers,
            glData,
            findings: [],
            isDataLoaded: false // Reset status agar user harus menekan tombol Merge
        }));
        
        // Mocking file upload status visual
        setFileNames({ finance: 'Simulasi_Subledger.xlsx', warehouse: 'Simulasi_Gudang.xlsx', sales: 'Simulasi_Sales.xlsx' });
        setFinanceFile([]); 
        setWarehouseFile([]);
        setSalesFile([]);
        
        setReconItems([]); 
        setIsReconComplete(false);
        setLoading(false);
    }, 1200);
  };

  // --- 2. DOWNLOAD TEMPLATE EXCEL ---
  const handleDownloadTemplates = () => {
     const y = parseInt(yearInput) || new Date().getFullYear();

     const financeData = [{ "Invoice ID": "INV-1001", "Customer ID": "C-01", "Customer Name": "PT A", "Amount": 150000000, "Invoice Date": `${y}-11-01`, "Due Date": `${y}-12-01`, "Recording Date": `${y}-11-01` }];
     const ws1 = XLSX.utils.json_to_sheet(financeData);
     const wb1 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb1, ws1, "Subledger");
     XLSX.writeFile(wb1, `1_Finance_Subledger_${y}.xlsx`);

     const whData = [{ "Delivery Order No": "DO-23-001", "Invoice Reference": "INV-1001", "Shipping Date": `${y}-11-01`, "Courier": "Internal", "Status": "Delivered" }];
     const ws2 = XLSX.utils.json_to_sheet(whData);
     const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, ws2, "Shipping Log");
     XLSX.writeFile(wb2, `2_Warehouse_ShippingLog_${y}.xlsx`);

     const salesData = [{ "Sales Order No": "SO-23-001", "Invoice Reference": "INV-1001", "PO Number": "PO-CLIENT-99", "Tax Invoice No": "010.000.23", "Item Description": "Jasa Audit IT" }];
     const ws3 = XLSX.utils.json_to_sheet(salesData);
     const wb3 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb3, ws3, "Sales Register");
     XLSX.writeFile(wb3, `3_Sales_OrderBook_${y}.xlsx`);
  };

  // --- 3. UPLOAD HANDLER ---
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'finance' | 'warehouse' | 'sales') => {
      // Validasi ketat untuk upload manual
      if (!isFullParamsValid) { alert("Untuk Upload Manual, mohon lengkapi Nama Klien, Tahun, DAN Saldo GL (Trial Balance) sebagai kontrol."); e.target.value = ''; return; }
      
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          
          if (type === 'finance') { setFinanceFile(data); setFileNames(p => ({...p, finance: file.name})); }
          if (type === 'warehouse') { setWarehouseFile(data); setFileNames(p => ({...p, warehouse: file.name})); }
          if (type === 'sales') { setSalesFile(data); setFileNames(p => ({...p, sales: file.name})); }
      };
      reader.readAsBinaryString(file);
  };

  // --- 4. LOGIKA 3-WAY MATCHING (ETL CORE) - FIX STUCK ISSUE ---
  const processAndMergeData = () => {
      const isSimulasi = fileNames.finance.includes('Simulasi');

      if (!isSimulasi && !financeFile) { 
          alert("File Finance (Subledger) Wajib ada!"); 
          return; 
      }
      
      setLoading(true);
      // Reset recon state immediately to show progress
      setReconItems([]);
      setIsReconComplete(false);

      setTimeout(() => {
          try {
              let mergedInvoices: Invoice[] = [];
              let customers: any[] = [];
              let matchRate = 0;

              if (isSimulasi) {
                  // Jika simulasi, data sudah ada di state
                  mergedInvoices = state.invoices;
                  customers = state.customers;
                  matchRate = (mergedInvoices.filter(i => i.doNumber).length / mergedInvoices.length) * 100;
              } else if (financeFile) {
                  // Proses File Nyata
                  // Check if file is valid array
                  if (!Array.isArray(financeFile)) throw new Error("Format File Finance tidak valid.");

                  mergedInvoices = financeFile.map((row: any) => {
                      const invId = row['Invoice ID'] || `INV-${Math.random()}`;
                      // Gunakan optional chaining (?.) untuk menghindari crash jika file gudang/sales kosong/undefined
                      const whRow = Array.isArray(warehouseFile) ? warehouseFile.find((w: any) => w['Invoice Reference'] == invId) : undefined;
                      const salesRow = Array.isArray(salesFile) ? salesFile.find((s: any) => s['Invoice Reference'] == invId) : undefined;
                      
                      const parsedInvDate = parseExcelDate(row['Invoice Date']) || `${yearInput}-01-01`;

                      return {
                          id: invId,
                          customerId: row['Customer ID'] || 'C-Unknown',
                          amount: parseFloat(row['Amount']) || 0,
                          invoiceDate: parsedInvDate,
                          dueDate: parseExcelDate(row['Due Date']) || parsedInvDate,
                          recordingDate: parseExcelDate(row['Recording Date']) || parsedInvDate,
                          status: 'Open',
                          // Critical Fields for Audit:
                          doNumber: whRow ? whRow['Delivery Order No'] : undefined, // Bukti Fisik
                          shippingDate: whRow ? parseExcelDate(whRow['Shipping Date']) : parsedInvDate, // Cutoff Basis
                          soNumber: salesRow ? salesRow['Sales Order No'] : undefined, // Otorisasi
                          poNumber: salesRow ? salesRow['PO Number'] : undefined, // Eksistensi
                          taxInvoiceNumber: salesRow ? salesRow['Tax Invoice No'] : undefined,
                          description: salesRow ? salesRow['Item Description'] : 'Produk Umum',
                          currency: 'IDR'
                      };
                  });

                  // Generate Customers List from Finance File
                  const uniqueCustIds = Array.from(new Set(mergedInvoices.map(i => i.customerId)));
                  customers = uniqueCustIds.map(id => {
                      const row = financeFile.find((r: any) => r['Customer ID'] === id);
                      return { id, name: row['Customer Name'] || `Pelanggan ${id}`, email: 'client@mail.com', address: 'ID', region: 'ID', riskProfile: 'Medium' as const };
                  });
                  
                  matchRate = (Array.isArray(warehouseFile) && warehouseFile.length > 0) ? (mergedInvoices.filter(i => i.doNumber).length / mergedInvoices.length) * 100 : 0;
              }

              // Parse Saldo GL Manual
              const manualGLBalance = parseFloat(glBalanceInput.replace(/[^0-9.-]+/g,"")) || 0;
              const glData: GeneralLedgerSummary = {
                  accountCode: '1-1200', accountName: 'Piutang Usaha', balance: manualGLBalance, asOfDate: `${yearInput}-12-31`
              };

              logAction('DATA_MERGE', `3-Way Matching Selesai. Total Faktur: ${mergedInvoices.length}. Match Rate Dokumen Gudang: ${matchRate.toFixed(1)}%`, 'Data');

              setState(prev => ({
                  ...prev, clientName: clientInput, auditYear: yearInput, auditDate: `${yearInput}-12-31`,
                  invoices: mergedInvoices, glData, customers, findings: [], isDataLoaded: false // Tetap false sampai recon selesai
              }));

          } catch (error) {
              console.error("Error Processing Data:", error);
              alert("Terjadi kesalahan saat memproses data Excel. Pastikan format kolom sesuai Template. Error: " + (error as any).message);
          } finally {
              // Critical: Always stop loading spinner
              setLoading(false);
          }
      }, 1500);
  };

  // --- 5. SMART RECONCILIATION ENGINE (DETEKTIF AUDIT) ---
  const performDetailTieIn = () => {
    if (!state.glData || !canEdit) return;
    setAnalyzing(true);
    logAction('PROCEDURE_EXEC', 'Menjalankan Smart Reconciliation (Heuristik Audit).', 'Procedure');

    setTimeout(() => {
        const existingFindings = state.findings.filter(f => f.type !== 'Tie-in');
        const subledgerTotal = state.invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const glTotal = state.glData!.balance;
        
        // Variance = GL - Subledger
        let variance = glTotal - subledgerTotal;
        const isMaterial = Math.abs(variance) > 1000;
        
        let newFindings: AuditFinding[] = [];
        let items: {desc: string, amount: number, ref: string, tag?: string}[] = [];

        if (isMaterial) {
            // LOGIKA DETEKTIF:
            
            // KASUS A: GL > SUBLEDGER (Variance Positif)
            // Kemungkinan: Jurnal Manual (Top-side) atau Double Recording di GL
            if (variance > 0) {
                // Cek 1: Apakah selisihnya angka bulat? (Indikasi Jurnal Manual / Estimasi)
                if (variance % 1000000 === 0) {
                     newFindings.push({
                        id: 'REC-JE-MANUAL',
                        type: 'Tie-in',
                        severity: 'High',
                        description: `Jurnal Penyesuaian Manual (Top-side): Selisih Rp ${variance.toLocaleString()} berupa angka bulat. Indikasi manajemen mencatat jurnal tanpa rincian faktur pendukung (Unsupported).`,
                        amountDifference: variance
                    });
                    items.push({ desc: `Jurnal Manual Tanpa Support`, amount: -variance, ref: 'REC-JE-MANUAL', tag: 'High Risk' });
                    variance = 0; // Solved
                } else {
                    // Cek 2: Apakah ada invoice yang nominalnya SAMA PERSIS dengan selisih? (Double Recording)
                    const suspect = state.invoices.find(inv => Math.abs(inv.amount - variance) < 100);
                    if (suspect) {
                        newFindings.push({
                            id: `REC-DBL-${suspect.id}`,
                            type: 'Tie-in',
                            severity: 'High',
                            description: `Pencatatan Ganda (Double Recording): Faktur #${suspect.id} senilai Rp ${suspect.amount.toLocaleString()} tercatat 2x di GL, namun hanya 1x di Subledger.`,
                            amountDifference: suspect.amount
                        });
                        items.push({ desc: `Koreksi Double Recording #${suspect.id}`, amount: -suspect.amount, ref: `REC-DBL-${suspect.id}`, tag: 'Error' });
                        variance -= suspect.amount;
                    }
                }
            }
            
            // KASUS B: SUBLEDGER > GL (Variance Negatif)
            // Kemungkinan: Faktur Belum Posting (Unposted) atau Faktur Fiktif di Excel
            else if (variance < 0) {
                let remainingVar = Math.abs(variance);
                
                // Cek 1: Faktur Tanpa DO (3-Way Match Failed) -> Indikasi Fiktif / Salah Catat di Excel
                const invalidInvoices = state.invoices.filter(inv => !inv.doNumber);
                
                invalidInvoices.forEach(inv => {
                    if (remainingVar > 0 && Math.abs(remainingVar - inv.amount) < 100) {
                        newFindings.push({
                            id: `REC-INVALID-${inv.id}`,
                            type: 'Tie-in',
                            severity: 'Medium',
                            description: `Faktur Tanpa Bukti Kirim: Faktur #${inv.id} ada di Subledger tetapi tidak memiliki Nomor DO. GL benar tidak mencatatnya.`,
                            amountDifference: inv.amount
                        });
                        items.push({ desc: `Koreksi Faktur Tanpa DO #${inv.id}`, amount: -inv.amount, ref: `REC-INVALID-${inv.id}`, tag: '3-Way Fail' });
                        remainingVar -= inv.amount;
                    }
                });

                // Cek 2: Unposted Invoices (Valid ada DO, tapi GL belum catat)
                if (remainingVar > 0) {
                    const unpostedSuspect = state.invoices.find(inv => Math.abs(inv.amount - remainingVar) < 100);
                    if (unpostedSuspect) {
                         newFindings.push({
                            id: `REC-UNREC-${unpostedSuspect.id}`,
                            type: 'Tie-in',
                            severity: 'High',
                            description: `Belum Posting (Unposted): Faktur #${unpostedSuspect.id} valid (ada DO) tapi belum masuk saldo GL.`,
                            amountDifference: unpostedSuspect.amount
                        });
                        items.push({ desc: `Usulan Posting Faktur #${unpostedSuspect.id}`, amount: unpostedSuspect.amount, ref: `REC-UNREC-${unpostedSuspect.id}`, tag: 'Cutoff' });
                        remainingVar -= unpostedSuspect.amount;
                    }
                }
            }

            // Fallback: Jika masih ada sisa yang tidak teridentifikasi polanya
            if (Math.abs(variance) > 1000) {
                 newFindings.push({ id: 'REC-UNKNOWN', type: 'Tie-in', severity: 'High', description: `Selisih Tidak Terjelaskan (Unreconciled Difference).`, amountDifference: variance });
                 items.push({ desc: `Selisih Tidak Terjelaskan`, amount: -variance, ref: 'REC-UNKNOWN', tag: 'Unknown' });
            }
        }

        setReconItems(items);
        setIsReconComplete(true);
        // Tandai data sudah valid & loaded hanya setelah rekonsiliasi selesai
        setState(prev => ({ ...prev, isDataLoaded: true, findings: [...existingFindings, ...newFindings] }));
        setAnalyzing(false);
    }, 2000); 
  };

  // Kalkulasi Tampilan Tabel
  const subledgerTotal = state.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const glTotal = state.glData ? state.glData.balance : 0;
  const initialVariance = glTotal - subledgerTotal;
  const adjustedGL = glTotal + reconItems.reduce((acc, item) => acc + item.amount, 0);

  // Status Kesiapan
  const isReadyToMerge = (financeFile && (warehouseFile || salesFile)) || fileNames.finance.includes('Simulasi'); 

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Modul II: Integrasi & Validasi Data (ETL)</h2>
            <p className="text-slate-500">Impor data sumber, validasi 3-Way Matching, dan Rekonsiliasi Saldo Awal.</p>
        </div>
        <button onClick={() => setShowGuide(!showGuide)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg transition">
            <HelpCircle size={18} /> {showGuide ? 'Tutup Panduan' : 'Panduan Struktur Data'}
        </button>
      </div>

      {/* Info Box: Instruksi Audit Baru */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="text-blue-600 flex-shrink-0" size={24} />
          <div>
              <h4 className="font-bold text-blue-900 text-sm">Ingin Memulai Audit Baru / Reset Data?</h4>
              <p className="text-xs text-blue-700 mt-1">
                  Anda tidak perlu tombol reset. Cukup ubah parameter di bawah dan lakukan <strong>Upload File Baru</strong> atau jalankan <strong>Simulasi</strong> kembali. Sistem akan secara otomatis menimpa data lama dengan data audit yang baru.
              </p>
          </div>
      </div>

      {/* Panduan Struktur Data (Collapsible) */}
      {showGuide && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Layers size={20} /> Spesifikasi Kolom Data (Wajib Ada)</h3>
              <p className="text-sm text-slate-600 mb-4">Pastikan nama kolom (Header) di file Excel Anda sesuai spesifikasi berikut agar sistem dapat melakukan "Join" antar tabel:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Finance */}
                  <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                      <strong className="text-indigo-600 block mb-2 text-sm font-sans flex items-center gap-1"><DollarSign size={14}/> 1. Subledger Piutang</strong>
                      <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          <li>Invoice ID <span className="text-red-500 font-bold">*Key</span></li>
                          <li>Customer ID</li>
                          <li>Customer Name</li>
                          <li>Amount</li>
                          <li>Invoice Date</li>
                          <li>Recording Date</li>
                      </ul>
                      <p className="mt-2 text-[10px] text-slate-400 italic">"Recording Date" digunakan untuk membandingkan pencatatan buku besar.</p>
                  </div>
                  
                   {/* Gudang */}
                   <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                      <strong className="text-orange-600 block mb-2 text-sm font-sans flex items-center gap-1"><Briefcase size={14}/> 2. Log Pengiriman (Gudang)</strong>
                      <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          <li>Invoice Reference <span className="text-red-500 font-bold">*Key</span></li>
                          <li>Delivery Order No</li>
                          <li>Shipping Date</li>
                          <li>Courier</li>
                          <li>Status</li>
                      </ul>
                      <p className="mt-2 text-[10px] text-slate-400 italic">"Shipping Date" adalah acuan utama untuk Uji Cutoff (Pisah Batas).</p>
                  </div>

                  {/* Sales */}
                  <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                      <strong className="text-green-600 block mb-2 text-sm font-sans flex items-center gap-1"><LinkIcon size={14}/> 3. Register Penjualan</strong>
                      <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          <li>Invoice Reference <span className="text-red-500 font-bold">*Key</span></li>
                          <li>Sales Order No</li>
                          <li>PO Number</li>
                          <li>Item Description</li>
                      </ul>
                      <p className="mt-2 text-[10px] text-slate-400 italic">"PO Number" memvalidasi otorisasi pesanan dari pelanggan (Eksistensi).</p>
                  </div>
              </div>
          </div>
      )}

      {/* Panel Parameter Audit */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-800"><Briefcase size={20} className="text-indigo-600"/> Parameter Penugasan Audit</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Entitas Klien <span className="text-red-500">*</span></label>
                <input type="text" value={clientInput} onChange={(e) => setClientInput(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="PT Contoh Tbk" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Buku <span className="text-red-500">*</span></label>
                <input type="number" value={yearInput} onChange={(e) => setYearInput(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="2024" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Saldo GL (Trial Balance)</label>
                <input 
                    type="number" 
                    value={glBalanceInput} 
                    onChange={(e) => setGlBalanceInput(e.target.value)} 
                    className={`w-full px-4 py-2 border rounded-lg font-mono outline-none transition ${!glBalanceInput && isBasicParamsValid ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-500' : 'border-slate-300 bg-slate-50 focus:ring-indigo-500'}`} 
                    placeholder={isBasicParamsValid ? "(Opsional untuk Simulasi)" : "0"} 
                />
                {!glBalanceInput && isBasicParamsValid && (
                    <p className="text-[10px] text-yellow-700 mt-1 italic">*Wajib diisi jika Upload Manual. Jika Simulasi, akan diisi otomatis.</p>
                )}
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL KIRI: UPLOAD DATA */}
        <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800"><UploadCloud size={20}/> Dokumen Sumber</h3>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadTemplates} className="text-xs flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-200 transition">
                            <Download size={14}/> Template
                        </button>
                        <button 
                            onClick={handleGenerateDummy} 
                            disabled={loading || !isBasicParamsValid} 
                            className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded transition border font-medium ${isBasicParamsValid ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                        >
                            <RefreshCw size={14}/> Mode Simulasi
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* ZONE 1: FINANCE */}
                    <div className={`relative border-2 border-dashed rounded-lg p-4 flex items-center gap-4 transition group ${financeFile ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                        <div className={`p-3 rounded-full ${financeFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                            <DollarSign size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-slate-800">1. Subledger Piutang (Finance) <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500">{fileNames.finance || "Format: Inv ID, Date, Amount, Customer"}</p>
                        </div>
                        {/* VISUAL BUTTON - Clicked by proxy via the input */}
                        <div className="z-10 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 group-hover:border-indigo-300 group-hover:text-indigo-600 transition">
                             {financeFile ? <RefreshCw size={14}/> : <FileUp size={14}/>}
                             {financeFile ? 'Ganti' : 'Pilih File'}
                        </div>
                        {/* INPUT COVERING EVERYTHING */}
                        <input type="file" accept=".xlsx" onChange={(e) => handleUpload(e, 'finance')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    </div>

                    {/* ZONE 2: WAREHOUSE */}
                    <div className={`relative border-2 border-dashed rounded-lg p-4 flex items-center gap-4 transition group ${warehouseFile ? 'border-orange-400 bg-orange-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                        <div className={`p-3 rounded-full ${warehouseFile ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                            <Briefcase size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-slate-800">2. Log Pengiriman (Gudang) <span className="text-red-500">*</span></h4>
                            <p className="text-xs text-slate-500">{fileNames.warehouse || "Format: DO No, Inv Ref, Ship Date"}</p>
                        </div>
                        {/* VISUAL BUTTON */}
                        <div className="z-10 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 group-hover:border-indigo-300 group-hover:text-indigo-600 transition">
                             {warehouseFile ? <RefreshCw size={14}/> : <FileUp size={14}/>}
                             {warehouseFile ? 'Ganti' : 'Pilih File'}
                        </div>
                        <input type="file" accept=".xlsx" onChange={(e) => handleUpload(e, 'warehouse')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    </div>

                    {/* ZONE 3: SALES */}
                    <div className={`relative border-2 border-dashed rounded-lg p-4 flex items-center gap-4 transition group ${salesFile ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                        <div className={`p-3 rounded-full ${salesFile ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                            <LinkIcon size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-slate-800">3. Register Penjualan (Sales)</h4>
                            <p className="text-xs text-slate-500">{fileNames.sales || "Format: SO No, PO No, Inv Ref"}</p>
                        </div>
                        {/* VISUAL BUTTON */}
                        <div className="z-10 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 group-hover:border-indigo-300 group-hover:text-indigo-600 transition">
                             {salesFile ? <RefreshCw size={14}/> : <FileUp size={14}/>}
                             {salesFile ? 'Ganti' : 'Pilih File'}
                        </div>
                        <input type="file" accept=".xlsx" onChange={(e) => handleUpload(e, 'sales')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    </div>
                </div>

                <button 
                    onClick={processAndMergeData}
                    disabled={!isReadyToMerge || loading}
                    className={`w-full mt-6 py-3 rounded-lg font-bold shadow-sm flex justify-center items-center gap-2 transition ${isReadyToMerge ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                    {loading ? "Memproses Data..." : <>Lakukan 3-Way Matching & Injeksi Data <ArrowRight size={18}/></>}
                </button>
            </div>
        </div>

        {/* PANEL KANAN: REKONSILIASI & DETAIL TIE-IN */}
        <div className={`lg:col-span-5 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col transition-opacity duration-500 ${!state.invoices.length ? 'opacity-60 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
           <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Table size={24} /></div>
              <h3 className="text-lg font-semibold text-slate-800">Berita Acara Rekonsiliasi</h3>
           </div>

           <div className="flex-1 flex flex-col">
                <div className="border border-slate-300 rounded-lg overflow-hidden text-sm flex-1 mb-6 shadow-sm">
                    <div className="bg-slate-100 p-3 font-bold text-center border-b border-slate-300 text-slate-700 tracking-wide">
                        ANALISIS DETAIL TIE-IN
                    </div>
                    {/* Baris Saldo GL */}
                    <div className="flex justify-between p-3 bg-white border-b border-slate-200">
                        <span className="text-slate-600 font-medium">Saldo Per Buku (GL/TB)</span>
                        <span className="font-mono font-bold text-slate-800">Rp {glTotal.toLocaleString('id-ID')}</span>
                    </div>

                    {/* Item Rekonsiliasi Dinamis */}
                    {reconItems.length > 0 && (
                        <div className="bg-yellow-50/50">
                            {reconItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between px-4 py-2 text-xs border-b border-yellow-100 last:border-0 hover:bg-yellow-50">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.amount < 0 ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                        <span className="text-slate-700 italic">{item.desc}</span>
                                        {item.tag && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-200">{item.tag}</span>}
                                    </div>
                                    <span className={`font-mono ${item.amount < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                        {item.amount < 0 ? '(' : ''}{Math.abs(item.amount).toLocaleString('id-ID')}{item.amount < 0 ? ')' : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Baris Total Adjusted GL */}
                    <div className="flex justify-between p-3 bg-slate-50 border-t border-b border-slate-300">
                        <span className="font-bold text-indigo-900">Adjusted GL (Target)</span>
                        <span className="font-mono font-bold text-indigo-700">Rp {adjustedGL.toLocaleString('id-ID')}</span>
                    </div>

                    {/* Baris Saldo Subledger */}
                    <div className="flex justify-between p-3 bg-white">
                        <span className="text-slate-600 font-medium">Saldo Subledger (Rincian)</span>
                        <span className="font-mono font-bold text-slate-800">Rp {subledgerTotal.toLocaleString('id-ID')}</span>
                    </div>
                </div>

                {!isReconComplete ? (
                     <button onClick={performDetailTieIn} disabled={analyzing} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center gap-2 transition shadow-lg shadow-indigo-100">
                        {analyzing ? <RefreshCw className="animate-spin" size={18}/> : <Microscope size={18}/>} 
                        {analyzing ? "Menganalisis Selisih..." : "Jalankan Detektif Selisih (Smart Recon)"}
                     </button>
                ) : (
                    <div className={`p-4 rounded-lg flex items-center gap-4 border ${initialVariance === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        {initialVariance === 0 ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
                        <div>
                            <p className="font-bold text-sm">{initialVariance === 0 ? "Saldo Cocok (Matched)" : "Terdapat Selisih Tidak Wajar"}</p>
                            {initialVariance !== 0 && <p className="text-xs mt-1">Sistem telah mengidentifikasi penyebab selisih di atas.</p>}
                        </div>
                    </div>
                )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DataIngestion;
