export const DEMO_CREW = Object.freeze([
  { id: 'ryan', name: 'Ryan', password: '1234' },
  { id: 'tharusha', name: 'Tharusha', password: '1234' },
  { id: 'hansaja', name: 'Hansaja', password: '1234' },
  { id: 'apurwa', name: 'Apurwa', password: '1234' },
]);

export function authenticateCrew(username, password) {
  const normalized = String(username || '').trim().toLowerCase();
  const account = DEMO_CREW.find((crew) => crew.id === normalized);
  return account && account.password === String(password) ? { id: account.id, name: account.name } : null;
}

export function isDemoCrewId(id) {
  return DEMO_CREW.some((crew) => crew.id === id);
}
