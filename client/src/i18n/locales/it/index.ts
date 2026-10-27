import authentication from './authentication.js';
import calendar from './calendar.js';
import clients from './clients.js';
import common from './common.js';
import dashboard from './dashboard.js';
import invoices from './invoices.js';
import navigation from './navigation.js';
import notifications from './notifications.js';
import projects from './projects.js';
import quotes from './quotes.js';
import settings from './settings.js';
import tasks from './tasks.js';
import errors from './errors.js';
import expenses from './expenses.js';

const it = {
  ...authentication,
  ...calendar,
  ...clients,
  ...common,
  ...dashboard,
  ...invoices,
  ...navigation,
  ...notifications,
  ...projects,
  ...quotes,
  ...settings,
  ...tasks,
  ...errors,
  ...expenses,
} as const;

export default it;
