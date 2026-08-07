import nodemailer from 'nodemailer';
import { getSetting } from './app.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function readSmtpConfig(): SmtpConfig {
  return {
    host: getSetting('smtp_host'),
    port: Number(getSetting('smtp_port', '587')) || 587,
    secure: getSetting('smtp_secure', 'false') === 'true',
    user: getSetting('smtp_user'),
    pass: getSetting('smtp_pass'),
    from: getSetting('smtp_from') || getSetting('company_email') || 'nexboard@localhost',
  };
}

export function isSmtpConfigured(cfg = readSmtpConfig()): boolean {
  return Boolean(cfg.host && cfg.from);
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const cfg = readSmtpConfig();
  if (!isSmtpConfigured(cfg)) {
    throw new Error('SMTP non configuré. Renseignez l’hôte et l’expéditeur dans Paramètres.');
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });

  await transporter.sendMail({
    from: cfg.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function verifySmtp(): Promise<void> {
  const cfg = readSmtpConfig();
  if (!cfg.host) throw new Error('Hôte SMTP manquant');

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });

  await transporter.verify();
}
