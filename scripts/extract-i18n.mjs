import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync('client/src/i18n/translations.ts', 'utf8');

function extractDict(name) {
  const re =
    name === 'en'
      ? /const en = \{([\s\S]*?)\} as const;/
      : new RegExp(`const ${name}: Record<TranslationKey, string> = \\{([\\s\\S]*?)\\};`);
  const m = src.match(re);
  if (!m) throw new Error('missing ' + name);
  const body = m[1];
  const entries = [];
  const entryRe = /'([^']+)':\s*((?:'(?:\\.|[^'])*')|(?:"(?:\\.|[^"])*"))/g;
  let match;
  while ((match = entryRe.exec(body))) {
    const key = match[1];
    let val = match[2];
    if (val.startsWith("'")) {
      val = val
        .slice(1, -1)
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
    } else {
      val = JSON.parse(val);
    }
    entries.push([key, val]);
  }
  return Object.fromEntries(entries);
}

function moduleOf(key) {
  const p = key.split('.')[0];
  const map = {
    nav: 'navigation',
    common: 'common',
    doc: 'common',
    status: 'common',
    priority: 'common',
    dash: 'dashboard',
    clients: 'clients',
    projects: 'projects',
    quotes: 'quotes',
    invoices: 'invoices',
    tasks: 'tasks',
    calendar: 'calendar',
    settings: 'settings',
    notif: 'notifications',
    auth: 'authentication',
  };
  return map[p] || 'common';
}

function writeLocale(locale, dict) {
  const modules = {};
  for (const [k, v] of Object.entries(dict)) {
    const mod = moduleOf(k);
    if (!modules[mod]) modules[mod] = {};
    modules[mod][k] = v;
  }
  const dir = path.join('client/src/i18n/locales', locale);
  fs.mkdirSync(dir, { recursive: true });
  const names = Object.keys(modules).sort();
  for (const name of names) {
    const lines = Object.entries(modules[name])
      .map(([k, v]) => `  '${k}': ${JSON.stringify(v)},`)
      .join('\n');
    fs.writeFileSync(
      path.join(dir, `${name}.ts`),
      `/** ${locale} / ${name} */\nexport default {\n${lines}\n} as const;\n`,
    );
  }
  const imports = names.map((n) => `import ${n} from './${n}.js';`).join('\n');
  const spread = names.map((n) => `  ...${n},`).join('\n');
  fs.writeFileSync(
    path.join(dir, 'index.ts'),
    `${imports}\n\nconst ${locale} = {\n${spread}\n} as const;\n\nexport default ${locale};\n`,
  );
  console.log(locale, Object.keys(dict).length, 'keys', names.length, 'modules');
  return dict;
}

const en = writeLocale('en', extractDict('en'));
writeLocale('fr', extractDict('fr'));
writeLocale('es', extractDict('es'));
writeLocale('de', extractDict('de'));

fs.writeFileSync(
  'scripts/.i18n-en-keys.json',
  JSON.stringify(Object.keys(en), null, 2),
);
console.log('done');
