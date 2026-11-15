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
import { useMeasurementAdvisory, WarningSummary } from './components/MeasurementWarnings.jsx';
import RechartsAnalytics from './components/RechartsAnalytics.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import BreathingGuide from './components/BreathingGuide.jsx';
import LoginPage from './components/LoginPage.jsx';
import { DEMO_CREW, isDemoCrewId } from './auth/demoAccounts.js';

const isTestEnv = typeof window !== 'undefined' && (window.IS_REACT_ACT_ENVIRONMENT || globalThis.IS_REACT_ACT_ENVIRONMENT);

const LOGIN_SESSION_KEY = 'orbit-demo-account';
const TEST_ACCOUNT = { id: 'ryan', name: 'Ryan' };

function readLoginSession() {
  try {
    const id = window.sessionStorage.getItem(LOGIN_SESSION_KEY);
    const crew = DEMO_CREW.find((item) => item.id === id);
    return isDemoCrewId(id) ? { id: crew.id, name: crew.name } : null;
  } catch { return null; }
}

function OrbitWorkspace({ repositoryFactory, account, onLogout }) {
  const [activeTab, setActiveTab] = useState(isTestEnv ? 'all' : 'vitals');
  const [saved, setSaved] = useState(null);
  const [entries, setEntries] = useState([]);
  const measurementAssessment = useMeasurementAdvisory(entries);
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
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const todayLabel = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

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
        setStoreEntries([]);
        repo = await repositoryFactory(account.id);
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
        setStoreEntries(snapshot.entries);
        if (snapshot.stats) {
          setDbStats(snapshot.stats);
          setStoreStorageStats(snapshot.stats);
        }
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
  }, [repositoryFactory, account.id]);

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
  const showVitals = isAll || activeTab === 'vitals' || activeTab === 'health';
  const showRealtime = isAll || activeTab === 'realtime';
  const showCognitive = isAll || activeTab === 'cognitive';
  const showAnalytics = isAll || activeTab === 'analytics';
  const showReports = isAll || activeTab === 'reports';
  const showAdvisory = isAll || activeTab === 'advisory';
  const showHistory = isAll || activeTab === 'vitals' || activeTab === 'health';

  return (
    <div className="orbit-app min-h-screen bg-[#171a21] text-[#c6d4df] flex flex-col font-sans">
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pending}
        storageError={storageError}
        accountName={account.name}
        onLogout={onLogout}
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-5 sm:px-8 py-7 space-y-6">
        {/* A calm overview with a clear next step and no invented mission data. */}
        {showVitals && (
          <section className="overview-hero" aria-labelledby="overview-title">
            <div className="overview-copy">
              <p className="overview-eyebrow">ORBIT · CREW WELLNESS</p>
              <h1 id="overview-title">{greeting}, {account.name}.</h1>
              <p>Your personal health overview, kept on this device. Take a moment to check in with yourself.</p>
              <div className="overview-meta">
                <span>{todayLabel}</span>
                <span>{entries.length ? `Last check-in ${formatDate(entries[0].time)}` : 'No check-ins recorded yet'}</span>
              </div>
            </div>
            <a className="overview-cta" href="#check-in">Record a check-in <span aria-hidden="true">→</span></a>
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

        {!loading && !storageError && <WarningSummary result={measurementAssessment} onOpen={() => setActiveTab('advisory')} />}

        {/* FEATURE 1: Daily Routine & Baseline Metric Cards */}
        {showVitals && (
          <div className="space-y-6">
            <MetricCards entries={entries} />
            <DailyChecklist entries={entries} />
          </div>
        )}

        {/* FEATURE 2: Real-Time Physiological Telemetry (ECG / rPPG / Sensors) */}
        {showRealtime && (
          <div id="realtime-section" className="space-y-6">
            <RealtimeMonitor />
          </div>
        )}

        {/* FEATURE 3: Cognitive Fitness & Mental Health Mini-Games */}
        {showCognitive && !isTestEnv && (
          <div id="cognitive-section" className="space-y-6">
            {typeof repoRef.current?.cognitiveSessions === 'function' ? (
              <CognitiveGames repository={repoRef.current} onSaved={refresh} />
            ) : (
              <p role="status">Cognitive activities require browser storage and are not available in the desktop SQLite workspace yet. Health check-ins remain available.</p>
            )}
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

        {/* FEATURE 6: Recorded Data Review & Illustrative Simulation */}
        {showAdvisory && (
          <div id="advisory-section" className="space-y-6">
            <MedicalAiAdvisory entries={entries} assessment={measurementAssessment} />
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

        {/* A quiet breathing exercise belongs with the wellbeing activities. */}
        {showCognitive && <BreathingGuide />}

        {/* FEATURE 5: Medical Briefings & Printable Reports */}
        {showReports && (
          <div className="space-y-6">
            <HealthReport entries={entries} />
          </div>
        )}

        {/* FEATURE 7: System Settings & Preferences */}
        {showSettings && (
          <div id="settings-section" className="space-y-6">
            <SettingsPanel entries={entries} accountId={account.id} accountName={account.name} onOpenHistory={() => setActiveTab('vitals')} />
          </div>
        )}
      </main>

      <footer className="py-5 px-6 text-center text-xs font-mono text-[#626d78] border-t border-[#233245] bg-[#171a21]">
        ORBIT · LOCAL CREW HEALTH CHECK-IN PROTOTYPE
      </footer>
    </div>
  );
}

export default function App({ repositoryFactory = initializeUnifiedRepository }) {
  const [account, setAccount] = useState(() => isTestEnv ? TEST_ACCOUNT : readLoginSession());
  if (!account) {
    return <LoginPage onLogin={(nextAccount) => {
      try { window.sessionStorage.setItem(LOGIN_SESSION_KEY, nextAccount.id); } catch { /* login remains active for this page session */ }
      setAccount(nextAccount);
    }} />;
  }
  return <OrbitWorkspace
    key={account.id}
    account={account}
    repositoryFactory={repositoryFactory}
    onLogout={() => {
      try { window.sessionStorage.removeItem(LOGIN_SESSION_KEY); } catch { /* ignore unavailable storage */ }
      setAccount(null);
    }}
  />;
}
