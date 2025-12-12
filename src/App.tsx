
import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AuditState, AuditLogEntry, UserRole } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import DataIngestion from './pages/DataIngestion';
import SubstantiveTesting from './pages/SubstantiveTesting';
import Reports from './pages/Reports';
import SystemControl from './pages/SystemControl'; // New Page

// Create Context Interface including Actions
interface AppContextType {
  state: AuditState;
  setState: React.Dispatch<React.SetStateAction<AuditState>>;
  logAction: (action: string, details: string, category: AuditLogEntry['category']) => void;
  switchUser: (role: UserRole) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAuditContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAuditContext must be used within App");
  return context;
};

const App: React.FC = () => {
  const [state, setState] = useState<AuditState>({
    clientName: '',
    auditYear: new Date().getFullYear().toString(),
    glData: null,
    invoices: [],
    customers: [],
    findings: [],
    isDataLoaded: false,
    auditDate: '',
    // Default User: Senior Auditor (Generic Name)
    currentUser: {
        id: 'USR-001',
        name: 'Senior Auditor',
        role: 'Senior Auditor'
    },
    auditLogs: []
  });

  // Action Logging Helper
  const logAction = (action: string, details: string, category: AuditLogEntry['category']) => {
      const newLog: AuditLogEntry = {
          id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: state.currentUser.name,
          role: state.currentUser.role,
          action,
          details,
          category
      };
      
      setState(prev => ({
          ...prev,
          auditLogs: [newLog, ...prev.auditLogs]
      }));
  };

  // RBAC Simulation Helper
  const switchUser = (role: UserRole) => {
      let name = '';
      switch(role) {
          case 'Partner': name = 'Audit Partner'; break;
          case 'Senior Auditor': name = 'Senior Auditor'; break;
          case 'Junior Auditor': name = 'Junior Auditor'; break;
          case 'Viewer': name = 'Guest / Viewer'; break;
      }

      const newUser = { id: `USR-${Date.now()}`, name, role };
      
      setState(prev => ({
          ...prev,
          currentUser: newUser,
          auditLogs: [
              {
                  id: `LOG-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  user: 'SYSTEM',
                  role: 'SYSTEM',
                  action: 'USER_SWITCH',
                  details: `User switched to ${role}`,
                  category: 'System'
              },
              ...prev.auditLogs
          ]
      }));
  };

  // Initial System Log
  useEffect(() => {
      if (state.auditLogs.length === 0) {
          logAction('SYSTEM_INIT', 'Aplikasi External AR CAAT dimulai.', 'System');
      }
  }, []);

  return (
    <AppContext.Provider value={{ state, setState, logAction, switchUser }}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/etl" element={<DataIngestion />} />
            <Route path="/testing" element={<SubstantiveTesting />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/system" element={<SystemControl />} />
            {/* Redirect any unknown route to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
