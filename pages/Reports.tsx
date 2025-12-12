import React, { useMemo } from 'react';
import { useAuditContext } from '../App';
import { 
  AlertTriangle, AlertOctagon, Info, ShieldCheck, 
  FileQuestion, CheckCircle2, GripHorizontal, 
  Layout, Bookmark, User, Calendar
} from 'lucide-react';

const Reports: React.FC = () => {
  const { state } = useAuditContext();

  const getSeverityClass = (severity: string) => {
      switch(severity) {
          case 'High': return 'bg-red-50 text-red-900 border-red-200';
          case 'Medium': return 'bg-orange-50 text-orange-900 border-orange-200';
          default: return 'bg-blue-50 text-blue-900 border-blue-200';
      }
  };

  // --- LOGIKA LEAD SCHEDULE (KKP UTAMA) ---
  const leadScheduleData = useMemo(() => {
      if (!state.glData) return null;

      // 1. Balance Per Book (Unaudited)
      const balancePerBook = state.glData.balance;

      // 2. Audit Adjustments
      let adjustments = 0;
      const adjustmentItems: { ref: string, desc: string, amount: number, severity: string, type: string }[] = [];

      state.findings.forEach(f => {
          let adjAmount = 0;
          if (f.id.includes('REC-DBL')) adjAmount = -(f.amountDifference || 0);
          else if (f.id.includes('REC-UNREC')) adjAmount = (f.amountDifference || 0);
          else if (f.id.includes('REC-JE')) adjAmount = -(f.amountDifference || 0);
          else if (f.id.includes('CUTOFF-PREM')) adjAmount = -(f.amountDifference || 0);
          else if (f.id.includes('CUTOFF-UNREC')) adjAmount = (f.amountDifference || 0);
          else if (f.id.includes('REC-UNKNOWN')) {
              adjAmount = -(f.amountDifference || 0);
          }
          
          if (adjAmount !== 0) {
              adjustments += adjAmount;
              adjustmentItems.push({ 
                  ref: f.id, 
                  desc: f.id.includes('REC-UNKNOWN') ? `Penyesuaian Selisih Tidak Terjelaskan` : f.description, 
                  amount: adjAmount,
                  severity: f.severity,
                  type: f.type
              });
          }
      });

      // 3. Balance Per Audit (Audited)
      const balancePerAudit = balancePerBook + adjustments;

      return { balancePerBook, adjustments, balancePerAudit, adjustmentItems };
  }, [state.glData, state.findings]);

  const fmtMoney = (n: number) => n.toLocaleString('id-ID');

  // --- RENDER KESIMPULAN AUDIT ---
  const renderAuditConclusion = () => {
      if (!leadScheduleData) return null;

      const { balancePerBook, adjustments } = leadScheduleData;
      const hasMaterialAdjustment = Math.abs(adjustments) > 1000;

      if (!hasMaterialAdjustment) {
          return (
              <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-200 mt-4 flex gap-4">
                  <ShieldCheck size={40} className="text-emerald-700 flex-shrink-0" />
                  <div>
                      <h4 className="font-bold text-emerald-900 text-lg">Opini Auditor: Wajar Tanpa Pengecualian (Unqualified)</h4>
                      <p className="text-emerald-800 text-sm mt-1 leading-relaxed text-justify">
                          Berdasarkan prosedur audit yang telah dilaksanakan, saldo Piutang Usaha per tanggal {state.auditDate} sebesar <strong>Rp {fmtMoney(balancePerBook)}</strong> disajikan secara wajar dalam semua hal yang material.
                      </p>
                  </div>
              </div>
          );
      } else {
          return (
              <div className="bg-amber-50 p-5 rounded-lg border border-amber-200 mt-4 flex gap-4">
                  <AlertTriangle size={40} className="text-amber-700 flex-shrink-0" />
                  <div>
                      <h4 className="font-bold text-amber-900 text-lg">Opini Auditor: Wajar Dengan Pengecualian (Qualified)</h4>
                      <p className="text-amber-800 text-sm mt-1 leading-relaxed text-justify">
                          Saldo per buku mengandung salah saji material sebesar <strong>Rp {fmtMoney(Math.abs(adjustments))}</strong>. 
                          Kewajaran penyajian hanya dapat dicapai apabila usulan jurnal penyesuaian (PAJE) di atas dibukukan oleh manajemen.
                      </p>
                  </div>
              </div>
          );
      }
  };

  if (!state.isDataLoaded || !state.glData) {
      return (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
             <Layout className="h-16 w-16 text-slate-300 mb-4" />
             <h3 className="text-xl font-bold text-slate-700">Kertas Kerja Belum Tersedia</h3>
             <p className="text-slate-500 mt-2">Selesaikan tahapan Injeksi Data & Pengujian Substantif terlebih dahulu.</p>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans text-slate-900">
      
      {/* 1. HEADER KERTAS KERJA (Official WP Header) */}
      <div className="bg-white border-2 border-slate-800 p-0 shadow-sm">
          {/* Top Row: Info Klien */}
          <div className="flex border-b-2 border-slate-800">
              <div className="w-2/3 p-4 border-r border-slate-300">
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Nama Klien (Entitas)</label>
                  <div className="text-xl font-bold text-slate-900">{state.clientName || 'CLIENT NAME'}</div>
              </div>
              <div className="w-1/3 p-4 bg-slate-50">
                   <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Periode Audit</label>
                   <div className="text-lg font-mono font-bold text-slate-900">{state.auditYear}</div>
              </div>
          </div>
          
          {/* Middle Row: Judul WP */}
          <div className="flex border-b-2 border-slate-800">
               <div className="w-2/3 p-4 border-r border-slate-300">
                    <div className="flex items-center gap-2 mb-1">
                        <Bookmark size={14} className="text-slate-500"/>
                        <span className="text-xs font-bold text-slate-500 uppercase">Nama Kertas Kerja</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900">LEAD SCHEDULE: PIUTANG USAHA</h1>
               </div>
               <div className="w-1/3 p-4 flex flex-col justify-center items-center bg-slate-100 border-l-4 border-l-slate-800">
                    <span className="text-xs font-bold text-slate-500">Index WP</span>
                    <span className="text-3xl font-mono font-bold text-red-600">A-100</span>
               </div>
          </div>

          {/* Bottom Row: Metadata */}
          <div className="flex bg-slate-50 text-xs text-slate-600 divide-x divide-slate-300">
              <div className="p-2 flex-1 flex items-center gap-2">
                  <User size={12}/> Disiapkan oleh: <strong>{state.currentUser.name}</strong>
              </div>
              <div className="p-2 flex-1 flex items-center gap-2">
                  <Calendar size={12}/> Tanggal: <strong>{new Date().toLocaleDateString('id-ID')}</strong>
              </div>
              <div className="p-2 flex-1 flex items-center gap-2">
                  <CheckCircle2 size={12}/> Mata Uang: <strong>IDR</strong>
              </div>
          </div>
      </div>

      {/* 2. BODY KERTAS KERJA */}
      <div className="bg-white shadow-sm border border-slate-300 p-8 min-h-[600px]">
          
          {/* Section A: Tabel Utama (Lead Schedule) */}
          <div className="mb-8">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase border-b pb-2">
                  <GripHorizontal size={16} /> A. Ringkasan Saldo Akun (Account Summary)
              </h3>
              
              <table className="w-full text-sm border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold">
                      <tr>
                          <th className="border border-slate-300 p-3 text-left w-1/3">Keterangan Akun</th>
                          <th className="border border-slate-300 p-3 text-center w-24">Ref.</th>
                          <th className="border border-slate-300 p-3 text-right bg-white">Saldo Per Buku<br/><span className="text-[10px] font-normal italic">Unaudited</span></th>
                          <th className="border border-slate-300 p-3 text-right bg-yellow-50">Penyesuaian<br/><span className="text-[10px] font-normal italic">Adjustments</span></th>
                          <th className="border border-slate-300 p-3 text-right bg-blue-50">Saldo Per Audit<br/><span className="text-[10px] font-normal italic">Audited</span></th>
                      </tr>
                  </thead>
                  <tbody>
                      {/* Row 1: AR Trade */}
                      <tr>
                          <td className="border border-slate-300 p-3 font-medium">Piutang Usaha - Pihak Ketiga</td>
                          <td className="border border-slate-300 p-3 text-center text-blue-600 font-mono text-xs">BB.1</td>
                          <td className="border border-slate-300 p-3 text-right font-mono text-slate-700">
                              {fmtMoney(leadScheduleData!.balancePerBook)}
                          </td>
                          <td className="border border-slate-300 p-3 text-right font-mono bg-yellow-50/30">
                              {leadScheduleData!.adjustments !== 0 ? (
                                  <span className={leadScheduleData!.adjustments < 0 ? 'text-red-600' : 'text-slate-800'}>
                                      {leadScheduleData!.adjustments < 0 ? `(${fmtMoney(Math.abs(leadScheduleData!.adjustments))})` : fmtMoney(leadScheduleData!.adjustments)}
                                  </span>
                              ) : '-'}
                          </td>
                          <td className="border border-slate-300 p-3 text-right font-mono font-bold text-slate-900 bg-blue-50/30">
                              {fmtMoney(leadScheduleData!.balancePerAudit)}
                          </td>
                      </tr>
                      {/* Total Row */}
                      <tr className="bg-slate-50 font-bold">
                          <td className="border border-slate-300 p-3 text-right uppercase" colSpan={2}>Total Piutang Usaha</td>
                          <td className="border border-slate-300 p-3 text-right border-t-double border-t-4 border-t-slate-400">
                              {fmtMoney(leadScheduleData!.balancePerBook)}
                          </td>
                          <td className="border border-slate-300 p-3 text-right text-red-600 border-t-double border-t-4 border-t-slate-400">
                              {leadScheduleData!.adjustments !== 0 ? (
                                     leadScheduleData!.adjustments < 0 ? `(${fmtMoney(Math.abs(leadScheduleData!.adjustments))})` : fmtMoney(leadScheduleData!.adjustments)
                              ) : '-'}
                          </td>
                          <td className="border border-slate-300 p-3 text-right text-slate-900 border-t-double border-t-4 border-t-slate-400">
                              {fmtMoney(leadScheduleData!.balancePerAudit)}
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>

          {/* Section B: Rincian Penyesuaian (PAJE) */}
          <div className="mb-8">
               <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase border-b pb-2">
                  <FileQuestion size={16} /> B. Usulan Jurnal Penyesuaian (Proposed Audit Adjustments)
              </h3>
              {leadScheduleData!.adjustmentItems.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 text-slate-500 italic text-sm text-center">
                      Tidak ada usulan penyesuaian audit.
                  </div>
              ) : (
                  <table className="w-full text-xs border-collapse border border-slate-300">
                      <thead className="bg-slate-100 text-slate-700">
                          <tr>
                              <th className="border border-slate-300 p-2 text-left w-20">Ref. Temuan</th>
                              <th className="border border-slate-300 p-2 text-left">Deskripsi Masalah / Jurnal</th>
                              <th className="border border-slate-300 p-2 text-center w-24">Tingkat Risiko</th>
                              <th className="border border-slate-300 p-2 text-right w-32">Debit (Rp)</th>
                              <th className="border border-slate-300 p-2 text-right w-32">Kredit (Rp)</th>
                          </tr>
                      </thead>
                      <tbody>
                          {leadScheduleData!.adjustmentItems.map((item, idx) => {
                               const isDebit = item.amount > 0; // Positive adds to asset (Debit)
                               return (
                                  <tr key={idx} className="hover:bg-slate-50">
                                      <td className="border border-slate-300 p-2 font-mono text-slate-500">{item.ref}</td>
                                      <td className="border border-slate-300 p-2">
                                          <div className="font-medium text-slate-800">{item.desc}</div>
                                          <div className="text-[10px] text-slate-500 mt-0.5">{item.type} Analysis</div>
                                      </td>
                                      <td className="border border-slate-300 p-2 text-center">
                                          <span className={`px-1.5 py-0.5 rounded border ${getSeverityClass(item.severity)}`}>
                                              {item.severity}
                                          </span>
                                      </td>
                                      {/* Logic Pembukuan: Jika Adjustment Positif (Menambah Aset) = Debit Piutang. Jika Negatif (Mengurangi) = Kredit Piutang */}
                                      <td className="border border-slate-300 p-2 text-right font-mono text-slate-700">
                                          {isDebit ? fmtMoney(Math.abs(item.amount)) : '-'}
                                      </td>
                                      <td className="border border-slate-300 p-2 text-right font-mono text-slate-700">
                                          {!isDebit ? fmtMoney(Math.abs(item.amount)) : '-'}
                                      </td>
                                  </tr>
                               );
                          })}
                      </tbody>
                  </table>
              )}
          </div>

          {/* Section C: Kesimpulan */}
          <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase border-b pb-2">
                  <Layout size={16} /> C. Kesimpulan Auditor (Conclusion)
              </h3>
              {renderAuditConclusion()}
          </div>
      </div>
      
      {/* Footer System */}
      <div className="text-center text-xs text-slate-400 mt-8 font-mono">
          Generated by External AR CAAT System | Ver 1.0.0
      </div>
    </div>
  );
};

export default Reports;