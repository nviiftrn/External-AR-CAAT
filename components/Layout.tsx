
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, FileSearch, FileText, ShieldCheck, Settings, UserCircle } from 'lucide-react';
import { useAuditContext } from '../App';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { state } = useAuditContext();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'Injeksi Data (ETL)', path: '/etl', icon: <Database size={20} /> },
    { label: 'Pengujian Substantif', path: '/testing', icon: <FileSearch size={20} /> },
    { label: 'Laporan & KKP', path: '/reports', icon: <FileText size={20} /> },
    { label: 'Kontrol Sistem & Log', path: '/system', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 print:hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 text-blue-400">
            <ShieldCheck size={28} />
            <h1 className="text-xl font-bold tracking-tight">External AR CAAT</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Sistem Audit Berbantuan Komputer</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
            {/* User Info Box - Simplified */}
            <div className="flex items-center gap-3 mb-4 px-2">
                <UserCircle className="text-slate-400" size={32} />
                <div>
                    <p className="text-sm font-semibold text-white">{state.currentUser.role}</p>
                    {/* Hanya tampilkan ID jika nama perannya generik */}
                    <p className="text-[10px] text-blue-300 font-mono">{state.currentUser.id}</p>
                </div>
            </div>

          <div className="bg-slate-800 rounded p-3">
            <p className="text-xs text-slate-400 uppercase font-semibold">Status Penugasan</p>
            <p className="text-sm font-medium text-white truncate">
                {state.clientName ? state.clientName : 'Belum Ada Data'}
            </p>
            <p className="text-xs text-slate-500">
                {state.clientName ? `Tahun Buku: ${state.auditYear}` : 'Silakan input di menu ETL'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto print:ml-0 print:p-0">
        <div className="max-w-7xl mx-auto print:max-w-none">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
