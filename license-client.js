const LICENSE_API =
  'https://ifeuwmodcrjyjzkunfyr.supabase.co/functions/v1/license-api';

const INSTALLATION_KEY = 'rancut.installation.id';
const LICENSE_KEY = 'rancut.license.key';
const APP_VERSION = '0.5.8';

function storage() {
  return globalThis.localStorage;
}

function installationId() {
  let id = storage().getItem(INSTALLATION_KEY);

  if (!id) {
    id = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    storage().setItem(INSTALLATION_KEY, id);
  }

  return id;
}

async function request(action, extra = {}) {
  const response = await fetch(LICENSE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      installationHash: installationId(),
      appVersion: APP_VERSION,
      ...extra,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'License service error');
    error.code = data.code;
    throw error;
  }

  return data;
}

export function consumeTrialAutoEdit() {
  return request('consume_trial');
}

export function activateLicense(licenseKey, deviceLabel = 'RanCut Windows') {
  const key = licenseKey.trim().toUpperCase();
  storage().setItem(LICENSE_KEY, key);

  return request('activate', {
    licenseKey: key,
    deviceLabel,
  });
}

export function checkLicenseStatus() {
  const key = storage().getItem(LICENSE_KEY);
  if (!key) return Promise.resolve({ ok: true, active: false });
  return request('license_status', { licenseKey: key });
}

export function getSavedLicenseKey() {
  return storage().getItem(LICENSE_KEY) || '';
}

export function clearSavedLicenseKey() {
  storage().removeItem(LICENSE_KEY);
}