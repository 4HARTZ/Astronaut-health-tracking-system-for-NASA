import { create } from 'zustand';

export const useHealthStore = create((set, get) => ({
  // Theme state (dark | light)
  theme: (() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('orbit_theme') || 'dark';
      }
    } catch {
      /* ignore */
    }
    return 'dark';
  })(),
  setTheme: (theme) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('orbit_theme', theme);
      }
      if (typeof document !== 'undefined') {
        document.documentElement?.setAttribute('data-theme', theme);
        document.body?.setAttribute('data-theme', theme);
      }
    } catch {
      /* storage disabled */
    }
    set({ theme });
  },

  // Active Navigation & Workspace
  activeTab: 'all',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Crew Profile
  activeCrew: {
    id: 'vance-cdr',
    name: 'CDR. R. Vance',
    role: 'Commander',
    mission: 'NASA Crew-8 / ISS Exp 71',
    met: '+14d 08h',
  },
  setActiveCrew: (crew) => set({ activeCrew: crew }),

  // Persistent Health Records
  entries: [],
  setEntries: (entries) => set({ entries }),

  // Storage Enclave Telemetry
  storageBackend: 'IndexedDB (Browser Enclave)',
  storageStats: {
    totalRecords: 0,
    pendingOutbox: 0,
    dbPath: 'Local Workspace',
    dbSizeBytes: 0,
    isNativeSqlite: false,
  },
  setStorageStats: (stats) => set((state) => ({
    storageStats: { ...state.storageStats, ...stats },
    storageBackend: stats.isNativeSqlite ? 'SQLite 3 (Disk WAL)' : state.storageBackend,
  })),

  // Feature 2: Live Physiological Telemetry
  liveVitals: {
    heartRate: 68,
    spO2: 98,
    respiration: 14,
    perfusionIndex: 4.8,
    isStreaming: true,
    leadStatus: 'Nominal',
  },
  setLiveVitals: (updates) => set((state) => ({
    liveVitals: { ...state.liveVitals, ...updates },
  })),

  // Feature 3: Cognitive & PVT Reaction Telemetry
  pvtTelemetry: {
    history: [248, 262, 239, 255],
    lapses: 0,
    fastestRt: 239,
    meanRt: 251,
  },
  recordPvtTrial: (rt) => set((state) => {
    const newHistory = [rt, ...state.pvtTelemetry.history.slice(0, 9)];
    const lapses = state.pvtTelemetry.lapses + (rt > 500 ? 1 : 0);
    const meanRt = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);
    const fastestRt = Math.min(...newHistory);
    return {
      pvtTelemetry: {
        history: newHistory,
        lapses,
        meanRt,
        fastestRt,
      },
    };
  }),

  // Feature 6: Offline AI Fatigue Forecast State
  alertnessIndex: 91,
  setAlertnessIndex: (val) => set({ alertnessIndex: val }),
}));
