/**
 * Temporary IT/PT from English so the app builds while proper translations land.
 * Overwritten by write-it-pt-modules.mjs when .i18n-it.json / .i18n-pt.json exist.
 */
import fs from 'node:fs';
import path from 'node:path';

function copyLocale(from, to) {
  const src = path.join('client/src/i18n/locales', from);
  const dest = path.join('client/src/i18n/locales', to);
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const body = fs
      .readFileSync(path.join(src, f), 'utf8')
      .replace(`/** ${from} /`, `/** ${to} /`)
      .replace(`const ${from} = {`, `const ${to} = {`);
    fs.writeFileSync(path.join(dest, f), body);
  }
  console.log('bootstrapped', to);
}

copyLocale('en', 'it');
copyLocale('en', 'pt');
