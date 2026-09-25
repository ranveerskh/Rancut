const fs = require('node:fs');
const path = require('node:path');
const version = process.env.RELEASE_VERSION;
if (!/^\d+\.\d+\.\d+$/.test(version || '')) throw Error('Use a version like 0.6.5');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const previous = pkg.version;
if (!lock.packages?.['']) throw Error('Expected a lockfile with root package metadata.');
pkg.version = lock.version = lock.packages[''].version = version;
// Existing editor versions embed the release number in these six UI/runtime files.
// Update only the exact previous version, without changing dependencies or tests.
for (const name of ['UpdatePanel.jsx','license-client.js','ProjectHome.jsx','timeline.js','HelpPanel.jsx','main.jsx']) {
 const file = path.join('src', name);
 const content = fs.readFileSync(file, 'utf8');
 const pattern = new RegExp('(?<![0-9.])' + previous.replace(/\./g, '\\.') + '(?![0-9.])', 'g');
 let updated = content.replace(pattern, version);
 if (name === 'HelpPanel.jsx') updated = updated.replace(/Build \d+/g, `Build ${version}`);
 fs.writeFileSync(file, updated);
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
console.log(`Release metadata and editor labels set to ${version}`);
