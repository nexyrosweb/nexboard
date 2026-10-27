import fs from 'node:fs';
import path from 'node:path';

function loadLocale(loc) {
  const dir = path.join('client/src/i18n/locales', loc);
  const dict = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts') && x !== 'index.ts')) {
    const body = fs.readFileSync(path.join(dir, f), 'utf8');
    const re = /'([^']+)':\s*((?:"(?:\\.|[^"])*")|(?:'(?:\\.|[^'])*'))/g;
    let m;
    while ((m = re.exec(body))) {
      let v = m[2];
      if (v.startsWith('"')) v = JSON.parse(v);
      else v = v.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      dict[m[1]] = v;
    }
  }
  return dict;
}

const pack = { en: loadLocale('en'), fr: loadLocale('fr'), es: loadLocale('es'), de: loadLocale('de') };
fs.writeFileSync('scripts/.i18n-pack.json', JSON.stringify(pack));
console.log(Object.keys(pack.en).length);
