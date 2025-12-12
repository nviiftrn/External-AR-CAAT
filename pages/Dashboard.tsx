
import React, { useMemo, useState } from 'react';
import { useAuditContext } from '../App';
import { AlertCircle, CheckCircle2, TrendingUp, BarChart3, PieChart as PieChartIcon, Target, ArrowRight, BookOpen, ChevronDown, ChevronUp, Database, FileSearch, FileText } from 'lucide-react';
import { calculateAging } from '../services/auditLogic';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { state } = useAuditContext();
  const [showGuide, setShowGuide] = useState(!state.isDataLoaded); // Default buka jika belum ada data

  // Compute live stats
  const totalAR = state.invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const highRiskFindings = state.findings.filter(f => f.severity === 'High').length;
  
  // Data 1: Aging Pie Chart
  const agingData = useMemo(() => {
    if (!state.isDataLoaded) return [];
    const buckets = calculateAging(state.invoices, state.auditDate);
    return buckets.map(b => ({
      name: b.label,
      value: b.amount
    }));
  }, [state.invoices, state.auditDate, state.isDataLoaded]);

  // Data 2: Top 5 Customers by Balance (Concentration Risk)
  const customerConcentrationData = useMemo(() => {
    if (!state.isDataLoaded) return [];
    
    // Group by customer
    const grouped: Record<string, number> = {};
    state.invoices.forEach(inv => {
        const custName = state.customers.find(c => c.id === inv.customerId)?.name || inv.customerId;
        grouped[custName] = (grouped[custName] || 0) + inv.amount;
    });

    // Convert to array, sort desc, take top 5
    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  }, [state.invoices, state.customers, state.isDataLoaded]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444'];
  const BAR_COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Audit Piutang</h2>
          <p className="text-slate-500">
             {state.clientName ? `Klien: ${state.clientName} | Tahun Audit: ${state.auditYear}` : 'Selamat Datang di External AR CAAT'}
          </p>
        </div>
        <div className="flex gap-2">
           <button 
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm"
           >
              <BookOpen size={16} /> {showGuide ? 'Tutup Panduan' : 'Buka Panduan'}
           </button>
           <span className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-1 ${state.isDataLoaded ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
              {state.isDataLoaded ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {state.isDataLoaded ? 'Data Siap' : 'Menunggu Data'}
           </span>
        </div>
      </div>

      {/* PANDUAN PENGGUNAAN APLIKASI (WORKFLOW GUIDE) */}
      {showGuide && (
          <div className="bg-slate-800 rounded-xl p-6 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20} className="text-blue-400"/> Panduan Alur Kerja Audit (Audit Workflow)</h3>
                    <p className="text-slate-400 text-sm mt-1">Ikuti langkah-langkah berikut untuk menyelesaikan prosedur audit menggunakan sistem ini.</p>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-white"><ChevronUp size={20}/></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Step 1 */}
                  <div className={`p-4 rounded-lg border ${!state.isDataLoaded ? 'bg-blue-600 border-blue-500 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : 'bg-slate-700/50 border-slate-600'}`}>
                      <div className="flex items-center gap-2 mb-2 font-bold text-blue-100">
                          <span className="bg-blue-500 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                          Injeksi Data (ETL)
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                          Masuk ke menu <strong>Injeksi Data</strong>. Isi parameter klien, lalu unggah file Excel atau gunakan tombol <strong>"Mode Simulasi"</strong> untuk generate data contoh beserta anomali selisih GL vs Subledger.
                      </p>
                      <Link to="/etl" className="text-xs font-bold text-blue-300 hover:text-white flex items-center gap-1">
                          Ke Menu ETL <ArrowRight size={12}/>
                      </Link>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-4 rounded-lg border bg-slate-700/50 border-slate-600`}>
                      <div className="flex items-center gap-2 mb-2 font-bold text-indigo-100">
                          <span className="bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                          Smart Reconciliation
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                          Setelah data masuk, sistem akan otomatis melakukan <strong>3-Way Matching</strong>. Jalankan "Detektif Audit" di menu ETL untuk mencari penyebab selisih saldo secara otomatis.
                      </p>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-4 rounded-lg border bg-slate-700/50 border-slate-600`}>
                      <div className="flex items-center gap-2 mb-2 font-bold text-purple-100">
                          <span className="bg-purple-500 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                          Pengujian Substantif
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                          Lakukan prosedur rinci:
                          <br/>• <strong>Aging:</strong> Review cadangan kerugian.
                          <br/>• <strong>Konfirmasi:</strong> Generate sampel surat.
                          <br/>• <strong>Cutoff:</strong> Cek pisah batas otomatis.
                      </p>
                      <Link to="/testing" className="text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1">
                          Lakukan Pengujian <ArrowRight size={12}/>
                      </Link>
                  </div>

                  {/* Step 4 */}
                  <div className={`p-4 rounded-lg border bg-slate-700/50 border-slate-600`}>
                      <div className="flex items-center gap-2 mb-2 font-bold text-green-100">
                          <span className="bg-green-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                          Pelaporan (KKP)
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                          Menu <strong>Laporan</strong> akan otomatis menyajikan <strong>Lead Schedule (A-100)</strong>. Sistem akan memberikan kesimpulan opini (Wajar/Pengecualian) berdasarkan temuan yang ada.
                      </p>
                      <Link to="/reports" className="text-xs font-bold text-green-300 hover:text-white flex items-center gap-1">
                          Lihat KKP Akhir <ArrowRight size={12}/>
                      </Link>
                  </div>
              </div>
          </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-blue-600">Total Piutang Usaha</h3>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            Rp {totalAR.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-slate-400 mt-1">Berdasarkan Subledger</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-red-300 transition group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-red-600">Temuan Audit</h3>
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{state.findings.length}</p>
          <p className="text-xs text-red-500 mt-1">{highRiskFindings} Risiko Tinggi</p>
        </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-green-300 transition group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-green-600">Integritas Data</h3>
            <CheckCircle2 className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{state.isDataLoaded ? 'Valid' : 'Pending'}</p>
          <p className="text-xs text-slate-400 mt-1">Status Detail Tie-in</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-purple-300 transition group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-purple-600">Cakupan Populasi</h3>
            <BarChart3 className="text-purple-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{state.isDataLoaded ? '100%' : '0%'}</p>
          <p className="text-xs text-slate-400 mt-1">Transaksi Dianalisis</p>
        </div>
      </div>

      {/* Visualizations */}
      {state.isDataLoaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Aging Chart (Existing) */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                 <PieChartIcon size={20} className="text-slate-600" />
                 <h3 className="font-semibold text-slate-800">Komposisi Umur Piutang</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {agingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Concentration Risk Chart (NEW) */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                 <Target size={20} className="text-slate-600" />
                 <div>
                    <h3 className="font-semibold text-slate-800">Konsentrasi Kredit (Top 5 Pelanggan)</h3>
                    <p className="text-xs text-slate-400">Penting untuk seleksi sampel konfirmasi</p>
                 </div>
              </div>
              {customerConcentrationData.length > 0 ? (
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerConcentrationData} layout="vertical" margin={{ left: 40 }}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={100} style={{fontSize: '11px', fontWeight: 'bold'}} />
                         <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                         <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                            {customerConcentrationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 italic">
                   Belum ada data piutang tersedia.
                </div>
              )}
           </div>
        </div>
      ) : (
          <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
             <Database className="mx-auto h-12 w-12 text-slate-300 mb-3" />
             <h3 className="text-lg font-medium text-slate-900">Data Belum Tersedia</h3>
             <p className="text-slate-500 mb-6 max-w-sm mx-auto">Silakan mulai dengan Injeksi Data untuk melihat visualisasi analitik piutang.</p>
             <Link to="/etl" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                Mulai Injeksi Data
             </Link>
          </div>
      )}

      {/* Quick Actions / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
           <h3 className="font-semibold text-slate-800 mb-4">Status & Aktivitas Sistem</h3>
           <ul className="space-y-3">
              {state.clientName && (
                <li className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Sistem aktif untuk {state.clientName}
                </li>
              )}
              {state.isDataLoaded && (
                <li className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    ETL Berhasil: {state.invoices.length} faktur diimpor
                </li>
              )}
               {state.findings.length > 0 && (
                <li className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {state.findings.length} pengecualian terdeteksi
                </li>
              )}
              {!state.clientName && (
                 <li className="text-sm text-slate-400 italic">Menunggu input user...</li>
              )}
           </ul>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
           <h3 className="font-semibold text-slate-800 mb-4">Rekomendasi Prosedur</h3>
             <div className="space-y-2">
                {customerConcentrationData.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-sm font-medium text-blue-900">
                            Kirim konfirmasi positif ke {customerConcentrationData[0].name} (Saldo Terbesar)
                        </span>
                        <ArrowRight size={14} className="text-blue-500"/>
                    </div>
                )}
                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                   <span className="text-sm font-medium">Cek pembayaran setelah tanggal neraca</span>
                   <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold">Prioritas</span>
                </div>
                {highRiskFindings > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-sm font-medium text-red-900">
                            Investigasi {highRiskFindings} temuan risiko tinggi
                        </span>
                         <AlertCircle size={14} className="text-red-500"/>
                    </div>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
