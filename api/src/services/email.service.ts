import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import Handlebars from 'handlebars';
import { config } from '../config';

// ───────────────────────────────────────────────────────────────────
// Templating
// ───────────────────────────────────────────────────────────────────

type Locale = 'de' | 'en';
const DEFAULT_LOCALE: Locale = 'de';
const SUPPORTED_LOCALES: Locale[] = ['de', 'en'];

const TEMPLATES_ROOT = path.resolve(__dirname, '../../templates/emails');

interface TemplateBundle {
  subject: HandlebarsTemplateDelegate;
  bodyHtml: HandlebarsTemplateDelegate;
  bodyTxt: HandlebarsTemplateDelegate;
  footerHtml: HandlebarsTemplateDelegate;
  footerTxt: HandlebarsTemplateDelegate;
}

const layoutHtml: HandlebarsTemplateDelegate = Handlebars.compile(
  fs.readFileSync(path.join(TEMPLATES_ROOT, '_shared/layout.html.hbs'), 'utf8'),
);
const layoutTxt: HandlebarsTemplateDelegate = Handlebars.compile(
  fs.readFileSync(path.join(TEMPLATES_ROOT, '_shared/layout.txt.hbs'), 'utf8'),
);

function loadTemplate(name: string, locale: Locale): TemplateBundle {
  const dir = path.join(TEMPLATES_ROOT, name, locale);
  const read = (file: string) => fs.readFileSync(path.join(dir, file), 'utf8');
  return {
    subject: Handlebars.compile(read('subject.txt').trim()),
    bodyHtml: Handlebars.compile(read('body.html.hbs')),
    bodyTxt: Handlebars.compile(read('body.txt.hbs')),
    footerHtml: Handlebars.compile(read('footer.html.hbs')),
    footerTxt: Handlebars.compile(read('footer.txt.hbs')),
  };
}

const templateCache = new Map<string, TemplateBundle>();
function getTemplate(name: string, locale: Locale): TemplateBundle {
  const key = `${name}/${locale}`;
  if (templateCache.has(key)) return templateCache.get(key)!;
  try {
    const bundle = loadTemplate(name, locale);
    templateCache.set(key, bundle);
    return bundle;
  } catch (err) {
    if (locale !== DEFAULT_LOCALE) {
      console.warn(
        `[email] Template "${name}/${locale}" not found, falling back to ${DEFAULT_LOCALE}.`,
      );
      return getTemplate(name, DEFAULT_LOCALE);
    }
    throw err;
  }
}

function resolveLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const lc = input.toLowerCase().slice(0, 2);
  return (SUPPORTED_LOCALES as string[]).includes(lc) ? (lc as Locale) : DEFAULT_LOCALE;
}

// ───────────────────────────────────────────────────────────────────
// Transport
// ───────────────────────────────────────────────────────────────────

let transporter: Transporter | null = null;
let smtpReady = false;

function describeHost(): string {
  return `${config.smtp.host}:${config.smtp.port} (${
    config.smtp.secure ? 'SSL' : 'STARTTLS'
  }, user=${config.smtp.user || '—'})`;
}

/**
 * Initialise the SMTP transporter. Called once during boot in api/src/index.ts.
 *
 * - If SMTP_HOST is empty: enters dev fallback mode where sends are logged to
 *   stdout instead of going out — emails are no-ops, no error.
 * - Otherwise: builds the transporter and runs `verify()` so we surface
 *   misconfiguration *now*, before the first user requests a magic link.
 *
 * Never throws. The app boots regardless of SMTP state; failures show up
 * in `/api/health` and as loud log lines.
 */
export async function initEmailService(): Promise<void> {
  console.log('=== SMTP Initialization ===');

  if (!config.smtp.host) {
    console.log('SMTP host: <not configured>');
    console.log('SMTP not configured — emails will be logged to stdout (dev mode).');
    console.log('=== /SMTP ===');
    smtpReady = false;
    return;
  }

  console.log(`SMTP host: ${describeHost()}`);
  console.log('Verifying SMTP transport...');

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined,
  });

  try {
    await transporter.verify();
    smtpReady = true;
    console.log('✓ SMTP transport ready');
    console.log('=== SMTP Ready ===');
  } catch (err) {
    smtpReady = false;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ SMTP verify FAILED: ${msg}`);
    console.error('=== SMTP NOT READY — emails will fail ===');
  }
}

export function isSmtpReady(): boolean {
  return smtpReady;
}

// ───────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────

export interface SendTemplatedEmailArgs {
  to: string;
  template: 'magic-link';                  // extend as templates land
  locale?: string | null;
  variables: Record<string, unknown>;
}

/**
 * Render and send an email by template name + locale + variables.
 *
 * Resolves locale (falls back to `de`), loads the template bundle, renders
 * subject/body via Handlebars partials inside the shared layout, then sends
 * via nodemailer (or logs to stdout if SMTP isn't configured).
 */
export async function sendTemplatedEmail(args: SendTemplatedEmailArgs): Promise<void> {
  const locale = resolveLocale(args.locale);
  const tpl = getTemplate(args.template, locale);

  // Variables shared across every template
  const ctx = {
    ...args.variables,
    appUrl: config.app.publicUrl,
    appUrlDisplay: config.app.publicUrl.replace(/^https?:\/\//, ''),
    lang: locale,
  };

  const subject = tpl.subject(ctx).trim();
  const bodyHtml = tpl.bodyHtml(ctx);
  const bodyTxt = tpl.bodyTxt(ctx);
  const footerHtml = tpl.footerHtml(ctx);
  const footerTxt = tpl.footerTxt(ctx);

  const html = layoutHtml({ ...ctx, subject, body: bodyHtml, footer: footerHtml });
  const text = layoutTxt({ ...ctx, subject, body: bodyTxt, footer: footerTxt });

  if (!transporter) {
    console.log(
      `[email/dev] would send to=${args.to} subject="${subject}" template=${args.template}/${locale}`,
    );
    console.log(`[email/dev] body:\n${text}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: config.smtp.from,
      replyTo: config.smtp.replyTo,
      to: args.to,
      subject,
      text,
      html,
    });
    console.log(
      `[email] sent to=${args.to} template=${args.template}/${locale} messageId=${info.messageId}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[email] FAILED to send to=${args.to} template=${args.template}/${locale}: ${msg}`,
    );
    throw err;
  }
}
