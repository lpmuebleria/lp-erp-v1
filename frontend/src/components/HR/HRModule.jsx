import React, { useState } from 'react';
import { Users, Calendar, Wallet, Receipt, Cake } from 'lucide-react';
import HRDirectory from './HRDirectory';
import HRAttendance from './HRAttendance';
import HRPayroll from './HRPayroll';
import HRCommissions from './HRCommissions';

export default function HRModule() {
  const [activeTab, setActiveTab] = useState('directory');

  const tabs = [
    { id: 'directory', label: 'Directorio', icon: Users },
    { id: 'attendance', label: 'Asistencia', icon: Calendar },
    { id: 'payroll', label: 'Nómina', icon: Wallet },
    { id: 'commissions', label: 'Comisiones', icon: Receipt },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm h-full flex flex-col">
      <div className="flex space-x-2 border-b border-white/10 pb-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all font-bold text-sm ${
              activeTab === tab.id
                ? 'bg-premium-gold text-black shadow-lg shadow-premium-gold/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'directory' && <HRDirectory />}
        {activeTab === 'attendance' && <HRAttendance />}
        {activeTab === 'payroll' && <HRPayroll />}
        {activeTab === 'commissions' && <HRCommissions />}
      </div>
    </div>
  );
}
