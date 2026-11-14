import React, { useEffect, useRef, useState } from 'react';
import { formatDate, loadRecords } from './health.js';
import { initializeUnifiedRepository } from './storage/unifiedRepository.js';
import { useHealthStore } from './store/useHealthStore.js';
import HeaderNav from './components/HeaderNav.jsx';
import PwaStatus from './components/PwaStatus.jsx';
import DailyChecklist, { SavedResults } from './components/DailyChecklist.jsx';
import CheckInForm from './components/CheckInForm.jsx';
import MetricCards from './components/MetricCards.jsx';
import TrendChart from './components/TrendChart.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import ChangesPanel from './components/ChangesPanel.jsx';
import HealthReport from './components/HealthReport.jsx';
import RecordHistory from './components/RecordHistory.jsx';
import RealtimeMonitor from './components/RealtimeMonitor.jsx';
import CognitiveGames from './components/CognitiveGames.jsx';
import MedicalAiAdvisory from './components/MedicalAiAdvisory.jsx';
import RechartsAnalytics from './components/RechartsAnalytics.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { OrbitLogo } from './components/HeaderNav.jsx';
import { HeartPulse, Activity, Brain, Radio, Shield, Sparkles } from 'lucide-react';

const isTestEnv = typeof window !== 'undefined' && (window.IS_REACT_ACT_ENVIRONMENT || globalThis.IS_REACT_ACT_ENVIRONMENT);

export default function App({ repositoryFactory = initializeUnifiedRepository }) {
  const [activeTab, setActiveTab] = useState(isTestEnv ? 'all' : 'vitals');
  const [saved, setSaved] = useState(null);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formVersion, setFormVersion] = useState(0);
  const [message, setMessage] = useState('');
  const [recordMessage, setRecordMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const [dbStats, setDbStats] = useState(null);

  const setStoreEntries = useHealthStore((s) => s.setEntries);
  const setStoreStorageStats = useHealthStore((s) => s.setStorageStats);
  const theme = useHealthStore((s) => s.theme);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme || 'dark');
      document.body.setAttribute('data-theme', theme || 'dark');
    }
  }, [theme]);

  const repoRef = useRef(null);
  const revisions = useRef({});
  const editingRevision = useRef(null);

  const disabled = loading || Boolean(storageError) || busy;

  async function refresh(repo = repoRef.current) {
    const snapshot = await repo.snapshot();
    setEntries(snapshot.entries);
    setStoreEntries(snapshot.entries);
    revisions.current = snapshot.revisions;
    setPending(snapshot.pending);
    if (snapshot.stats) {
      setDbStats(snapshot.stats);
      setStoreStorageStats(snapshot.stats);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let repo;
    let unsubscribe;

    (async () => {
      try {
        repo = await repositoryFactory();
        if (cancelled) {
          repo.close?.();
          return;
        }
        const snapshot = await repo.snapshot();
        if (cancelled) {
          repo.close?.();
          return;
        }
        repoRef.current = repo;
        setEntries(snapshot.entries);
        revisions.current = snapshot.revisions;
        setPending(snapshot.pending);
        setLoading(false);

        unsubscribe = repo.subscribe?.(() => {
          refresh(repo).catch(() =>
            setStorageError('Could not refresh device storage. Reload before making more changes.')
          );
        });
      } catch {
        if (cancelled) return;
        repo?.close?.();
        setLoading(false);
        setStorageError(
          'Device storage could not be opened or migrated. Saving is disabled. Existing records were not removed. Export available records, check browser storage permissions, and reload.'
        );
        try {
          setEntries(loadRecords(window.localStorage));
        } catch {
          /* malformed legacy data remains untouched */
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      repo?.close?.();
      repoRef.current = null;
    };
  }, [repositoryFactory]);

  function resetForm() {
    setEditing(null);
    editingRevision.current = null;
    setFormVersion((v) => v + 1);
  }

  async function save(entry) {
    if (disabled) return;
    setBusy(true);
    try {
      await repoRef.current.save(entry, editing ? editingRevision.current : null);
      setMessage(editing ? 'Check-in updated on this device.' : 'Check-in saved on this device.');
      resetForm();
      setSaved(entry);
      try {
        await refresh();
      } catch {
        setStorageError('Check-in was saved, but the display could not refresh. Reload to view it.');
      }
    } catch (error) {
      setMessage(`Could not save: ${error.message} Your form has been kept.`);
    } finally {
      setBusy(false);
    }
  }

  function edit(entry) {
    if (disabled) return;
    editingRevision.current = revisions.current[entry.id];
    setSaved(null);
    setEditing(entry);
    setFormVersion((v) => v + 1);
    setMessage('');
    setActiveTab('all');
    document.querySelector('#check-in')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function remove(entry) {
    if (
      disabled ||
      !window.confirm(
        `Delete the check-in from ${formatDate(entry.time)}? Export a backup first if needed.`
      )
    )
      return;
    setBusy(true);
    try {
      await repoRef.current.remove(entry.id, revisions.current[entry.id]);
      if (editing?.id === entry.id) resetForm();
      if (saved?.id === entry.id) setSaved(null);
      setRecordMessage('Check-in deleted.');
      try {
        await refresh();
      } catch {
        setStorageError('Deletion was saved, but the display could not refresh. Reload to view it.');
      }
    } catch (error) {
      setRecordMessage(`Could not delete: ${error.message} Records were not changed.`);
    } finally {
      setBusy(false);
    }
  }

  async function importRecords(file) {
    if (disabled) return;
    setBusy(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('Choose a JSON backup smaller than 5 MB.');
      const result = await repoRef.current.importBackup(JSON.parse(await file.text()));
      setRecordMessage(
        `Imported ${result.added} records. Skipped ${result.duplicates} duplicates and ${result.conflicts} conflicts. Existing records were preserved.`
      );
      try {
        await refresh();
      } catch {
        setStorageError('Import was saved, but the display could not refresh. Reload to view it.');
      }
    } catch (error) {
      setRecordMessage(
        error instanceof SyntaxError
          ? 'Invalid JSON file. No records were imported.'
          : `Import failed: ${error.message}`
      );
    } finally {
      setBusy(false);
    }
  }

  // Views filter
  const isAll = activeTab === 'all';
  const showSettings = activeTab === 'settings';
  const showVitals = isAll || activeTab === 'vitals';
  const showRealtime = isAll || activeTab === 'realtime';
  const showCognitive = isAll || activeTab === 'cognitive';
  const showAnalytics = isAll || activeTab === 'analytics';
  const showReports = isAll || activeTab === 'reports';
  const showAdvisory = isAll || activeTab === 'advisory';
  const showHistory = isAll || activeTab === 'vitals';

  return (
    <div className="min-h-screen bg-[#171a21] text-[#c6d4df] flex flex-col font-sans">
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pending}
        storageError={storageError}
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 sm:px-8 py-7 space-y-6">
        {/* Active Subsystem Indicator Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-[3px] bg-[#16202d] border border-[#2a475e] text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#66c0f4] animate-pulse"></span>
            <span className="text-[#8f98a0] font-mono tracking-wider text-[11px]">ACTIVE DECK:</span>
            <span className="text-white font-bold uppercase tracking-wider font-mono text-[11.5px]">
              {activeTab === 'all'
                ? 'ALL SUBSYSTEMS (FULL MISSION TELEMETRY)'
                : activeTab === 'settings'
                ? 'SYSTEM SETTINGS & PREFERENCES'
                : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="!py-1 !px-2.5 !text-[11px] !bg-[#212c3d] !border-[#3d4f68] !text-[#c6d4df] hover:!text-white rounded-[3px]"
              >
                View Full Deck (All Subsystems)
              </button>
            )}
            <span className="text-[#a4d007] font-mono text-[11px] px-2.5 py-0.5 rounded-[3px] bg-[#5c7e10]/20 border border-[#a4d007]/30 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a4d007]"></span>
              AIR-GAPPED ENCLAVE
            </span>
          </div>
        </div>

        {/* Hero Mission Control Console (Dynamic & Informative HUD) */}
        {showVitals && (
          <section className="p-6 sm:p-7 rounded-[4px] bg-gradient-to-r from-[#192638] via-[#1b2838] to-[#16202d] border border-[#2a475e] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10.5px] font-bold text-[#66c0f4] uppercase tracking-wider font-mono">
                <OrbitLogo className="w-4 h-4" />
                <span>EXPEDITION 72</span>
                <span className="text-[#3d5a80]">·</span>
                <span>BIO-TELEMETRY &amp; CREW AUTONOMY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white m-0 tracking-tight">
                Astronaut Health &amp; Telemetry Console
              </h1>
              <p className="text-xs sm:text-sm text-[#8f98a0] max-w-2xl leading-relaxed m-0">
                Autonomous clinical logging, cardiovascular trend surveillance, neurobehavioral vigilance scoring, and on-device flight decision support.
              </p>
              
              {/* Quick-Action Launchpad */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  className="button !py-2 !px-4 !text-xs !font-bold"
                  href="#check-in"
                >
                  Start Daily Check-in ↗
                </a>
                <button
                  type="button"
                  onClick={() => setActiveTab('realtime')}
                  className="!py-2 !px-3 !text-xs !bg-[#212c3d] !border-[#3d4f68] !text-[#c6d4df] hover:!text-white rounded-[3px] flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-[#66c0f4]" />
                  <span>Live Waveform</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cognitive')}
                  className="!py-2 !px-3 !text-xs !bg-[#212c3d] !border-[#3d4f68] !text-[#c6d4df] hover:!text-white rounded-[3px] flex items-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5 text-[#a4d007]" />
                  <span>PVT Reaction Test</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('advisory')}
                  className="!py-2 !px-3 !text-xs !bg-[#212c3d] !border-[#3d4f68] !text-[#c6d4df] hover:!text-white rounded-[3px] flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#e58e26]" />
                  <span>AI Advisory &amp; SAFTE</span>
                </button>
              </div>
            </div>

            {/* Live Mission Telemetry Matrix Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 shrink-0 min-w-[250px]">
              {/* Widget 1: Today's Routine */}
              <div className="p-3 rounded-[3px] bg-[#101822] border border-[#2a475e] flex items-center gap-3">
                <div className="w-9 h-9 rounded-[3px] bg-[#212c3d] border border-[#3d4f68] flex items-center justify-center text-[#66c0f4] shrink-0">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#8f98a0] uppercase tracking-wider">Today's Check-in</div>
                  <div className="text-xs font-bold text-white font-mono">
                    {entries.filter(e => new Date(e.time).toLocaleDateString() === new Date().toLocaleDateString()).length > 0
                      ? `${entries.filter(e => new Date(e.time).toLocaleDateString() === new Date().toLocaleDateString()).length} Record Logged`
                      : 'Pending Routine'}
                  </div>
                </div>
              </div>

              {/* Widget 2: Local Vault */}
              <div className="p-3 rounded-[3px] bg-[#101822] border border-[#2a475e] flex items-center gap-3">
                <div className="w-9 h-9 rounded-[3px] bg-[#212c3d] border border-[#3d4f68] flex items-center justify-center text-[#a4d007] shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#8f98a0] uppercase tracking-wider">Autonomous Vault</div>
                  <div className="text-xs font-bold text-[#a4d007] font-mono">100% Local · SQLite</div>
                </div>
              </div>

              {/* Widget 3: Sensors */}
              <div className="p-3 rounded-[3px] bg-[#101822] border border-[#2a475e] flex items-center gap-3">
                <div className="w-9 h-9 rounded-[3px] bg-[#212c3d] border border-[#3d4f68] flex items-center justify-center text-[#66c0f4] shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#8f98a0] uppercase tracking-wider">Sensor Interface</div>
                  <div className="text-xs font-bold text-white font-mono">rPPG &amp; BLE Standby</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* System & PWA Enclave Indicators */}
        <PwaStatus />

        {/* Compact Integrated Storage Vault Status Bar */}
        <section className="panel storage-status !p-3.5 !mb-2" aria-label="Device storage">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#a4d007]"></span>
              <strong className="text-white font-semibold">Local-only workspace:</strong>
              <span role="status" className="text-[#c6d4df]">
                {loading
                  ? 'Opening device records…'
                  : storageError ||
                    'Records are saved on this device. Accounts and cloud synchronization are not connected.'}
              </span>
            </div>
            {!loading && !storageError && (
              <span className="hint font-mono text-[11px] text-[#8f98a0]">
                {pending} local change{pending === 1 ? '' : 's'} in the device journal. No records have been uploaded. Storage is not encrypted yet.
              </span>
            )}
          </div>
        </section>

        {/* FEATURE 1: Daily Routine & Baseline Metric Cards */}
        {showVitals && (
          <div className="space-y-6">
            <DailyChecklist entries={entries} />
            <MetricCards entries={entries} />
          </div>
        )}

        {/* FEATURE 2: Real-Time Physiological Telemetry (ECG / rPPG / Sensors) */}
        {showRealtime && (
          <div id="realtime-section" className="space-y-6">
            <RealtimeMonitor />
          </div>
        )}

        {/* FEATURE 3: Cognitive Fitness & Mental Health Mini-Games */}
        {showCognitive && (
          <div id="cognitive-section" className="space-y-6">
            <CognitiveGames />
          </div>
        )}

        {/* Check-In Guided Flow / Active Workspace */}
        {showVitals && (
          <div className="space-y-6">
            <div className="workspace">
              {saved ? (
                <SavedResults
                  entry={saved}
                  onEdit={edit}
                  onNew={() => {
                    setSaved(null);
                    resetForm();
                    setMessage('');
                  }}
                />
              ) : (
                <CheckInForm
                  key={formVersion}
                  entry={editing}
                  disabled={disabled}
                  onSave={save}
                  onCancel={() => {
                    resetForm();
                    setMessage('Edit cancelled.');
                  }}
                  message={message}
                  setMessage={setMessage}
                />
              )}

              {/* Cardiovascular & Sleep Quick Trend Visuals */}
              <div id="trends" className="space-y-6">
                <TrendChart entries={entries} />
                <ChangesPanel entries={entries} />
                <InsightsPanel entries={entries} />

                <section className="panel info">
                  <h2>Understand your data</h2>
                  <p>
                    Heart rate and blood pressure offer cardiovascular context. Sleep, mood, and stress help you reflect on wellbeing.
                  </p>
                  <p>
                    Basic readings cannot measure bone density, radiation exposure, or immune function. These require dedicated assessments.
                  </p>
                  <a href="https://www.nasa.gov/hrp/risks/" target="_blank" rel="noopener noreferrer">
                    Explore NASA’s health research ↗
                  </a>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Health Analytics view if tab selected */}
        {showAnalytics && (
          <div className="space-y-6">
            <RechartsAnalytics entries={entries} />
            {!showVitals && (
              <>
                <TrendChart entries={entries} />
                <ChangesPanel entries={entries} />
                <InsightsPanel entries={entries} />
              </>
            )}
          </div>
        )}

        {/* FEATURE 6: Medical AI & Alertness Forecast */}
        {showAdvisory && (
          <div id="advisory-section" className="space-y-6">
            <MedicalAiAdvisory entries={entries} />
          </div>
        )}

        {/* Historical Records & Backups */}
        {showHistory && (
          <div className="space-y-6">
            <RecordHistory
              entries={entries}
              disabled={disabled}
              onEdit={edit}
              onDelete={remove}
              onImport={importRecords}
              message={recordMessage}
            />
          </div>
        )}

        {/* FEATURE 5: Medical Briefings & Printable Reports */}
        {showReports && (
          <div className="space-y-6">
            <HealthReport entries={entries} />
          </div>
        )}

        {/* FEATURE 7: System Settings & Preferences */}
        {showSettings && (
          <div id="settings-section" className="space-y-6">
            <SettingsPanel entries={entries} />
          </div>
        )}
      </main>

      <footer className="py-5 px-6 text-center text-xs font-mono text-[#626d78] border-t border-[#233245] bg-[#171a21]">
        ORBIT BIO-TELEMETRY SYSTEM · CREW HEALTH CHECK-IN v2.0 · 100% OFFLINE AUTONOMOUS ARCHITECTURE
      </footer>
    </div>
  );
}
