// wages page main file code
'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import OrdersStylesView from './OrdersStylesView';
import ComputationView from './ComputationView';
import LedgerView from './LedgerView';
import { Scissors, Activity, FileText } from 'lucide-react';


export default function PieceRatesAndWages() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('styles');

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ─── PREMIUM HEADER & NAVIGATION ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
            Payroll Command
          </h1>
          <p className="font-medium mt-2 text-sm max-w-xl" style={{ color: '#9a7a5a' }}>
            Manage piece-rate logic, execute shop floor audits, and process automated wage runs with high precision.
          </p>
        </div>

        {/* ─── PILL NAVIGATION ─── */}
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          {[
            { id: 'styles', icon: Scissors, label: 'Piece Rates' },
            { id: 'computation', icon: Activity, label: 'Run Engine' },
            { id: 'ledger', icon: FileText, label: 'Ledger' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${isActive
                  ? 'bg-white shadow-md'
                  : 'hover:bg-white/40 opacity-70 hover:opacity-100'
                  }`}
                style={isActive ? { color: '#c8834a' } : { color: '#4a3a2a' }}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : 'scale-100'} transition-transform`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── ACTIVE VIEW RENDERER ─── */}
      <div className="relative z-0">
        <div className={`transition-all duration-500 ${activeTab === 'styles' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <OrdersStylesView token={token} />
        </div>
        <div className={`transition-all duration-500 ${activeTab === 'computation' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <ComputationView token={token} />
        </div>
        <div className={`transition-all duration-500 ${activeTab === 'ledger' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <LedgerView token={token} isActive={activeTab === 'ledger'} />
        </div>
      </div>
    </div>
  );
}




