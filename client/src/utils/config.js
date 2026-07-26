// ─── Environment-aware Base URL ───────────────────────────────────────────────
export const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/server/ksp_datathon_function'
  : '/server/ksp_datathon_function';

export const ASTRA_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/server/project_astra_function'
  : '/server/project_astra_function';
