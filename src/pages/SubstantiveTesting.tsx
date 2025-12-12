
import React, { useState } from 'react';
import { useAuditContext } from '../App';
import { calculateAging, generateConfirmationSample, performCutoffTest } from '../services/auditLogic';
import { AgingBucket, ConfirmationRequest } from '../types';
import { Mail, Clock, CalendarDays, AlertTriangle, RefreshCw, Calculator, HelpCircle, CheckCircle } from 'lucide-react';

const SubstantiveTesting: React.FC = () => {
  const { state, setState, logAction } = useAuditContext();
  const [activeTab, setActiveTab] = useState<'aging' | 'confirmations' | 'cutoff'>('aging');
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [confirmations, setConfirmations] = useState<ConfirmationRequest[]>([]);
  const [hasRunCutoff, setHasRunCutoff] = useState(false);

  // RBAC Permission
  const canEdit = state.currentUser.role !== 'Viewer';
  const canJudge = state.currentUser.role === 'Senior Auditor' || state.currentUser.role === 'Partner';

  // Initial Calculation on Load
  React.useEffect(() => {
    if (state.invoices.length > 0 && agingData.length === 0) {
        setAgingData(calculateAging(state.invoices, state.auditDate));
    }
  }, [state.invoices, state.auditDate]);

  // Handler for Interactive Aging
  const handleRateChange = (index: number, newRate: string) => {
      if (!canJudge) {
          alert("Hanya Senior Auditor atau Partner yang dapat mengubah estimasi CKP.");
          return;
      }
      const rate = parseFloat(newRate) || 0;
      const newAging = [...agingData];
      newAging[index].allowanceRate = rate;
      newAging[index].allowanceAmount = (newAging[index].amount * rate) / 100;
      setAgingData(newAging);
      
      // Log debounce logic could be added here, but for now simple logging
      // To avoid spamming log, usually we log onBlur, but for prototype we just won't spam log here, 
      // maybe we log only if rate is final. For now let's just log.
  };

  const handleRateBlur = (label: string, rate: number) => {
      if(canJudge) logAction('VALUATION_CHANGE', `Mengubah estimasi CKP kategori ${label} menjadi ${rate}%`, 'Procedure');
  }

  const runConfirmationSampling = () => {
      if (!canEdit) return;
      // Create samples based on actual data
      const samples = generateConfirmationSample(state.invoices, state.customers, 5); 
      setConfirmations(samples);
      logAction('PROCEDURE_EXEC', 'Menjalankan Sampling Konfirmasi (Monetary Unit Sampling).', 'Procedure');
  };

  const runCutoffTest = () => {
      if (!canEdit) return;
      // Perform logic on actual data
      const findings = performCutoffTest(state.invoices, state.auditDate);
      
      // Update global state with new findings
      setState(prev => ({
          ...prev,
          findings: [...prev.findings.filter(f => f.type !== 'Cutoff'), ...findings]
      }));
      setHasRunCutoff(true);
      logAction('PROCEDURE_EXEC', `Menjalankan Uji Pisah Batas. Ditemukan ${findings.length} deviasi.`, 'Procedure');
  };

  // Helper to format date ranges for Cutoff
  const getCutoffRange = () => {
      const date = new Date(state.auditDate);
      const start = new Date(date); start.setDate(date.getDate() - 7);
      const end = new Date(date); end.setDate(date.getDate() + 7);
      return `${start.toLocaleDateString('id-ID')} s/d ${end.toLocaleDateString('id-ID')}`;
  };

  // Helper to determine the specific date range for an aging bucket
  const getBucketDateRange = (minDays: number, maxDays: number | null) => {
      const auditDate = new Date(state.auditDate);
      
      // Calculate End Date of the bucket (Audit Date - Min Days)
      const bucketEndDate = new Date(auditDate);
      bucketEndDate.setDate(auditDate.getDate() - (minDays < 0 ? 0 : minDays)); // Handle 'not due' logic slightly differently if needed

      // Calculate Start Date of the bucket (Audit Date - Max Days)
      // If maxDays is null (infinity), just say "Before X"
      if (maxDays === null) {
          const limitDate = new Date(auditDate);
          limitDate.setDate(auditDate.getDate() - 91);
          return `< ${limitDate.toLocaleDateString('id-ID')}`;
      }

      // Special case for "Not Due" (negative days)
      if (minDays < 0) {
          return `> ${auditDate.toLocaleDateString('id-ID')}`;
      }

      const bucketStartDate = new Date(auditDate);
      bucketStartDate.setDate(auditDate.getDate() - maxDays);
      
      return `${bucketStartDate.toLocaleDateString('id-ID')} s/d ${bucketEndDate.toLocaleDateString('id-ID')}`;
  };

  if (!state.isDataLoaded) {
      return (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-xl shadow-sm border border-slate-200">
              <AlertTriangle size={48} className="mb-4 text-yellow-500" />
              <h2 className="text-xl font-semibold text-slate-700">Data Dibutuhkan</h2>
              <p>Silakan selesaikan fase Injeksi Data (ETL) terlebih dahulu.</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Modul III: Pengujian Substantif</h2>
        <p className="text-slate-500">Eksekusi pengujian rinci saldo (Eksistensi, Valuasi, Pisah Batas) berbasis data riil.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('aging')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'aging' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Clock size={16} /> Analisis Umur (Aging)
        </button>
        <button
          onClick={() => setActiveTab('confirmations')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'confirmations' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Mail size={16} /> Konfirmasi Piutang
        </button>
        <button
          onClick={() => setActiveTab('cutoff')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'cutoff' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CalendarDays size={16} /> Uji Pisah Batas (Cutoff)
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[500px]">
        
        {/* AGING MODULE */}
        {activeTab === 'aging' && (
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Rekalkulasi Umur & Estimasi CKP</h3>
                        <p className="text-sm text-slate-500 mt-1">
                             Tanggal Neraca (Cutoff): <span className="font-mono font-bold text-slate-700">{state.auditDate}</span>
                        </p>
                    </div>
                    
                    {/* Methodology Explanation Box */}
                    <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg max-w-lg">
                        <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs mb-2">
                             <Calculator size={14} /> METODOLOGI PERHITUNGAN
                        </div>
                        <div className="text-[10px] text-indigo-900 space-y-1">
                            <p>1. <strong>Umur Piutang</strong> = Tanggal Neraca ({state.auditDate}) - Tanggal Faktur.</p>
                            <p>2. <strong>Cadangan Kerugian</strong> = Saldo Kategori x % Estimasi User.</p>
                            <p>3. <strong>NRV</strong> = Total Piutang - Total Cadangan Kerugian.</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                            <tr>
                                <th className="p-3 w-1/4">Kategori Umur</th>
                                <th className="p-3 text-right">Saldo (Rp)</th>
                                <th className="p-3 text-right w-32">
                                    Est. CKP (%)
                                    <HelpCircle size={12} className="inline ml-1 text-slate-400" />
                                </th>
                                <th className="p-3 text-right">Cadangan (Rp)</th>
                                <th className="p-3 text-right">Nilai Bersih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agingData.map((bucket, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-700">{bucket.label}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                            <CalendarDays size={10} />
                                            {/* Show dynamic date range based on audit date */}
                                            {getBucketDateRange(bucket.minDays, bucket.maxDays)}
                                        </div>
                                    </td>
                                    <td className="p-3 text-right font-mono text-slate-700">{bucket.amount.toLocaleString('id-ID')}</td>
                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <input 
                                                type="number" 
                                                className={`w-16 border rounded p-1 text-right text-xs focus:ring-2 outline-none ${canJudge ? 'border-slate-300 focus:ring-blue-500' : 'bg-slate-100 border-transparent cursor-not-allowed'}`}
                                                value={bucket.allowanceRate}
                                                onChange={(e) => handleRateChange(idx, e.target.value)}
                                                onBlur={(e) => handleRateBlur(bucket.label, parseFloat(e.target.value))}
                                                disabled={!canJudge}
                                            /> 
                                            <span className="text-slate-500">%</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right text-red-600 font-medium font-mono bg-red-50/30">
                                        {bucket.allowanceAmount.toLocaleString('id-ID')}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-700 font-mono">
                                        {(bucket.amount - bucket.allowanceAmount).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <td className="p-3">TOTAL KESELURUHAN</td>
                                <td className="p-3 text-right">{agingData.reduce((acc, b) => acc + b.amount, 0).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-center text-xs text-slate-400 font-normal">-- Weighted Avg --</td>
                                <td className="p-3 text-right text-red-700">{agingData.reduce((acc, b) => acc + b.allowanceAmount, 0).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-right text-slate-900">
                                    {(agingData.reduce((acc, b) => acc + b.amount, 0) - agingData.reduce((acc, b) => acc + b.allowanceAmount, 0)).toLocaleString('id-ID')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* CONFIRMATION MODULE */}
        {activeTab === 'confirmations' && (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Manajemen Konfirmasi Digital</h3>
                     <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Asersi: Keberadaan (Existence)</div>
                </div>

                {confirmations.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <Mail size={40} className="mx-auto text-slate-300 mb-2" />
                        <h4 className="text-slate-700 font-medium">Sampel Belum Dipilih</h4>
                        <p className="text-slate-500 mb-4 text-sm">Sistem akan memilih saldo material secara otomatis dari data {state.invoices.length} faktur.</p>
                        <button 
                            onClick={runConfirmationSampling}
                            disabled={!canEdit}
                            className={`px-4 py-2 rounded transition shadow flex items-center gap-2 mx-auto ${canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-400 text-slate-200 cursor-not-allowed'}`}
                        >
                            <RefreshCw size={16} />
                            Generate Sampel (Metode Monetary Unit Sampling)
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-lg border border-slate-200 mb-6">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">ID Surat</th>
                                        <th className="p-3">Pelanggan Target</th>
                                        <th className="p-3 text-right">Nilai Tercatat (Buku)</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {confirmations.map((conf) => (
                                        <tr key={conf.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono text-xs text-slate-500">{conf.id}</td>
                                            <td className="p-3 font-medium text-slate-800">
                                                {conf.customerName}
                                                <div className="text-xs text-slate-400 font-normal">{conf.customerEmail}</div>
                                            </td>
                                            <td className="p-3 text-right font-mono">Rp {conf.recordedAmount.toLocaleString('id-ID')}</td>
                                            <td className="p-3 text-center">
                                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-200">
                                                    {conf.status}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <button disabled={!canEdit} className="text-blue-600 hover:text-blue-800 text-xs font-semibold disabled:text-slate-400">Update Balasan</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => setConfirmations([])} disabled={!canEdit} className="text-sm text-slate-500 hover:text-red-500 disabled:text-slate-300">Reset Sampel</button>
                        </div>
                    </>
                )}
            </div>
        )}

        {/* CUTOFF MODULE */}
        {activeTab === 'cutoff' && (
             <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Uji Pisah Batas Penjualan (Sales Cutoff)</h3>
                     <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Asersi: Kelengkapan & Pisah Batas</div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                    <div className="flex gap-3">
                        <CalendarDays className="text-blue-600 flex-shrink-0" size={24} />
                        <div>
                            <h4 className="font-semibold text-blue-900 text-sm">Metodologi Pengujian Otomatis</h4>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                Sistem memeriksa seluruh populasi data untuk mendeteksi pergeseran pendapatan (Premature/Unrecorded) dengan membandingkan Tanggal Catat vs Tanggal Kirim.
                            </p>
                            <div className="mt-2 text-xs font-mono bg-blue-100 text-blue-800 p-2 rounded w-fit">
                                Periode Uji: <strong>{getCutoffRange()}</strong> (H-7 s/d H+7 Tanggal Neraca)
                            </div>
                            <button 
                                onClick={runCutoffTest}
                                disabled={!canEdit}
                                className={`mt-3 px-4 py-2 rounded text-sm shadow-sm font-medium transition ${canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-400 text-slate-200 cursor-not-allowed'}`}
                            >
                                Jalankan Analisis Cutoff
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {state.findings.filter(f => f.type === 'Cutoff').length === 0 ? (
                        hasRunCutoff ? (
                             <div className="text-center py-8 bg-green-50 rounded border border-green-200 flex flex-col items-center">
                                <CheckCircle size={32} className="text-green-500 mb-2" />
                                <h4 className="text-green-800 font-bold text-sm">Hasil Pengujian: Memuaskan (Clean)</h4>
                                <p className="text-green-700 text-xs mt-1">Tidak ditemukan transaksi yang melanggar batas periode (Cutoff) dalam sampel yang diuji.</p>
                             </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 italic text-sm bg-slate-50 rounded border border-dashed border-slate-200">
                                Klik tombol di atas untuk menjalankan analisis pada data yang diimpor.
                            </div>
                        )
                    ) : (
                        state.findings.filter(f => f.type === 'Cutoff').map((f) => (
                            <div key={f.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h5 className="font-bold text-red-900 text-sm">{f.id}</h5>
                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200">RISIKO TINGGI</span>
                                        </div>
                                        <p className="text-sm text-slate-700 mt-2">{f.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Nilai Dampak</p>
                                        <p className="font-bold text-red-700 font-mono">Rp {f.amountDifference?.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default SubstantiveTesting;
