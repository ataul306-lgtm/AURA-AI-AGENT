import React from 'react';
import { type BrowserProfile, HealthReportItem } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface HealthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BrowserProfile | null;
  onApplyFix: (profileId: string, fix: HealthReportItem) => void;
}

const HealthReportModal: React.FC<HealthReportModalProps> = ({ isOpen, onClose, profile, onApplyFix }) => {
  if (!isOpen || !profile || !profile.healthStatus) return null;

  const { healthStatus } = profile;

  const getRiskClasses = () => {
    switch (healthStatus.risk) {
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 transition-opacity duration-300">
      <div className="bg-brand-surface rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-brand-dark">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <StethoscopeIcon /> AI Health Report for "{profile.name}"
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-dark">
            <CloseIcon />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          <div className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${getRiskClasses()}`}>
            <div>
                <span className="text-sm font-semibold">Overall Detection Risk:</span>
                <span className="text-2xl font-bold ml-2 capitalize">{healthStatus.risk}</span>
            </div>
            {healthStatus.lastChecked && (
                <div className="text-xs text-right opacity-70">
                    Last checked: {new Date(healthStatus.lastChecked).toLocaleString()}
                </div>
            )}
          </div>

          {healthStatus.report.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-green-300 font-semibold">No inconsistencies found!</p>
              <p className="text-brand-text-secondary mt-1">This profile fingerprint appears to be consistent.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-brand-text">Identified Issues & Suggestions:</h3>
              {healthStatus.report.map((item, index) => (
                <div key={index} className="bg-brand-dark/50 p-3 rounded-lg">
                  <p className="font-bold text-white capitalize">{item.parameter.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-sm text-brand-text-secondary mt-1"><span className="font-semibold text-yellow-400">Issue:</span> {item.issue}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 p-2 bg-brand-dark/30 rounded">
                      <p className="text-sm text-brand-text">
                        <span className="font-semibold text-green-400">Suggestion:</span> {item.suggestion}
                      </p>
                      <button 
                        onClick={() => onApplyFix(profile.id, item)}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1 text-xs font-semibold text-brand-light bg-brand-secondary/80 rounded-md hover:bg-brand-secondary transition-colors"
                      >
                          <SparklesIcon className="w-3 h-3"/>
                          Apply Fix
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-brand-dark/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HealthReportModal;