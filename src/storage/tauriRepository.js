import { sortEntries, valid } from '../health.js';

export async function initializeTauriRepository(accountId) {
  if (typeof accountId !== 'string' || !/^(ryan|tharusha|hansaja|apurwa)$/.test(accountId)) {
    throw new Error('A valid signed-in account is required to open health records.');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  const listeners = new Set();

  function notify() {
    for (const listener of listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Tauri repo listener error:', err);
      }
    }
  }

  async function snapshot() {
    const rawEntries = await invoke('db_get_entries', { accountId });
    const stats = await invoke('db_get_stats', { accountId });

    // Ensure numeric types and null values match frontend expectations
    const entries = sortEntries(rawEntries.map((e) => ({
      ...e,
      heartRate: e.heartRate == null ? null : Number(e.heartRate),
      systolic: e.systolic == null ? null : Number(e.systolic),
      diastolic: e.diastolic == null ? null : Number(e.diastolic),
      temperature: e.temperature == null ? null : Number(e.temperature),
      sleep: e.sleep == null ? null : Number(e.sleep),
      quality: e.quality == null ? null : Number(e.quality),
      mood: e.mood == null ? null : Number(e.mood),
      stress: e.stress == null ? null : Number(e.stress),
      spO2: e.spO2 == null ? null : Number(e.spO2),
      respiration: e.respiration == null ? null : Number(e.respiration),
      urineColor: e.urineColor == null ? null : Number(e.urineColor),
      submittedAt: e.submittedAt || null,
      simulated: e.simulated === true,
      notes: e.notes || '',
    })));

    const revisions = Object.fromEntries(entries.map((e) => [e.id, 1]));

    return {
      entries,
      revisions,
      pending: stats.pendingOutbox,
      stats: {
        ...stats,
        isNativeSqlite: true,
      },
    };
  }

  async function save(entry, _expectedRevision = null) {
    if (!valid(entry)) throw Error('Invalid check-in.');
    await invoke('db_save_entry', {
      accountId,
      entry: {
        ...entry,
        notes: entry.notes || '',
      },
    });
    notify();
  }

  async function remove(id, _expectedRevision = null) {
    const removed = await invoke('db_delete_entry', { accountId, id });
    if (!removed) throw Error('Record not found or already deleted.');
    notify();
  }

  async function importBackup(backup) {
    const rawList = Array.isArray(backup) ? backup : backup.entries;
    if (!Array.isArray(rawList)) {
      throw Error('Invalid backup format: expected array of records or { entries: [...] }');
    }

    const cleanList = rawList.map((e) => ({
      ...e,
      id: e.id || crypto.randomUUID(),
      time: e.time || new Date().toISOString(),
      context: e.context || 'Resting',
      notes: e.notes || '',
      heartRate: e.heartRate == null ? null : Number(e.heartRate),
      systolic: e.systolic == null ? null : Number(e.systolic),
      diastolic: e.diastolic == null ? null : Number(e.diastolic),
      temperature: e.temperature == null ? null : Number(e.temperature),
      sleep: e.sleep == null ? null : Number(e.sleep),
      quality: e.quality == null ? null : Number(e.quality),
      mood: e.mood == null ? null : Number(e.mood),
      stress: e.stress == null ? null : Number(e.stress),
      spO2: e.spO2 == null ? null : Number(e.spO2),
      respiration: e.respiration == null ? null : Number(e.respiration),
      urineColor: e.urineColor == null ? null : Number(e.urineColor),
      submittedAt: e.submittedAt || null,
      simulated: e.simulated === true,
    }));

    const result = await invoke('db_import_backup', { accountId, entries: cleanList });
    notify();
    return result;
  }

  async function getStats() {
    return invoke('db_get_stats', { accountId });
  }

  async function getSystemInfo() {
    return invoke('get_system_info');
  }

  return {
    workspace: `sqlite-${accountId}`,
    isTauri: true,
    snapshot,
    save,
    remove,
    importBackup,
    getStats,
    getSystemInfo,
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    close() {
      listeners.clear();
    },
  };
}
