import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Check, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function DevToolbar() {
  // Only rendered in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const { refreshData, manualRefresh } = useStore();
  const [isClearing, setIsClearing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ db: string; env: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus({ db: data.db || 'up', env: data.env || 'development' });
      })
      .catch(() => {
        setHealthStatus({ db: 'down', env: 'development' });
      });
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    setStatusMessage(null);
    try {
      // Clear server cache
      await fetch('/api/cache/clear', { method: 'POST' }).catch(() => null);
      // Clear browser cache & refetch fresh data from database
      if (manualRefresh) {
        await manualRefresh();
      } else {
        await refreshData();
      }
      setStatusMessage('Cache cleared');
    } catch {
      setStatusMessage('Error clearing');
    } finally {
      setIsClearing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <aside 
      aria-label="Development Tools"
      className="fixed bottom-4 left-4 z-50 font-sans text-xs select-none"
    >
      <div className="flex items-center gap-2 bg-[#2E2140] text-white px-3 py-2 rounded-full shadow-lg border border-[#C9B5DD]/40 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 font-medium hover:text-[#C9A24B] transition-colors focus:outline-none"
          title="Toggle Development Status"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="tracking-wider uppercase font-semibold text-[10px] text-[#C9A24B]">DEV</span>
        </button>

        <span className="text-[#C9B5DD]/30">|</span>

        {/* Visible "Clear Cache" Button Required in Development Only */}
        <button
          type="button"
          onClick={handleClearCache}
          disabled={isClearing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#6B4A8E] hover:bg-[#593B78] text-white active:scale-95 transition-all disabled:opacity-50"
          title="Flush in-memory and dynamic API cache"
        >
          <RefreshCw size={12} className={isClearing ? 'animate-spin' : ''} />
          <span>{isClearing ? 'Clearing...' : 'Clear cache'}</span>
        </button>

        {statusMessage && (
          <span className="flex items-center gap-1 text-emerald-300 text-[11px] font-medium animate-fadeIn">
            <Check size={12} />
            {statusMessage}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 p-3 bg-[#2E2140]/95 text-[#F6F1FA] rounded-xl shadow-2xl border border-[#C9B5DD]/30 w-64 backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between font-semibold pb-2 border-b border-[#C9B5DD]/20 text-[11px] text-[#C9A24B]">
            <span>Environment Diagnostics</span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              {healthStatus?.env || 'dev'}
            </span>
          </div>

          <div className="mt-2.5 space-y-2 text-[11px]">
            <div className="flex justify-between items-center text-[#C9B5DD]">
              <span>API Endpoint</span>
              <code className="text-white bg-black/30 px-1 rounded text-[10px]">/api/*</code>
            </div>
            <div className="flex justify-between items-center text-[#C9B5DD]">
              <span>Database Status</span>
              <span className="flex items-center gap-1 text-emerald-300">
                <Database size={11} />
                {healthStatus?.db === 'up' ? 'Online / Pool' : 'Fallback / Memory'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#C9B5DD]">
              <span>Cache TTL</span>
              <span className="text-white">1 min (dev)</span>
            </div>
            <div className="flex justify-between items-center text-[#C9B5DD]">
              <span>SQL Error Details</span>
              <span className="text-amber-300">Verbose in API</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
