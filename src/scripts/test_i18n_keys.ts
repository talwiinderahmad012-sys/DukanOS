import fs from 'fs';
import path from 'path';

function run() {
  console.log('--- Checking i18n Translation Keys ---');
  let passed = true;

  const enPath = path.resolve('src/lib/i18n/locales/en/auth.json');
  const urPath = path.resolve('src/lib/i18n/locales/ur/auth.json');

  if (!fs.existsSync(enPath) || !fs.existsSync(urPath)) {
    console.error('Translation files missing!');
    process.exit(1);
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const urData = JSON.parse(fs.readFileSync(urPath, 'utf8'));

  const enKeys = Object.keys(enData);
  const urKeys = Object.keys(urData);

  // Check REQUIRED keys for Auth/Login
  const requiredKeys = ['emailLabel', 'emailPlaceholder', 'identifierLabel', 'identifierPlaceholder'];
  for (const key of requiredKeys) {
    if (!enKeys.includes(key)) {
      console.error(`ERROR: Missing required key '${key}' in English auth.json`);
      passed = false;
    }
    if (!urKeys.includes(key)) {
      console.error(`ERROR: Missing required key '${key}' in Urdu auth.json`);
      passed = false;
    }
  }

  // Check matching keys
  const missingInUrdu = enKeys.filter((k) => !urKeys.includes(k));
  const missingInEnglish = urKeys.filter((k) => !enKeys.includes(k));

  if (missingInUrdu.length > 0) {
    console.error('ERROR: Urdu translation missing keys:', missingInUrdu);
    passed = false;
  }
  if (missingInEnglish.length > 0) {
    console.error('ERROR: English translation missing keys:', missingInEnglish);
    passed = false;
  }

  if (passed) {
    console.log('✅ All required translation keys are present and synchronized.');
  } else {
    console.error('❌ Translation key mismatch or missing required keys.');
    process.exit(1);
  }
}

run();
