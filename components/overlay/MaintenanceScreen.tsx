
import React from 'react';
import { AlertOctagon, LogOut } from 'lucide-react';

interface MaintenanceScreenProps {
  onBack?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onBack }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-[100]">
      <div className="bg-red-900/20 p-8 rounded-3xl border-4 border-red-600 flex flex-col items-center text-center animate-pulse shadow-[0_0_50px_rgba(220,38,38,0.5)]">
        <AlertOctagon size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl md:text-4xl font-black text-red-500 uppercase tracking-widest mb-4">
          Maintenance
        </h1>
        <div className="h-px w-full bg-red-800 mb-4" />
        <p className="text-gray-300 font-bold max-w-xs text-sm md:text-base leading-relaxed">
          The application is currently under maintenance or unavailable for your account.
        </p>
        <p className="text-red-400/50 text-xs mt-4 font-mono">
          Code: 403 Forbidden
        </p>
        
        {/* Test Mode Exit Button */}
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-8 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors text-sm font-bold pointer-events-auto"
          >
            <LogOut size={16} /> Exit Test Mode
          </button>
        )}
      </div>
    </div>
  );
};
