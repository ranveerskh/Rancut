const LICENSE_API = 'https://ifeuwmodcrjyjzkunfyr.supabase.co/functions/v1/license-api';
const INSTALLATION_KEY = 'rancut.installation.id';
const SAVED_LICENSE_KEY = 'rancut.license.key';
const APP_VERSION = '0.6.1';

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

export async function request(action, extra = {}) {
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
        (action === 'account_status' && typeof data.trialActive !== 'boolean') ||
        (action === 'license_status' && typeof data.active !== 'boolean') ||
        (action === 'activate' && (!data.activationId || !data.expiresAt || !Number.isFinite(Date.parse(data.expiresAt)))) ||
        (action === 'submit_feedback' && (!data.feedback || typeof data.feedback.id !== 'string'))) {
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
export function checkAccountStatus() {
  const key = getSavedLicenseKey();
  return request('account_status', key ? { licenseKey: key } : {});
}

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

export async function submitFeedback({ type = 'Feature request', message = '', diagnostics = {}, submissionId } = {}) {
  const feedbackType = type === 'Bug report' ? 'bug' : type === 'Feature request' ? 'feature' : '';
  const detail = String(message || '').trim();
  if (!feedbackType) throw new Error('Choose Feature request or Bug report.');
  if (detail.length < 5) throw new Error('Please add a little more detail before submitting.');
  const context = {
    version: APP_VERSION,
    encoder: typeof diagnostics.encoder === 'string' ? diagnostics.encoder.slice(0, 80) : null,
    mode: typeof diagnostics.mode === 'string' ? diagnostics.mode.slice(0, 40) : null,
    renderer: typeof diagnostics.renderer === 'string' ? diagnostics.renderer.slice(0, 160) : null,
    clips: Number.isFinite(diagnostics.clips) ? diagnostics.clips : null,
    missing: Number.isFinite(diagnostics.missing) ? diagnostics.missing : null,
  };
  const result = await request('submit_feedback', { feedbackType, message: detail.slice(0, 4000), appContext: context, submissionId });
  return result.feedback;
}

export async function authorizeAutoEdit() {
  await globalThis.window?.rancut?.assertUpdateAllowed?.();
  const legacy = await checkLicenseStatus();
  if (legacy.active) return { ...legacy, allowed: true, licensed: true };
  const trial = await consumeTrialAutoEdit();
  return { ...trial, licensed: false, trialActive: Boolean(trial.trialActive) };
}
