
import React, { useState } from 'react';
import { useAuditContext } from '../App';
import { calculateAging, daysBetween } from '../services/auditLogic';
import { Shield, Activity, Users, History, CheckCircle, XCircle, Play, Lock } from 'lucide-react';
import { UserRole, SystemTestResult } from '../types';

const SystemControl: React.FC = () => {
  const { state, switchUser, logAction } = useAuditContext();
  const [activeTab, setActiveTab] = useState<'logs' | 'rbac' | 'diagnostics'>('logs');
  const [testResults, setTestResults] = useState<SystemTestResult[]>([]);

  // --- BLACK BOX TESTING LOGIC ---
  const runSystemDiagnostics = () => {
    const results: SystemTestResult[] = [];
    const timestamp = new Date().toLocaleTimeString();

    // Test 1: Verifikasi Logika Aging (Independent Calculation)
    try {
        const dummyInvoice = [{ 
            id: 'TEST-01', customerId: 'C1', amount: 1000, 
            invoiceDate: '2023-12-01', dueDate: '2023-12-31', 
            shippingDate: '2023-12-01', recordingDate: '2023-12-01', status: 'Open' as const 
        }];
        const auditDate = '2023-12-31';
        // Usia = 30 hari. Harus masuk bucket "1-30 Hari"
        const buckets = calculateAging(dummyInvoice, auditDate);
        const targetBucket = buckets.find(b => b.label === '1-30 Hari');
        
        if (targetBucket && targetBucket.amount === 1000) {
            results.push({ testName: 'Logika Kalkulasi Umur (Aging Logic)', status: 'Pass', message: 'Perhitungan hari dan pengelompokan bucket akurat.', timestamp });
        } else {
            results.push({ testName: 'Logika Kalkulasi Umur (Aging Logic)', status: 'Fail', message: 'Salah pengelompokan bucket.', timestamp });
        }
    } catch (e) {
        results.push({ testName: 'Logika Kalkulasi Umur (Aging Logic)', status: 'Fail', message: 'Sistem crash saat kalkulasi.', timestamp });
    }

    // Test 2: Verifikasi Logika DaysBetween
    const days = daysBetween('2023-01-01', '2023-01-05');
    if (days === 4) {
        results.push({ testName: 'Fungsi Utilitas Tanggal', status: 'Pass', message: 'Kalkulasi selisih hari valid.', timestamp });
    } else {
        results.push({ testName: 'Fungsi Utilitas Tanggal', status: 'Fail', message: `Hasil ${days}, seharusnya 4.`, timestamp });
    }

    // Test 3: Integritas State
    if (Array.isArray(state.auditLogs) && Array.isArray(state.invoices)) {
        results.push({ testName: 'Integritas Penyimpanan Data (State)', status: 'Pass', message: 'Struktur data memori valid.', timestamp });
    } else {
        results.push({ testName: 'Integritas Penyimpanan Data (State)', status: 'Fail', message: 'Struktur data korup.', timestamp });
    }

    setTestResults(results);
    logAction('SYSTEM_TEST', 'Menjalankan Black Box Testing Otomatis', 'System');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Kontrol Sistem & Integritas</h2>
        <p className="text-slate-500">Manajemen Hak Akses, Audit Trail, dan Diagnostik Sistem.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'logs' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History size={16} /> Audit Trail (Logs)
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'rbac' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} /> Kontrol Akses (RBAC)
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'diagnostics' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Activity size={16} /> Diagnostik Sistem
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[500px]">
        
        {/* TAB 1: AUDIT TRAIL */}
        {activeTab === 'logs' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800">Rekaman Jejak Audit (Audit Trail)</h3>
                    <div className="flex items-center gap-2 text-xs bg-slate-100 px-3 py-1 rounded text-slate-500">
                        <Lock size={12} /> Read-Only / Immutable
                    </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="p-3 w-40">Waktu</th>
                                <th className="p-3 w-48">User / Aktor</th>
                                <th className="p-3 w-32">Kategori</th>
                                <th className="p-3">Aksi</th>
                                <th className="p-3">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {state.auditLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono text-xs text-slate-500">
                                        {new Date(log.timestamp).toLocaleString('id-ID')}
                                    </td>
                                    <td className="p-3 font-medium text-slate-800">
                                        {/* Simplified to single line as requested */}
                                        {log.user}
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                            log.category === 'Data' ? 'bg-blue-100 text-blue-700' :
                                            log.category === 'System' ? 'bg-gray-100 text-gray-700' :
                                            'bg-purple-100 text-purple-700'
                                        }`}>
                                            {log.category}
                                        </span>
                                    </td>
                                    <td className="p-3 font-semibold text-slate-700">{log.action}</td>
                                    <td className="p-3 text-slate-600 font-mono text-xs">{log.details}</td>
                                </tr>
                            ))}
                            {state.auditLogs.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Belum ada aktivitas tercatat.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* TAB 2: RBAC SIMULATOR */}
        {activeTab === 'rbac' && (
            <div>
                 <h3 className="font-bold text-lg text-slate-800 mb-2">Simulasi Kontrol Akses (RBAC)</h3>
                 <p className="text-slate-500 mb-6 text-sm">Gunakan panel ini untuk mensimulasikan login sebagai pengguna dengan kewenangan berbeda.</p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Shield size={18}/> Pilih Peran Pengguna</h4>
                        <div className="space-y-3">
                            {(['Partner', 'Senior Auditor', 'Junior Auditor', 'Viewer'] as UserRole[]).map(role => (
                                <button 
                                    key={role}
                                    onClick={() => switchUser(role)}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition flex justify-between items-center ${
                                        state.currentUser.role === role 
                                        ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500' 
                                        : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <span className="font-medium">{role}</span>
                                    {state.currentUser.role === role && <CheckCircle size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-slate-200">
                         <h4 className="font-semibold text-slate-700 mb-4">Matriks Kewenangan Saat Ini: <span className="text-blue-600">{state.currentUser.role}</span></h4>
                         <ul className="space-y-2 text-sm text-slate-600">
                             <li className="flex items-center gap-2">
                                 {state.currentUser.role !== 'Viewer' ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-400"/>}
                                 Injeksi Data & Rekonsiliasi (ETL)
                             </li>
                             <li className="flex items-center gap-2">
                                 {state.currentUser.role !== 'Viewer' ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-400"/>}
                                 Eksekusi Sampling & Testing (Substantif)
                             </li>
                             <li className="flex items-center gap-2">
                                 {state.currentUser.role === 'Partner' || state.currentUser.role === 'Senior Auditor' ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-400"/>}
                                 Judgement Valuasi (Ubah Estimasi CKP)
                             </li>
                             <li className="flex items-center gap-2">
                                 {state.currentUser.role === 'Partner' ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-400"/>}
                                 Final Sign-off / Review Laporan KKP
                             </li>
                         </ul>
                    </div>
                 </div>
            </div>
        )}

        {/* TAB 3: SYSTEM DIAGNOSTICS */}
        {activeTab === 'diagnostics' && (
             <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Pengujian Kotak Hitam (Black Box Testing)</h3>
                        <p className="text-sm text-slate-500">Jalankan diagnostik mandiri untuk memvalidasi integritas logika aplikasi.</p>
                    </div>
                    <button 
                        onClick={runSystemDiagnostics}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
                    >
                        <Play size={16} /> Jalankan Tes Sistem
                    </button>
                </div>

                {testResults.length > 0 ? (
                    <div className="bg-slate-900 rounded-lg p-6 font-mono text-sm text-slate-300">
                        <p className="text-slate-500 border-b border-slate-700 pb-2 mb-4">console_output &gt; system_check.exe</p>
                        <div className="space-y-3">
                            {testResults.map((res, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <span>[{res.timestamp}] Checking {res.testName}...</span>
                                    <span className={res.status === 'Pass' ? 'text-green-400 font-bold' : 'text-red-500 font-bold'}>
                                        [{res.status.toUpperCase()}] {res.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700 text-green-400">
                            &gt; Diagnostic Complete. System Integrity: {testResults.every(r => r.status === 'Pass') ? '100%' : 'WARNING'}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-12 text-center text-slate-400">
                        <Activity size={48} className="mx-auto mb-4 opacity-50"/>
                        <p>Klik tombol "Jalankan Tes Sistem" untuk memulai verifikasi logika internal.</p>
                    </div>
                )}
             </div>
        )}

      </div>
    </div>
  );
};

export default SystemControl;
