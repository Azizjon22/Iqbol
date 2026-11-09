import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { homedir } from 'os';

interface ServerContext {
  method: string;
  path: string;
  status: number;
  userId?: string;
  requestId?: string;
}

export interface ClientErrorReport {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
}

const MAX_LENGTH = 3500;
const SAME_ERROR_GAP_MS = 60_000;
const CLIENT_GAP_MS = 8_000;

/** "events" → what the person was doing, for the alert's first line. */
const AREA: Record<string, string> = {
  events: "To'y buyurtmalari",
  payments: "To'lovlar",
  expenses: 'Xarajatlar',
  menus: 'Menyular',
  inventory: 'Ombor',
  'shopping-lists': 'Bozorlik',
  workers: 'Ishchilar',
  'staff-users': 'Xodimlar',
  auth: 'Kirish',
  reports: 'Hisobotlar',
  settings: 'Sozlamalar',
  telegram: 'Telegram',
};

const ACTION: Record<string, string> = {
  GET: 'ochishda',
  POST: 'saqlashda',
  PATCH: "o'zgartirishda",
  PUT: "o'zgartirishda",
  DELETE: "o'chirishda",
};

/**
 * A second, separate bot that tells the developers about server errors (5xx)
 * and errors in the browser. On only when ERROR_ALERT_BOT_TOKEN and
 * ERROR_ALERT_CHAT_ID are both set; never slows down or breaks a request.
 */
@Injectable()
export class ErrorAlertsService {
  private readonly logger = new Logger(ErrorAlertsService.name);
  private readonly token: string;
  private readonly chatId: string;
  private readonly env: string;
  private readonly timeZone: string;
  private readonly lastSent = new Map<string, number>();
  private lastClientAt = 0;

  constructor(config: ConfigService) {
    this.token = config.get<string>('ERROR_ALERT_BOT_TOKEN', '').trim();
    this.chatId = config.get<string>('ERROR_ALERT_CHAT_ID', '').trim();
    this.env = config.get<string>('NODE_ENV') || 'development';
    this.timeZone = config.get<string>('TELEGRAM_TIMEZONE') || 'Asia/Tashkent';
  }

  get enabled() {
    return Boolean(this.token && this.chatId) && this.env !== 'test';
  }

  report(exception: unknown, ctx: ServerContext) {
    if (!this.enabled) return;
    const err =
      exception instanceof Error ? exception : new Error(String(exception));
    const signature = `S:${ctx.method} ${ctx.path.replace(/[0-9a-z]{20,}/g, ':id')}:${err.message}`;
    if (!this.allow(signature)) return;
    const area = ctx.path.replace(/^\/api\//, '').split('/')[0] ?? '';
    const human = `${AREA[area] ?? "So'rovni"} ${ACTION[ctx.method] ?? 'bajarishda'} xatolik yuz berdi`;
    this.send(
      [
        `${this.layer(err)}`,
        `❗ ${human}`,
        '',
        `${ctx.method} ${ctx.path} → ${ctx.status}`,
        `${err.name}: ${err.message}`,
        '',
        this.meta(ctx.userId, ctx.requestId),
        this.shortStack(err.stack),
      ].join('\n'),
    );
  }

  reportClient(report: ClientErrorReport, userId?: string) {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastClientAt < CLIENT_GAP_MS) return;
    if (!this.allow(`C:${report.url ?? ''}:${report.message}`)) return;
    this.lastClientAt = now;
    this.send(
      [
        '📱 FRONTEND',
        `❗ Sahifada xatolik yuz berdi`,
        '',
        report.url ? `Sahifa: ${report.url}` : '',
        `Xato: ${report.message}`,
        report.userAgent ? `Qurilma: ${this.device(report.userAgent)}` : '',
        '',
        this.meta(userId),
        this.shortStack(report.stack),
      ]
        .filter((line, i, all) => line !== '' || all[i - 1] !== '')
        .join('\n'),
    );
  }

  private allow(signature: string) {
    const now = Date.now();
    if (this.lastSent.size > 200) this.lastSent.clear();
    const last = this.lastSent.get(signature);
    if (last && now - last < SAME_ERROR_GAP_MS) return false;
    this.lastSent.set(signature, now);
    return true;
  }

  private layer(err: Error) {
    const text = `${err.name} ${err.message} ${(err as { code?: string }).code ?? ''}`;
    if (/Prisma|\bP\d{4}\b/.test(text)) return "🖥 SERVER — ma'lumotlar bazasi";
    if (/redis/i.test(text)) return '🖥 SERVER — Redis';
    if (/\bS3\b|minio|R2|bucket/i.test(text)) return '🖥 SERVER — fayl ombori';
    if (
      /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|EAI_AGAIN|fetch failed/.test(
        text,
      )
    ) {
      return '🖥 SERVER — tashqi xizmat';
    }
    return '⚙️ BACKEND — dastur kodi';
  }

  private meta(userId?: string, requestId?: string) {
    const time = new Date().toLocaleString('ru-RU', {
      timeZone: this.timeZone,
    });
    return [
      `Muhit: ${this.env}`,
      `Vaqt: ${time}`,
      userId ? `Foydalanuvchi: ${userId}` : '',
      requestId ? `So'rov: ${requestId}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private shortStack(stack?: string) {
    if (!stack) return '';
    const home = homedir();
    const lines = stack
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.includes('node_modules'))
      .slice(0, 6)
      .map((l) => (home ? l.split(home).join('~') : l));
    return lines.length ? `\n${lines.join('\n')}` : '';
  }

  private device(ua: string) {
    const browser = /Edg\//.test(ua)
      ? 'Edge'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'brauzer';
    const os = /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : '';
    return (
      [browser, os].filter(Boolean).join(', ') +
      (/Telegram/i.test(ua) ? ' (Telegram)' : '')
    );
  }

  /** Fire-and-forget; 10 seconds at most. */
  private send(text: string) {
    void fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: text.slice(0, MAX_LENGTH),
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch((err: Error) =>
      this.logger.warn(`Xato xabari yuborilmadi: ${err.message}`),
    );
  }
}
