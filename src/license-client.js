const LICENSE_API = 'https://ifeuwmodcrjyjzkunfyr.supabase.co/functions/v1/license-api';
const INSTALLATION_KEY = 'rancut.installation.id';
const SAVED_LICENSE_KEY = 'rancut.license.key';
const APP_VERSION = '0.5.8';

function store() {
  if (!globalThis.localStorage) throw new Error('Local app storage is unavailable.');
  return globalThis.localStorage;
}

function newInstallationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${uuid}-${uuid}`;
  const bytes = new Uint8Array(48);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return `rancut-${Date.now()}-${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function installationId() {
  const saved = store().getItem(INSTALLATION_KEY);
  if (saved && saved.length >= 32) return saved;
  const id = newInstallationId();
  store().setItem(INSTALLATION_KEY, id);
  return id;
}

async function request(action, extra = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(LICENSE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, installationHash: installationId(), appVersion: APP_VERSION, ...extra }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || `License service returned ${response.status}`);
      error.code = data.code;
      throw error;
    }
    if (!data || data.ok !== true ||
        (action === 'consume_trial' && typeof data.allowed !== 'boolean') ||
        (action === 'license_status' && typeof data.active !== 'boolean') ||
        (action === 'activate' && (!data.activationId || !data.expiresAt || !Number.isFinite(Date.parse(data.expiresAt))))) {
      throw new Error('Invalid response from license service. Please try again.');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Help can render without browser storage. Authorization still requires
// persistent storage through installationId(); it never falls back to access.
export function getSavedLicenseKey() {
  try { return globalThis.localStorage?.getItem(SAVED_LICENSE_KEY) || ''; }
  catch { return ''; }
}
export function clearSavedLicenseKey() { store().removeItem(SAVED_LICENSE_KEY); }
export function consumeTrialAutoEdit() { return request('consume_trial'); }

export async function activateLicense(licenseKey, deviceLabel = 'RanCut Windows') {
  const key = String(licenseKey || '').trim().toUpperCase();
  if (!key) throw new Error('Enter a license key first.');
  const result = await request('activate', { licenseKey: key, deviceLabel });
  store().setItem(SAVED_LICENSE_KEY, key);
  return { ...result, active: true };
}

export function checkLicenseStatus() {
  const key = getSavedLicenseKey();
  if (!key) return Promise.resolve({ ok: true, active: false, plan: null, expiresAt: null });
  return request('license_status', { licenseKey: key });
}

export async function authorizeAutoEdit() {
  const status = await checkLicenseStatus();
  if (status.active) return { ...status, allowed: true, licensed: true };
  const trial = await consumeTrialAutoEdit();
  return { ...trial, licensed: false };
}
