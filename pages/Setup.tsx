import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditContext } from '../App';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const Setup: React.FC = () => {
  const { setState } = useAuditContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    client: '',
    year: new Date().getFullYear().toString()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.year) return;

    setState(prev => ({
      ...prev,
      clientName: formData.client,
      auditYear: formData.year,
      auditDate: `${formData.year}-12-31`,
      isDataLoaded: false,
      findings: [],
      invoices: [],
      glData: null
    }));

    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <ShieldCheck size={48} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Mulai Penugasan Audit</h1>
          <p className="text-slate-500 text-center">External AR CAAT Prototype</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nama Klien
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Contoh: PT Sejahtera Abadi"
              value={formData.client}
              onChange={(e) => setFormData({...formData, client: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tahun Buku Audit
            </label>
            <input
              type="number"
              required
              min="2000"
              max="2030"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            Mulai Audit <ArrowRight size={20} />
          </button>
        </form>
        
        <p className="text-xs text-center text-slate-400 mt-6">
          Sistem ini dirancang sesuai Standar Profesional Akuntan Publik (SPAP).
        </p>
      </div>
    </div>
  );
};

export default Setup;