/*
This script is used to bump the version of the project.
It is used to bump the version of the project.

Examples:
  bun run bump patch
  bun run bump minor
  bun run bump major
  bun run bump 1.1.0
*/

const fs = require('fs');
const path = require('path');

// Get version from command line argument or environment variable
const versionArg = process.argv[2] || process.env.TAG_NAME;

// Read current version first to allow auto-incrementing
let currentVersion = '0.1.0';
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  currentVersion = pkg.version;
}

if (!versionArg) {
  console.error(
    'Error: Please specify a version or increment type (major, minor, patch).'
  );
  console.error(
    'Examples:\n  bun run bump patch\n  bun run bump minor\n  bun run bump major\n  bun run bump 1.1.0'
  );
  process.exit(1);
}

let version = versionArg;

// If the argument is an increment type (major, minor, patch)
const semverRegex = /^(\d+)\.(\d+)\.(\d+)(.*)$/;
const isIncrement = ['major', 'minor', 'patch'].includes(
  versionArg.toLowerCase()
);

if (isIncrement) {
  const match = currentVersion.match(semverRegex);
  if (!match) {
    console.error(
      `Error: Current version "${currentVersion}" in package.json is not valid semver. Cannot auto-increment.`
    );
    process.exit(1);
  }

  let major = parseInt(match[1], 10);
  let minor = parseInt(match[2], 10);
  let patch = parseInt(match[3], 10);
  const extra = match[4] || '';

  const type = versionArg.toLowerCase();
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else if (type === 'patch') {
    patch += 1;
  }

  version = `${major}.${minor}.${patch}${extra}`;
  console.log(`Auto-incrementing ${type}: ${currentVersion} -> ${version}...`);
} else {
  // Strip leading 'v' if present (e.g. v1.1.0 -> 1.1.0)
  version = version.replace(/^v/, '');
  console.log(`Bumping project version to ${version}...`);
}

// 1. Update package.json
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`- Updated package.json version to ${version}`);
} else {
  console.warn(`- Warning: package.json not found at ${packageJsonPath}`);
}

// 2. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = version;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`- Updated tauri.conf.json version to ${version}`);
} else {
  console.warn(`- Warning: tauri.conf.json not found at ${tauriConfPath}`);
}

// 3. Update src-tauri/Cargo.toml
const cargoTomlPath = path.join(__dirname, '../src-tauri/Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  const cargo = fs.readFileSync(cargoTomlPath, 'utf8');
  const lines = cargo.split('\n');
  let currentSection = '';
  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed;
    }
    if (
      currentSection === '[package]' &&
      (trimmed.startsWith('version =') || trimmed.startsWith('version='))
    ) {
      const match = line.match(/^(\s*version\s*=\s*")[^"]*(")/);
      if (match) {
        return `${match[1]}${version}${match[2]}`;
      }
    }
    return line;
  });
  fs.writeFileSync(cargoTomlPath, updatedLines.join('\n'));
  console.log(`- Updated src-tauri/Cargo.toml version to ${version}`);
} else {
  console.warn(`- Warning: Cargo.toml not found at ${cargoTomlPath}`);
}

console.log(`\nVersion bump complete!`);
console.log(`Next steps to release:`);
console.log(`  1. git add .`);
console.log(`  2. git commit -m "chore: bump version to ${version}"`);
console.log(`  3. git tag v${version}`);
console.log(`  4. git push origin main --tags`);
