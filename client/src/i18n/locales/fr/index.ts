import authentication from './authentication.js';
import calendar from './calendar.js';
import clients from './clients.js';
import common from './common.js';
import dashboard from './dashboard.js';
import errors from './errors.js';
import expenses from './expenses.js';
import invoices from './invoices.js';
import navigation from './navigation.js';
import notifications from './notifications.js';
import projects from './projects.js';
import quotes from './quotes.js';
import settings from './settings.js';
import tasks from './tasks.js';

const fr = {
  ...authentication,
  ...calendar,
  ...clients,
  ...common,
  ...dashboard,
  ...errors,
  ...expenses,
  ...invoices,
  ...navigation,
  ...notifications,
  ...projects,
  ...quotes,
  ...settings,
  ...tasks,
} as const;

export default fr;
