import fs from 'node:fs';
import path from 'node:path';

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

  // Preserve errors/expenses already written
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

  const allModules = [...names, 'errors', 'expenses'].filter(
    (n, i, a) => a.indexOf(n) === i,
  );
  // Ensure errors/expenses files exist
  for (const extra of ['errors', 'expenses']) {
    const p = path.join(dir, `${extra}.ts`);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing ${p} — create errors/expenses before running`);
    }
  }

  const imports = allModules.map((n) => `import ${n} from './${n}.js';`).join('\n');
  const spread = allModules.map((n) => `  ...${n},`).join('\n');
  fs.writeFileSync(
    path.join(dir, 'index.ts'),
    `${imports}\n\nconst ${locale} = {\n${spread}\n} as const;\n\nexport default ${locale};\n`,
  );
  console.log(locale, Object.keys(dict).length, 'keys →', allModules.length, 'modules');
}

const it = JSON.parse(fs.readFileSync('scripts/.i18n-it.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('scripts/.i18n-pt.json', 'utf8'));
writeLocale('it', it);
writeLocale('pt', pt);
