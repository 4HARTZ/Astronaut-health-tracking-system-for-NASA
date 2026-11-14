import { initializeLocalRepository } from './repository.js';

export async function initializeUnifiedRepository() {
  const isTauriEnv =
    typeof window !== 'undefined' &&
    (Boolean(window.__TAURI_INTERNALS__) || Boolean(window.__TAURI__));

  if (isTauriEnv) {
    try {
      const { initializeTauriRepository } = await import('./tauriRepository.js');
      return await initializeTauriRepository();
    } catch (err) {
      console.warn('[ORBIT] Failed to connect to Tauri SQLite backend, falling back to IndexedDB:', err);
    }
  }

  return initializeLocalRepository();
}
