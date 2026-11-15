import { initializeLocalRepository } from './repository.js';

export async function initializeUnifiedRepository(accountId) {
  if (typeof accountId !== 'string' || !/^(ryan|tharusha|hansaja|apurwa)$/.test(accountId)) {
    throw new Error('A valid signed-in account is required to open health records.');
  }
  const isTauriEnv =
    typeof window !== 'undefined' &&
    (Boolean(window.__TAURI_INTERNALS__) || Boolean(window.__TAURI__));

  if (isTauriEnv) {
    try {
      const { initializeTauriRepository } = await import('./tauriRepository.js');
      return await initializeTauriRepository(accountId);
    } catch (err) {
      console.warn('[ORBIT] Failed to connect to Tauri SQLite backend, falling back to IndexedDB:', err);
    }
  }

  return initializeLocalRepository(`crew:${accountId}`);
}
