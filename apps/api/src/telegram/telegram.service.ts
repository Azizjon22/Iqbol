import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { netPaid } from '../common/money/net-paid';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthPayload } from '../common/types/auth-payload';
import {
  BOT_TEXT,
  dayMonth,
  hourMinute,
  langFromTelegram,
  langOf,
  money,
  shortDate,
  type Command,
  type Lang,
} from './bot-text';
import {
  REPORT_KINDS,
  REPORT_PERIODS,
  ReportsService,
  type ReportFile,
  type ReportKind,
  type ReportPeriod,
} from '../reports/reports.service';

interface TgMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  text?: string;
  contact?: { phone_number: string };
}

interface LinkButton {
  text: string;
  url: string;
}

interface TgCallback {
  id: string;
  from: { id: number; language_code?: string };
  message?: { chat: { id: number; type: string } };
  data?: string;
}

/** A sent message, kept so it can be edited when the list changes. */
interface MessageRef {
  chatId: string;
  messageId: number;
}

/** Stored on the list: the super admins' copies of each announcement. */
interface ListMessages {
  purchased?: MessageRef[];
}

const LIST_INCLUDE = {
  items: { orderBy: { name: 'asc' as const } },
  createdByWorker: { select: { fullName: true, telegramChatId: true } },
  event: {
    select: {
      id: true,
      clientName: true,
      clientNameRu: true,
      eventDate: true,
      guestCount: true,
    },
  },
};

/** A chat's linked account, as the bot needs it to pick commands. */
interface Account {
  kind: 'STAFF' | 'WORKER';
  id: string;
  fullName: string;
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'ZAVZAL';
  lang: Lang;
}

/** What the bot reads of an account; `language` becomes `lang`. */
const ACCOUNT_SELECT = { id: true, fullName: true, language: true } as const;

function toAccount<
  T extends {
    id: string;
    fullName: string;
    language: string;
    role?: Account['role'];
  },
>(kind: Account['kind'], row: T): Account {
  return {
    kind,
    id: row.id,
    fullName: row.fullName,
    role: row.role,
    lang: langOf(row.language),
  };
}

/**
 * What each account may ask the bot for, checked against the database on
 * every message. Money (reports, archive) is for super admins only.
 */
function commandsFor(account: Account): Command[] {
  const list: Command[] = ['toylar', 'tekshir'];
  if (account.kind === 'WORKER' || account.role !== 'ZAVZAL')
    list.push('ombor');
  if (account.role === 'SUPER_ADMIN') list.push('hisobot', 'arxiv', 'toy');
  list.push('chiqish');
  return list;
}

function commandLines(account: Account) {
  const text = BOT_TEXT[account.lang];
  return commandsFor(account)
    .map((c) => `/${c} — ${text.commands[c]}`)
    .join('\n');
}

/** Where a chat is in the "phone, then code" linking conversation. */
type Pending =
  { step: 'PHONE' } | { step: 'CODE'; phone: string; kind: 'WORKER' | 'STAFF' };

function fmtQty(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "901234567" / "998901234567" / "+998 90 123 45 67" -> "+998901234567". */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/**
 * The hall's internal Telegram bot, run inside the API by long polling (no
 * webhook, so it works from localhost; one API process per bot token).
 *
 * - Linking: the profile's one-time t.me link (15 minutes), a password/PIN
 *   sign-in inside the mini app, or phone + password in the bot itself.
 *   Every linked chat gets its own command list for its role.
 * - Commands: /toylar, /tekshir, /ombor; super admins also /hisobot, /arxiv
 *   and /toy (PDFs). Rights are read from the database on every message.
 * - At TELEGRAM_REMINDER_TIMES chefs are reminded about tomorrow's weddings
 *   with no shopping list, super admins about lists they have not opened.
 * - Shopping and store announcements (sent messages are edited, not resent).
 * - A completed wedding's final account goes to the super admins once — the
 *   mark is on the wedding; missed ones are posted at start-up and on link.
 * - With an https TELEGRAM_WEB_URL every site link opens as a Telegram mini
 *   app (signed in through /tg), and each chat's menu button opens it too.
 *
 * Without TELEGRAM_BOT_TOKEN the whole service stays off; a notification
 * never fails the request that caused it.
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token: string;
  private readonly webUrl: string;
  private readonly timeZone: string;
  private readonly reminderTimes: string[];
  private readonly pending = new Map<number, Pending>();
  private readonly sentSlots = new Set<string>();
  private abort?: AbortController;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private reports: ReportsService,
    private auditLog: AuditLogService,
    config: ConfigService,
  ) {
    this.token = config.get<string>('TELEGRAM_BOT_TOKEN', '').trim();
    this.webUrl = (
      config.get<string>('TELEGRAM_WEB_URL') ||
      config.get<string>('WEB_ORIGIN') ||
      'http://localhost:3010'
    ).replace(/\/+$/, '');
    this.timeZone = config.get<string>('TELEGRAM_TIMEZONE') || 'Asia/Tashkent';
    this.reminderTimes = (
      config.get<string>('TELEGRAM_REMINDER_TIMES') || '09:00,20:00'
    )
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
  }

  get enabled() {
    return this.token.length > 0;
  }

  /** Telegram opens mini apps from https addresses only. */
  private get miniApp() {
    return this.webUrl.startsWith('https://');
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.warn("TELEGRAM_BOT_TOKEN yo'q — Telegram bot o'chiq.");
      return;
    }
    this.running = true;
    this.logger.log(
      `Telegram bot yoqildi. Eslatmalar: ${this.reminderTimes.join(', ') || "yo'q"} (${this.timeZone})`,
    );
    void this.setUp();
    void this.poll();
    this.timer = setInterval(() => void this.tick(), 30_000);
  }

  onModuleDestroy() {
    this.running = false;
    this.abort?.abort();
    if (this.timer) clearInterval(this.timer);
  }

  private botUsername?: string;

  /** The bot's t.me username, asked from Telegram once. */
  private async username() {
    if (!this.botUsername) {
      const me = await this.call<{ username?: string }>('getMe', {});
      this.botUsername = me.username;
    }
    return this.botUsername;
  }

  // ------------------------------------------------- Linking from the profile

  /**
   * One-time link tokens, kept as sha256 hashes for 15 minutes. In memory is
   * enough: the bot polls from a single API process, and a token lost to a
   * restart is just asked for again.
   */
  private readonly linkTokens = new Map<
    string,
    { kind: 'STAFF' | 'WORKER'; id: string; expiresAt: number }
  >();

  private static hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async accountRow(user: { kind: 'STAFF' | 'WORKER'; sub: string }) {
    const select = {
      telegramChatId: true,
      telegramLinkedAt: true,
      language: true,
    } as const;
    return user.kind === 'WORKER'
      ? this.prisma.worker.findUnique({ where: { id: user.sub }, select })
      : this.prisma.staffUser.findUnique({ where: { id: user.sub }, select });
  }

  /**
   * The site's language is the bot's language: the web app calls this on
   * sign-in and whenever the language is switched. A linked chat gets its
   * commands and menu button in the new language at once.
   */
  async setLanguage(user: AuthPayload, value: string) {
    const language = langOf(value);
    const row = await this.accountRow(user);
    if (!row) return { language };
    if (row.language !== language) {
      if (user.kind === 'WORKER') {
        await this.prisma.worker.update({
          where: { id: user.sub },
          data: { language },
        });
      } else {
        await this.prisma.staffUser.update({
          where: { id: user.sub },
          data: { language },
        });
      }
      if (this.enabled && row.telegramChatId) {
        const account = await this.accountById(user.kind, user.sub);
        if (account) {
          await this.applyChatMenu(row.telegramChatId, account);
          if (account.role === 'SUPER_ADMIN') {
            await this.reportKeyboard(row.telegramChatId, account.lang);
          }
          await this.send(
            row.telegramChatId,
            BOT_TEXT[language].languageChanged,
          );
        }
      }
    }
    return { language };
  }

  /** The language of whoever has this chat; Uzbek when nobody does. */
  private async chatLang(chatId: string | number): Promise<Lang> {
    const id = String(chatId);
    const [worker, staff] = await Promise.all([
      this.prisma.worker.findFirst({
        where: { telegramChatId: id },
        select: { language: true },
      }),
      this.prisma.staffUser.findFirst({
        where: { telegramChatId: id },
        select: { language: true },
      }),
    ]);
    return langOf(worker?.language ?? staff?.language);
  }

  /** For the profile's Telegram card. */
  async status(user: AuthPayload) {
    const row = await this.accountRow(user);
    const botUsername = this.enabled
      ? await this.username().catch(() => undefined)
      : undefined;
    return {
      enabled: this.enabled && Boolean(botUsername),
      botUsername: botUsername ?? null,
      linked: Boolean(row?.telegramChatId),
      linkedAt: row?.telegramLinkedAt ?? null,
    };
  }

  /** A t.me link that links the signed-in account in one tap (once, 15 minutes). */
  async createLink(user: AuthPayload) {
    const username = this.enabled
      ? await this.username().catch(() => undefined)
      : undefined;
    if (!username) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }
    const now = Date.now();
    for (const [key, entry] of this.linkTokens) {
      if (entry.expiresAt <= now) this.linkTokens.delete(key);
    }
    const token = randomBytes(24).toString('base64url');
    const expiresAt = now + 15 * 60 * 1000;
    this.linkTokens.set(TelegramService.hash(token), {
      kind: user.kind,
      id: user.sub,
      expiresAt,
    });
    return {
      url: `https://t.me/${username}?start=${token}`,
      expiresAt: new Date(expiresAt),
    };
  }

  /** The account a token was made for — usable once. */
  private takeLinkToken(token: string) {
    const key = TelegramService.hash(token);
    const entry = this.linkTokens.get(key);
    this.linkTokens.delete(key);
    return entry && entry.expiresAt > Date.now() ? entry : null;
  }

  /** "Uzish" on the profile. */
  async unlinkAccount(user: AuthPayload) {
    const row = await this.accountRow(user);
    if (!row?.telegramChatId) return { linked: false };
    const chatId = row.telegramChatId;
    if (user.kind === 'WORKER') {
      await this.prisma.worker.update({
        where: { id: user.sub },
        data: { telegramChatId: null, telegramLinkedAt: null },
      });
    } else {
      await this.prisma.staffUser.update({
        where: { id: user.sub },
        data: { telegramChatId: null, telegramLinkedAt: null },
      });
    }
    await this.audit(
      user.kind,
      user.sub,
      user.fullName,
      'Telegram botni uzdi (profildan)',
    );
    if (this.enabled) {
      await this.resetChatMenu(chatId);
      await this.send(
        chatId,
        BOT_TEXT[langOf(row.language)].unlinkedFromProfile,
      );
    }
    return { linked: false };
  }

  /**
   * A password/PIN sign-in made inside the mini app: the Telegram user who
   * opened it gets linked, so the next launch signs in by itself.
   */
  async linkFromWebApp(user: AuthPayload, initData: string) {
    const chatId = Number(this.auth.telegramIdFromInitData(initData));
    const row = await this.accountRow(user);
    if (row?.telegramChatId === String(chatId)) return { linked: true };
    const account = await this.accountById(user.kind, user.sub);
    if (!account) throw new BadRequestException('Hisob topilmadi');
    await this.linkChat(chatId, account);
    return { linked: true };
  }

  private async accountById(
    kind: 'STAFF' | 'WORKER',
    id: string,
  ): Promise<Account | null> {
    if (kind === 'WORKER') {
      const worker = await this.prisma.worker.findFirst({
        where: { id, status: 'APPROVED', position: 'CHEF' },
        select: ACCOUNT_SELECT,
      });
      return worker ? toAccount(kind, worker) : null;
    }
    const staff = await this.prisma.staffUser.findFirst({
      where: { id, isActive: true },
      select: { ...ACCOUNT_SELECT, role: true },
    });
    return staff ? toAccount(kind, staff) : null;
  }

  private async audit(
    kind: 'STAFF' | 'WORKER',
    id: string,
    name: string,
    description: string,
  ) {
    await this.auditLog.record({
      actorId: kind === 'STAFF' ? id : null,
      actorName: name,
      action: 'UPDATE',
      entityType: kind === 'STAFF' ? 'STAFF_USER' : 'WORKER',
      entityId: id,
      description,
    });
  }

  // ------------------------------------------------------- Commands and menus

  /** Start-up: default commands for unlinked chats, then every linked chat's own. */
  private async setUp() {
    for (const lang of ['uz', 'ru'] as const) {
      await this.call('setMyCommands', {
        commands: [
          { command: 'start', description: BOT_TEXT[lang].startCommand },
        ],
        // Russian-speaking Telegram users see the Russian default.
        ...(lang === 'ru' ? { language_code: 'ru' } : {}),
      }).catch((err: Error) =>
        this.logger.warn(`setMyCommands: ${err.message}`),
      );
    }
    await this.call('setChatMenuButton', {
      menu_button: { type: 'commands' },
    }).catch((err: Error) =>
      this.logger.warn(`setChatMenuButton: ${err.message}`),
    );
    await this.syncMenuButtons();
    await this.backfillArchive();
  }

  /** The web address may have changed (new domain, tunnel): refresh every linked chat. */
  private async syncMenuButtons() {
    const [staff, workers] = await Promise.all([
      this.prisma.staffUser.findMany({
        where: { isActive: true, telegramChatId: { not: null } },
        select: { ...ACCOUNT_SELECT, role: true, telegramChatId: true },
      }),
      this.prisma.worker.findMany({
        where: {
          status: 'APPROVED',
          position: 'CHEF',
          telegramChatId: { not: null },
        },
        select: { ...ACCOUNT_SELECT, telegramChatId: true },
      }),
    ]);
    for (const s of staff) {
      await this.applyChatMenu(s.telegramChatId!, toAccount('STAFF', s));
    }
    for (const w of workers) {
      await this.applyChatMenu(w.telegramChatId!, toAccount('WORKER', w));
    }
  }

  /** This chat's own command list and the menu button that opens its home page. */
  private async applyChatMenu(chatId: string | number, account: Account) {
    const text = BOT_TEXT[account.lang];
    await this.call('setMyCommands', {
      commands: commandsFor(account).map((c) => ({
        command: c,
        description: text.commands[c],
      })),
      scope: { type: 'chat', chat_id: chatId },
    }).catch((err: Error) => this.logger.warn(`setMyCommands: ${err.message}`));
    const home = account.kind === 'WORKER' ? '/worker' : '/dashboard';
    await this.call('setChatMenuButton', {
      chat_id: chatId,
      menu_button: this.miniApp
        ? {
            type: 'web_app',
            text: text.menuButton,
            web_app: {
              url: `${this.webUrl}/tg?next=${encodeURIComponent(home)}`,
            },
          }
        : { type: 'commands' },
    }).catch((err: Error) =>
      this.logger.warn(`setChatMenuButton: ${err.message}`),
    );
  }

  private async resetChatMenu(chatId: string | number) {
    await this.call('deleteMyCommands', {
      scope: { type: 'chat', chat_id: chatId },
    }).catch(() => undefined);
    await this.call('setChatMenuButton', {
      chat_id: chatId,
      menu_button: { type: 'commands' },
    }).catch(() => undefined);
  }

  /** A site link as a keyboard button: a mini app when possible, else a URL. */
  private button(b: LinkButton) {
    if (this.miniApp && b.url.startsWith(this.webUrl)) {
      const next = b.url.slice(this.webUrl.length) || '/';
      return {
        text: b.text,
        web_app: { url: `${this.webUrl}/tg?next=${encodeURIComponent(next)}` },
      };
    }
    return b;
  }

  // ---------------------------------------------------------------- Bot API

  private async call<T = unknown>(
    method: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await fetch(
      `https://api.telegram.org/bot${this.token}/${method}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: signal ?? AbortSignal.timeout(15_000),
      },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result: T;
      description?: string;
    };
    if (!data.ok)
      throw new Error(data.description ?? `Telegram ${method} failed`);
    return data.result;
  }

  /**
   * Sends a message, with an optional link button. Telegram refuses buttons
   * that point at localhost, so on a rejected button the link is sent as
   * plain text instead — which keeps local testing working.
   */
  private async deliver(
    method: 'sendMessage' | 'editMessageText',
    target: Record<string, unknown>,
    text: string,
    buttons: LinkButton[],
  ): Promise<number | null> {
    try {
      if (buttons.length > 0) {
        try {
          const sent = await this.call<{ message_id: number }>(method, {
            ...target,
            text,
            reply_markup: {
              inline_keyboard: buttons.map((b) => [this.button(b)]),
            },
          });
          return sent.message_id;
        } catch (err) {
          if (/not modified/i.test((err as Error).message)) return null;
          const links = buttons.map((b) => `${b.text}: ${b.url}`).join('\n');
          const sent = await this.call<{ message_id: number }>(method, {
            ...target,
            text: `${text}\n\n${links}`,
            link_preview_options: { is_disabled: true },
          });
          return sent.message_id;
        }
      }
      const sent = await this.call<{ message_id: number }>(method, {
        ...target,
        text,
      });
      return sent.message_id;
    } catch (err) {
      if (!/not modified/i.test((err as Error).message)) {
        this.logger.warn(
          `Xabar yuborilmadi (${String(target.chat_id)}): ${(err as Error).message}`,
        );
      }
      return null;
    }
  }

  /** Returns the new message's id, or null when it could not be sent. */
  private send(
    chatId: string | number,
    text: string,
    buttons: LinkButton | LinkButton[] = [],
  ) {
    return this.deliver(
      'sendMessage',
      { chat_id: chatId },
      text,
      Array.isArray(buttons) ? buttons : [buttons],
    );
  }

  /** Rewrites messages sent earlier, e.g. after the list was edited — each in its reader's language. */
  private async edit(
    refs: MessageRef[],
    render: (lang: Lang) => { text: string; buttons: LinkButton[] },
  ) {
    for (const ref of refs) {
      const { text, buttons } = render(await this.chatLang(ref.chatId));
      await this.deliver(
        'editMessageText',
        { chat_id: ref.chatId, message_id: ref.messageId },
        text,
        buttons,
      );
    }
  }

  private async poll() {
    let offset = 0;
    while (this.running) {
      this.abort = new AbortController();
      try {
        const updates = await this.call<
          {
            update_id: number;
            message?: TgMessage;
            callback_query?: TgCallback;
          }[]
        >(
          'getUpdates',
          {
            offset,
            timeout: 25,
            allowed_updates: ['message', 'callback_query'],
          },
          this.abort.signal,
        );
        for (const update of updates) {
          offset = update.update_id + 1;
          if (update.message?.chat.type === 'private') {
            await this.onMessage(update.message).catch((err: Error) =>
              this.logger.error(`Xabarni qayta ishlashda xato: ${err.message}`),
            );
          } else if (update.callback_query) {
            await this.onCallback(update.callback_query).catch((err: Error) =>
              this.logger.error(`Tugmani qayta ishlashda xato: ${err.message}`),
            );
          }
        }
      } catch (err) {
        if (!this.running) return;
        this.logger.warn(`getUpdates: ${(err as Error).message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  // ------------------------------------------------------------ Conversation

  private async onMessage(msg: TgMessage) {
    const chatId = msg.chat.id;
    const text = (msg.text ?? '').trim();

    // Linked: their own language; not yet: Telegram's.
    const account = await this.linkedAccount(chatId);
    const lang = account?.lang ?? langFromTelegram(msg.from?.language_code);
    const t = BOT_TEXT[lang];

    const startToken = /^\/start\s+(\S+)$/.exec(text)?.[1];
    if (startToken) {
      await this.onStartToken(chatId, startToken, lang);
      return;
    }

    if (text === '/start') {
      if (account) {
        await this.send(
          chatId,
          t.alreadyLinked(account.fullName, commandLines(account)),
          this.homeButton(account.kind, lang),
        );
        if (account.role === 'SUPER_ADMIN') {
          await this.reportKeyboard(chatId, lang);
        }
        return;
      }
      await this.askPhone(chatId, t.welcome, lang);
      return;
    }

    if (text === '/ulash') {
      await this.askPhone(chatId, t.askPhone, lang);
      return;
    }

    if (text === '/chiqish') {
      this.pending.delete(chatId);
      if (account) {
        await this.unlink(chatId);
        await this.audit(
          account.kind,
          account.id,
          account.fullName,
          'Telegram botni uzdi (/chiqish)',
        );
        await this.resetChatMenu(chatId);
      }
      await this.send(chatId, t.unlinked);
      return;
    }

    // Mid-way through the phone + password linking: the reply is the phone or the code.
    const state = this.pending.get(chatId);
    if (state && !text.startsWith('/')) {
      if (state.step === 'PHONE') {
        const phone = normalizePhone(msg.contact?.phone_number ?? text);
        if (!phone) {
          await this.send(chatId, t.badPhone);
          return;
        }
        await this.onPhone(msg, phone, lang);
        return;
      }
      await this.onCode(msg, state, text, lang);
      return;
    }

    const command = this.commandOf(text);
    if (!account) {
      await this.send(chatId, command ? t.linkFirst : t.startFirst);
      return;
    }
    if (!command) {
      await this.send(chatId, `${t.commandsHeader}\n${commandLines(account)}`);
      return;
    }
    if (!commandsFor(account).includes(command)) {
      await this.send(
        chatId,
        command === 'ombor'
          ? t.deniedStock
          : command === 'toylar' || command === 'tekshir'
            ? t.denied
            : t.deniedFinance,
      );
      return;
    }

    switch (command) {
      case 'toylar':
        await this.upcomingWeddings(chatId, lang);
        return;
      case 'ombor':
        await this.lowStock(chatId, lang);
        return;
      case 'tekshir':
        await this.checkNow(chatId, account);
        return;
      case 'toy':
        await this.weddingPicker(chatId, lang);
        return;
      case 'hisobot':
      case 'arxiv': {
        const reportKind: ReportKind =
          command === 'hisobot' ? 'ACCOUNTING' : 'ARCHIVE';
        if (reportKind === 'ARCHIVE') await this.archiveSummary(chatId, lang);
        await this.call('sendMessage', {
          chat_id: chatId,
          text: t.reportPeriod(t.reportTitles[reportKind]),
          reply_markup: {
            inline_keyboard: [
              REPORT_PERIODS.slice(0, 2).map((p) => ({
                text: t.periods[p],
                callback_data: `rep:${reportKind}:${p}`,
              })),
              REPORT_PERIODS.slice(2).map((p) => ({
                text: t.periods[p],
                callback_data: `rep:${reportKind}:${p}`,
              })),
            ],
          },
        });
        return;
      }
      case 'chiqish':
        return;
    }
  }

  /** "/toylar", "/toylar@bot" and the keyboard buttons, as one command. */
  private commandOf(text: string): Command | null {
    // The keyboard buttons, in either language (the keyboard may be older
    // than a language switch).
    for (const t of Object.values(BOT_TEXT)) {
      if (text === t.reportTitles.ACCOUNTING) return 'hisobot';
      if (text === t.reportTitles.ARCHIVE) return 'arxiv';
      if (text === t.weddingButton) return 'toy';
    }
    const name = /^\/([a-z]+)(?:@\w+)?$/.exec(text)?.[1];
    return name && name in BOT_TEXT.uz.commands ? (name as Command) : null;
  }

  private async askPhone(chatId: number, text: string, lang: Lang) {
    this.pending.set(chatId, { step: 'PHONE' });
    await this.call('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: {
        keyboard: [
          [{ text: BOT_TEXT[lang].sharePhone, request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  private async onPhone(msg: TgMessage, phone: string, lang: Lang) {
    const t = BOT_TEXT[lang];
    const chatId = msg.chat.id;
    const [worker, staff] = await Promise.all([
      this.prisma.worker.findUnique({ where: { phone } }),
      this.prisma.staffUser.findUnique({ where: { phone } }),
    ]);
    const chef =
      worker && worker.position === 'CHEF' && worker.status === 'APPROVED'
        ? worker
        : null;
    // ADMIN buys what the super admin approves, so they link too.
    const superAdmin =
      staff &&
      (staff.role === 'SUPER_ADMIN' || staff.role === 'ADMIN') &&
      staff.isActive
        ? staff
        : null;

    if (!chef && !superAdmin) {
      this.pending.delete(chatId);
      await this.call('sendMessage', {
        chat_id: chatId,
        text: t.phoneUnknown,
        reply_markup: { remove_keyboard: true },
      }).catch(() => undefined);
      const who = [msg.from?.first_name, msg.from?.last_name]
        .filter(Boolean)
        .join(' ');
      const handle = `${who}${msg.from?.username ? ` (@${msg.from.username})` : ''}`;
      await this.toStaff('SUPER_ADMIN', (l) =>
        BOT_TEXT[l].phoneUnknownAlert(phone, handle.trim()),
      );
      return;
    }

    this.pending.set(chatId, {
      step: 'CODE',
      phone,
      kind: chef ? 'WORKER' : 'STAFF',
    });
    await this.call('sendMessage', {
      chat_id: chatId,
      text: chef ? t.askPin : t.askPassword,
      reply_markup: { remove_keyboard: true },
    });
  }

  private async onCode(
    msg: TgMessage,
    state: Extract<Pending, { step: 'CODE' }>,
    code: string,
    lang: Lang,
  ) {
    const chatId = msg.chat.id;
    // The code must not stay readable in the chat history.
    await this.call('deleteMessage', {
      chat_id: chatId,
      message_id: msg.message_id,
    }).catch(() => undefined);

    try {
      // Same check (and the same lockout after repeated mistakes) as the site login.
      const { user } =
        state.kind === 'WORKER'
          ? await this.auth.loginWorker({ phone: state.phone, pin: code })
          : await this.auth.loginStaff({ phone: state.phone, password: code });

      this.pending.delete(chatId);
      const account = await this.accountById(state.kind, user.id);
      if (account) await this.linkChat(chatId, account);
    } catch (err) {
      await this.send(chatId, BOT_TEXT[lang].codeWrong((err as Error).message));
    }
  }

  /**
   * Links a chat to an account in one transaction (whatever had the chat
   * before lets go of it), logs it, greets with this account's commands and
   * sets the chat's own menu. A super admin also gets the wedding archive.
   */
  private async linkChat(chatId: number, account: Account) {
    const id = String(chatId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.worker.updateMany({
        where: { telegramChatId: id },
        data: { telegramChatId: null, telegramLinkedAt: null },
      }),
      this.prisma.staffUser.updateMany({
        where: { telegramChatId: id },
        data: { telegramChatId: null, telegramLinkedAt: null },
      }),
      account.kind === 'WORKER'
        ? this.prisma.worker.update({
            where: { id: account.id },
            data: { telegramChatId: id, telegramLinkedAt: now },
          })
        : this.prisma.staffUser.update({
            where: { id: account.id },
            data: { telegramChatId: id, telegramLinkedAt: now },
          }),
    ]);
    await this.audit(
      account.kind,
      account.id,
      account.fullName,
      'Telegram botni uladi',
    );

    const t = BOT_TEXT[account.lang];
    const times = this.reminderTimes.join(` ${t.and} `);
    const about =
      account.kind === 'WORKER'
        ? t.aboutChef(times)
        : account.role === 'SUPER_ADMIN'
          ? t.aboutSuperAdmin(times)
          : t.aboutOther;
    await this.send(
      chatId,
      t.linkedNow(account.fullName, about, commandLines(account)),
      this.homeButton(account.kind, account.lang),
    );
    await this.applyChatMenu(chatId, account);
    if (account.role === 'SUPER_ADMIN') {
      await this.reportKeyboard(chatId, account.lang);
      void this.backfillArchive();
    }
  }

  /** /start <token> from the profile's "connect Telegram" button. */
  private async onStartToken(chatId: number, token: string, lang: Lang) {
    const entry = this.takeLinkToken(token);
    const account = entry ? await this.accountById(entry.kind, entry.id) : null;
    if (!account) {
      await this.send(chatId, BOT_TEXT[lang].linkExpired);
      return;
    }
    this.pending.delete(chatId);
    await this.linkChat(chatId, account);
  }

  /** Two always-visible buttons for the super admin's PDF reports. */
  private async reportKeyboard(chatId: number | string, lang: Lang) {
    const t = BOT_TEXT[lang];
    await this.call('sendMessage', {
      chat_id: chatId,
      text: t.reportKeyboardHint,
      reply_markup: {
        keyboard: [
          [
            { text: t.reportTitles.ACCOUNTING },
            { text: t.reportTitles.ARCHIVE },
          ],
          [{ text: t.weddingButton }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      },
    }).catch(() => undefined);
  }

  private async onCallback(cb: TgCallback) {
    const [tag, kind, period] = (cb.data ?? '').split(':');
    const chatId = cb.message?.chat.id ?? cb.from.id;
    const wedding = tag === 'evt' && !!kind;
    if (
      !wedding &&
      (tag !== 'rep' ||
        !REPORT_KINDS.includes(kind as ReportKind) ||
        !REPORT_PERIODS.includes(period as ReportPeriod))
    ) {
      await this.call('answerCallbackQuery', { callback_query_id: cb.id });
      return;
    }
    const linked = await this.linkedAccount(chatId);
    const t = BOT_TEXT[linked?.lang ?? langFromTelegram(cb.from.language_code)];
    if (linked?.role !== 'SUPER_ADMIN') {
      await this.call('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: t.deniedFinance,
        show_alert: true,
      });
      return;
    }
    await this.call('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: t.preparing,
    });
    if (wedding) {
      await this.sendFile(String(chatId), () =>
        this.reports.eventForClient(kind),
      );
    } else {
      await this.sendReport(
        String(chatId),
        kind as ReportKind,
        period as ReportPeriod,
      );
    }
  }

  /** The super admin picks a recent wedding for its client PDF. */
  private async weddingPicker(chatId: number, lang: Lang) {
    const t = BOT_TEXT[lang];
    const events = await this.prisma.event.findMany({
      where: {
        status: { not: 'CANCELLED' },
        eventDate: { lt: this.tomorrowRange().end },
      },
      orderBy: { eventDate: 'desc' },
      take: 12,
      select: { id: true, clientName: true, eventDate: true },
    });
    if (events.length === 0) {
      await this.send(chatId, t.noPastWeddings);
      return;
    }
    await this.call('sendMessage', {
      chat_id: chatId,
      text: t.weddingPicker,
      reply_markup: {
        inline_keyboard: events.map((e) => [
          {
            text: `${shortDate(e.eventDate, this.timeZone).slice(0, 5)} — ${e.clientName}`.slice(
              0,
              60,
            ),
            callback_data: `evt:${e.id}`,
          },
        ]),
      },
    });
  }

  /** Builds the PDF and sends it as a file; tells the chat if that failed. */
  private sendReport(chatId: string, kind: ReportKind, period: ReportPeriod) {
    return this.sendFile(chatId, () => this.reports.build(kind, period));
  }

  private async sendFile(chatId: string, build: () => Promise<ReportFile>) {
    await this.call('sendChatAction', {
      chat_id: chatId,
      action: 'upload_document',
    }).catch(() => undefined);
    try {
      const file = await build();
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', file.caption);
      form.append(
        'document',
        new Blob([new Uint8Array(file.buffer)], { type: 'application/pdf' }),
        file.filename,
      );
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/sendDocument`,
        { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) },
      );
      const data = (await res.json()) as { ok: boolean; description?: string };
      if (!data.ok) throw new Error(data.description ?? 'sendDocument failed');
      return true;
    } catch (err) {
      this.logger.error(`Hisobot yuborilmadi: ${(err as Error).message}`);
      await this.send(
        chatId,
        BOT_TEXT[await this.chatLang(chatId)].reportFailed,
      );
      return false;
    }
  }

  /** For the site / mini app: the PDF goes to this super admin's linked chat. */
  async sendReportToStaff(
    staffId: string,
    kind: ReportKind,
    period: ReportPeriod,
  ) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: staffId },
      select: { telegramChatId: true, role: true, isActive: true },
    });
    if (
      !staff?.telegramChatId ||
      staff.role !== 'SUPER_ADMIN' ||
      !staff.isActive
    ) {
      return 'NOT_LINKED' as const;
    }
    const sent = await this.sendReport(staff.telegramChatId, kind, period);
    return sent ? ('SENT' as const) : ('FAILED' as const);
  }

  /**
   * A PDF to whoever asked for it (staff or chef), in their own linked
   * chat — the mini app can't show a file without leaving the app.
   */
  async sendFileToAccount(
    account: { kind: 'STAFF' | 'WORKER'; id: string },
    build: () => Promise<ReportFile>,
  ) {
    const row =
      account.kind === 'STAFF'
        ? await this.prisma.staffUser.findUnique({
            where: { id: account.id },
            select: { telegramChatId: true },
          })
        : await this.prisma.worker.findUnique({
            where: { id: account.id },
            select: { telegramChatId: true },
          });
    if (!row?.telegramChatId) return 'NOT_LINKED' as const;
    const sent = await this.sendFile(row.telegramChatId, build);
    return sent ? ('SENT' as const) : ('FAILED' as const);
  }

  /** One wedding's client PDF to this super admin's linked chat. */
  async sendEventReportToStaff(staffId: string, eventId: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: staffId },
      select: { telegramChatId: true, role: true, isActive: true },
    });
    if (
      !staff?.telegramChatId ||
      staff.role !== 'SUPER_ADMIN' ||
      !staff.isActive
    ) {
      return 'NOT_LINKED' as const;
    }
    const sent = await this.sendFile(staff.telegramChatId, () =>
      this.reports.eventForClient(eventId),
    );
    return sent ? ('SENT' as const) : ('FAILED' as const);
  }

  private homeButton(kind: 'WORKER' | 'STAFF', lang: Lang): LinkButton {
    const t = BOT_TEXT[lang];
    return kind === 'WORKER'
      ? { text: t.homeChef, url: `${this.webUrl}/worker` }
      : { text: t.homeStaff, url: `${this.webUrl}/dashboard` };
  }

  /** The active account linked to this chat, read fresh on every message. */
  private async linkedAccount(chatId: number): Promise<Account | null> {
    const id = String(chatId);
    const worker = await this.prisma.worker.findFirst({
      where: { telegramChatId: id, status: 'APPROVED', position: 'CHEF' },
      select: ACCOUNT_SELECT,
    });
    if (worker) return toAccount('WORKER', worker);
    const staff = await this.prisma.staffUser.findFirst({
      where: { telegramChatId: id, isActive: true },
      select: { ...ACCOUNT_SELECT, role: true },
    });
    return staff ? toAccount('STAFF', staff) : null;
  }

  /** One chat belongs to one account at a time. */
  private async unlink(chatId: number) {
    const id = String(chatId);
    await this.prisma.worker.updateMany({
      where: { telegramChatId: id },
      data: { telegramChatId: null, telegramLinkedAt: null },
    });
    await this.prisma.staffUser.updateMany({
      where: { telegramChatId: id },
      data: { telegramChatId: null, telegramLinkedAt: null },
    });
  }

  /**
   * Sends to every linked, active staff member of a role — the text built
   * for each one's own language; returns what was sent.
   */
  private async toStaff(
    role: 'SUPER_ADMIN' | 'ADMIN',
    text: (lang: Lang) => string,
    buttons: (lang: Lang) => LinkButton | LinkButton[] = () => [],
  ): Promise<MessageRef[]> {
    const staff = await this.prisma.staffUser.findMany({
      where: { role, isActive: true, telegramChatId: { not: null } },
      select: { telegramChatId: true, language: true },
    });
    const refs: MessageRef[] = [];
    for (const member of staff) {
      const lang = langOf(member.language);
      const messageId = await this.send(
        member.telegramChatId!,
        text(lang),
        buttons(lang),
      );
      if (messageId) refs.push({ chatId: member.telegramChatId!, messageId });
    }
    return refs;
  }

  // ---------------------------------------------------------------- Reminders

  /** Wall-clock parts of `date` in the configured time zone. */
  private zoned(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)!.value);
    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
    };
  }

  /** The UTC instants where tomorrow starts and ends in the configured time zone. */
  private tomorrowRange() {
    const now = new Date();
    const z = this.zoned(now);
    const offset =
      Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute) -
      Math.floor(now.getTime() / 60_000) * 60_000;
    const start = new Date(Date.UTC(z.year, z.month - 1, z.day + 1) - offset);
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }

  private async tick() {
    const z = this.zoned(new Date());
    const time = `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`;
    if (!this.reminderTimes.includes(time)) return;
    const slot = `${z.year}-${z.month}-${z.day} ${time}`;
    if (this.sentSlots.has(slot)) return;
    this.sentSlots.add(slot);
    try {
      const chefs = await this.remindChefs();
      const admins = await this.remindSuperAdmins();
      this.logger.log(
        `Eslatma ${time}: oshpazlarga ${chefs} ta, super adminlarga ${admins} ta xabar.`,
      );
    } catch (err) {
      this.logger.error(`Eslatma yuborishda xato: ${(err as Error).message}`);
    }
  }

  /**
   * Tomorrow's weddings whose shopping list is not written and confirmed
   * yet, to every linked chef (chefs are permanent staff and are not
   * assigned per wedding). `onlyChatId` limits it to one chat for /tekshir.
   */
  async remindChefs(onlyChatId?: string) {
    const { start, end } = this.tomorrowRange();
    const events = await this.prisma.event.findMany({
      where: {
        eventDate: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
        shoppingLists: {
          none: { status: { in: ['APPROVED', 'PURCHASED', 'CLOSED'] } },
        },
      },
      include: { shoppingLists: { select: { id: true } } },
      orderBy: { eventDate: 'asc' },
    });
    if (events.length === 0) return 0;

    const chefs = await this.prisma.worker.findMany({
      where: {
        position: 'CHEF',
        status: 'APPROVED',
        telegramChatId: onlyChatId ?? { not: null },
      },
      select: { telegramChatId: true, language: true },
    });

    let sent = 0;
    for (const event of events) {
      for (const chef of chefs) {
        const lang = langOf(chef.language);
        const t = BOT_TEXT[lang];
        const ru = lang === 'ru';
        const dishes = [
          ru ? (event.firstDishRu ?? event.firstDish) : event.firstDish,
          ru ? (event.secondDishRu ?? event.secondDish) : event.secondDish,
        ]
          .filter(Boolean)
          .join(', ');
        await this.send(
          chef.telegramChatId!,
          t.remindChef({
            date: dayMonth(event.eventDate, lang, this.timeZone),
            time: hourMinute(event.eventDate, this.timeZone),
            name: this.clientName(event, lang),
            guests: event.guestCount,
            dishes,
            hasList: event.shoppingLists.length > 0,
          }),
          {
            text: t.writeShopping,
            url: `${this.webUrl}/worker/shopping?event=${event.id}`,
          },
        );
        sent++;
      }
    }
    return sent;
  }

  /** The couple's name as written for this reader. */
  private clientName(
    event: { clientName: string; clientNameRu?: string | null },
    lang: Lang,
  ) {
    return lang === 'ru'
      ? event.clientNameRu || event.clientName
      : event.clientName;
  }

  private unit(unit: string, lang: Lang) {
    return BOT_TEXT[lang].units[unit] ?? unit;
  }

  /** /toylar: the next ten weddings from today on, cancelled ones left out. */
  private async upcomingWeddings(chatId: number, lang: Lang) {
    const t = BOT_TEXT[lang];
    const { start } = this.tomorrowRange();
    const today = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const events = await this.prisma.event.findMany({
      where: { eventDate: { gte: today }, status: { not: 'CANCELLED' } },
      orderBy: { eventDate: 'asc' },
      take: 10,
      select: {
        clientName: true,
        clientNameRu: true,
        eventDate: true,
        guestCount: true,
        status: true,
      },
    });
    if (events.length === 0) {
      await this.send(chatId, t.noUpcoming);
      return;
    }
    const rows = events.map(
      (e) =>
        t.upcomingRow(
          dayMonth(e.eventDate, lang, this.timeZone),
          hourMinute(e.eventDate, this.timeZone),
          this.clientName(e, lang),
          e.guestCount,
        ) + (e.status === 'PENDING' ? t.pendingMark : ''),
    );
    await this.send(chatId, `${t.upcomingTitle}\n\n${rows.join('\n')}`);
  }

  /** /ombor: products at or under their minimum (30 at most). */
  private async lowStock(chatId: number, lang: Lang) {
    const t = BOT_TEXT[lang];
    const items = await this.prisma.inventoryItem.findMany({
      where: { minThreshold: { gt: 0 } },
      select: {
        name: true,
        nameRu: true,
        unit: true,
        quantity: true,
        minThreshold: true,
      },
      orderBy: { name: 'asc' },
    });
    const low = items.filter((i) => i.quantity.lte(i.minThreshold!));
    if (low.length === 0) {
      await this.send(chatId, t.stockOk);
      return;
    }
    const rows = low
      .slice(0, 30)
      .map((i) =>
        t.lowStockRow(
          lang === 'ru' ? i.nameRu || i.name : i.name,
          fmtQty(i.quantity),
          fmtQty(i.minThreshold),
          this.unit(i.unit, lang),
        ),
      );
    if (low.length > rows.length) rows.push(t.more(low.length - rows.length));
    await this.send(chatId, `${t.lowStockTitle}\n\n${rows.join('\n')}`, {
      text: t.storeButton,
      url: `${this.webUrl}/dashboard/inventory`,
    });
  }

  /** /tekshir: the same reminders as at the set hours, for this one person. */
  private async checkNow(chatId: number, account: Account) {
    let sent = 0;
    if (account.kind === 'WORKER') {
      sent = await this.remindChefs(String(chatId));
    } else if (account.role === 'SUPER_ADMIN') {
      sent = await this.remindSuperAdmins(String(chatId));
    }
    if (sent === 0) {
      const t = BOT_TEXT[account.lang];
      await this.send(
        chatId,
        account.kind === 'WORKER' ? t.nothingChef : t.nothingPending,
      );
    }
  }

  /**
   * Shopping lists the super admins have not opened yet (the site's bell):
   * one summary to every linked super admin, or to `onlyChatId`.
   */
  async remindSuperAdmins(onlyChatId?: string) {
    const lists = await this.prisma.shoppingList.findMany({
      where: { status: { in: ['APPROVED', 'PURCHASED'] }, adminSeenAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        createdByWorker: { select: { fullName: true } },
        event: {
          select: { clientName: true, clientNameRu: true, eventDate: true },
        },
        _count: { select: { items: true } },
      },
    });
    if (lists.length === 0) return 0;
    const render = (lang: Lang) => {
      const t = BOT_TEXT[lang];
      const rows = lists
        .slice(0, 10)
        .map((l) =>
          t.unseenRow(
            l.event
              ? `${this.clientName(l.event, lang)} (${dayMonth(l.event.eventDate, lang, this.timeZone)})`
              : t.noEventList,
            l._count.items,
            l.createdByWorker.fullName,
            l.status === 'PURCHASED',
          ),
        );
      if (lists.length > rows.length) {
        rows.push(t.more(lists.length - rows.length));
      }
      return `${t.unseenTitle(lists.length)}\n\n${rows.join('\n')}`;
    };
    if (onlyChatId) {
      const lang = await this.chatLang(onlyChatId);
      return (await this.send(onlyChatId, render(lang), this.listsButton(lang)))
        ? 1
        : 0;
    }
    return (
      await this.toStaff('SUPER_ADMIN', render, (lang) =>
        this.listsButton(lang),
      )
    ).length;
  }

  // ------------------------------------------------------- Wedding archive

  /** A closed wedding's final account, from the same sums as the site. */
  private async weddingAccounts(where: Prisma.EventWhereInput) {
    const events = await this.prisma.event.findMany({
      where,
      orderBy: { eventDate: 'asc' },
      select: {
        id: true,
        clientName: true,
        clientNameRu: true,
        eventDate: true,
        guestCount: true,
        totalPrice: true,
        payments: { select: { amount: true, type: true } },
      },
    });
    const expenses = await this.prisma.eventExpense.groupBy({
      by: ['eventId'],
      where: { eventId: { in: events.map((e) => e.id) } },
      _sum: { amount: true },
    });
    const spent = new Map(
      expenses.map((e) => [e.eventId, Number(e._sum.amount ?? 0)]),
    );
    return events.map((e) => {
      const agreed = Number(e.totalPrice);
      const collected = Number(netPaid(e.payments));
      const cost = spent.get(e.id) ?? 0;
      return {
        id: e.id,
        clientName: e.clientName,
        clientNameRu: e.clientNameRu,
        date: e.eventDate,
        guests: e.guestCount,
        agreed,
        collected,
        debt: Math.max(agreed - collected, 0),
        expenses: cost,
        profit: collected - cost,
      };
    });
  }

  /**
   * The wedding was marked completed: its final account goes to every linked
   * super admin, once — the mark is stored on the wedding, so restarts and a
   * reopened wedding never post it twice. Returns whether it was posted.
   */
  async reportEventCompleted(eventId: string): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const [a] = await this.weddingAccounts({
        id: eventId,
        status: 'COMPLETED',
        archivedNotifiedAt: null,
      });
      if (!a) return false;
      const refs = await this.toStaff(
        'SUPER_ADMIN',
        (lang) =>
          BOT_TEXT[lang].completed({
            name: this.clientName(a, lang),
            date: shortDate(a.date, this.timeZone),
            guests: a.guests,
            agreed: money(a.agreed, lang),
            collected: money(a.collected, lang),
            debt: a.debt > 0 ? money(a.debt, lang) : null,
            expenses: money(a.expenses, lang),
            profit: money(a.profit, lang),
          }),
        (lang) => ({
          text: BOT_TEXT[lang].eventCard,
          url: `${this.webUrl}/dashboard/events/${eventId}`,
        }),
      );
      if (refs.length === 0) return false;
      await this.prisma.event.update({
        where: { id: eventId },
        data: { archivedNotifiedAt: new Date() },
      });
      return true;
    } catch (err) {
      this.logger.warn(`Yakuniy hisob yuborilmadi: ${(err as Error).message}`);
      return false;
    }
  }

  private backfilling = false;

  /**
   * Completed weddings not posted yet (none was linked then, or the bot was
   * off), oldest first, with a pause for Telegram's rate limit. Runs at
   * start-up and when a super admin links the bot.
   */
  async backfillArchive() {
    if (!this.enabled || this.backfilling) return;
    this.backfilling = true;
    try {
      const events = await this.prisma.event.findMany({
        where: { status: 'COMPLETED', archivedNotifiedAt: null },
        orderBy: { eventDate: 'asc' },
        select: { id: true },
      });
      let posted = 0;
      for (const e of events) {
        if (!(await this.reportEventCompleted(e.id))) break;
        posted++;
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      if (events.length > 0) {
        this.logger.log(
          `Arxiv: ${posted}/${events.length} ta yakunlangan to'y yozildi.`,
        );
      }
    } catch (err) {
      this.logger.warn(`Arxivni to'ldirib bo'lmadi: ${(err as Error).message}`);
    } finally {
      this.backfilling = false;
    }
  }

  /** /arxiv: every completed wedding in short, with the totals, before the PDF. */
  private async archiveSummary(chatId: number, lang: Lang) {
    const t = BOT_TEXT[lang];
    const all = await this.weddingAccounts({ status: 'COMPLETED' });
    if (all.length === 0) {
      await this.send(chatId, t.archiveEmpty);
      return;
    }
    const latest = [...all].reverse();
    const rows = latest
      .slice(0, 12)
      .map(
        (a) =>
          `• ${shortDate(a.date, this.timeZone)} ${this.clientName(a, lang)} — ${money(a.profit, lang)}`,
      );
    if (latest.length > rows.length) {
      rows.push(t.more(latest.length - rows.length));
    }
    const sum = (pick: (a: (typeof all)[number]) => number) =>
      all.reduce((total, a) => total + pick(a), 0);
    await this.send(
      chatId,
      t.archive(
        all.length,
        rows.join('\n'),
        money(
          sum((a) => a.collected),
          lang,
        ),
        money(
          sum((a) => a.expenses),
          lang,
        ),
        money(
          sum((a) => a.profit),
          lang,
        ),
      ),
    );
  }

  // ------------------------------------------------------ List announcements

  private listsButton(lang: Lang): LinkButton {
    return {
      text: BOT_TEXT[lang].openLists,
      url: `${this.webUrl}/dashboard/shopping-lists`,
    };
  }

  private loadList(id: string) {
    return this.prisma.shoppingList.findUnique({
      where: { id },
      include: LIST_INCLUDE,
    });
  }

  private listHead(list: LoadedList, lang: Lang) {
    const event = list.event
      ? `${this.clientName(list.event, lang)} — ${dayMonth(list.event.eventDate, lang, this.timeZone)}, ${BOT_TEXT[lang].guests(list.event.guestCount)}`
      : null;
    return BOT_TEXT[lang].listHead(event, list.createdByWorker.fullName);
  }

  /** What is to be bought. */
  private itemRows(list: LoadedList, lang: Lang) {
    const t = BOT_TEXT[lang];
    const rows = list.items.slice(0, 40).map((i) => {
      let mark = '';
      if (i.originalQuantity && !i.originalQuantity.equals(i.quantity)) {
        mark = i.originalQuantity.isZero()
          ? t.added
          : t.chefQty(fmtQty(i.originalQuantity));
      }
      const name = lang === 'ru' ? i.nameRu || i.name : i.name;
      return `• ${name} — ${fmtQty(i.quantity)} ${this.unit(i.unit, lang)}${mark}`;
    });
    if (list.items.length > rows.length) {
      rows.push(t.more(list.items.length - rows.length));
    }
    return rows.join('\n');
  }

  private purchasedText(list: LoadedList, lang: Lang) {
    return BOT_TEXT[lang].purchased(
      this.listHead(list, lang),
      this.itemRows(list, lang),
      money(list.totalCost, lang),
      Boolean(list.event),
    );
  }

  /** Under the price report: the wedding's card, where the expense now sits. */
  private purchasedButtons(lang: Lang, eventId?: string): LinkButton[] {
    const buttons = [this.listsButton(lang)];
    if (eventId) {
      buttons.unshift({
        text: BOT_TEXT[lang].eventCard,
        url: `${this.webUrl}/dashboard/events/${eventId}`,
      });
    }
    return buttons;
  }

  private async saveRefs(id: string, patch: ListMessages) {
    const row = await this.prisma.shoppingList.findUnique({
      where: { id },
      select: { telegramMessages: true },
    });
    const current = (row?.telegramMessages ?? {}) as ListMessages;
    await this.prisma.shoppingList.update({
      where: { id },
      data: { telegramMessages: { ...current, ...patch } as object },
    });
  }

  /** Runs a notification without ever failing the request that caused it. */
  private async safely(what: string, job: () => Promise<void>) {
    if (!this.enabled) return;
    try {
      await job();
    } catch (err) {
      this.logger.warn(`${what}: ${(err as Error).message}`);
    }
  }

  /**
   * A chef confirmed a list: the list goes out as a PDF — to the chef, to
   * take to the bazaar, and to the super admins.
   */
  notifyListSubmitted(id: string) {
    return this.safely("Ro'yxat PDF'i yuborilmadi", async () => {
      const list = await this.loadList(id);
      if (!list) return;
      const admins = await this.prisma.staffUser.findMany({
        where: {
          role: 'SUPER_ADMIN',
          isActive: true,
          telegramChatId: { not: null },
        },
        select: { telegramChatId: true },
      });
      const chats = new Set(admins.map((a) => a.telegramChatId!));
      if (list.createdByWorker.telegramChatId) {
        chats.add(list.createdByWorker.telegramChatId);
      }
      for (const chat of chats) {
        await this.sendFile(chat, () => this.reports.shoppingList(id));
      }
    });
  }

  /** The bazaar is done: report the list and its one sum to the super admins. */
  notifyListPurchased(id: string) {
    return this.safely('Xarid hisoboti yuborilmadi', async () => {
      const list = await this.loadList(id);
      if (!list) return;
      const refs = await this.toStaff(
        'SUPER_ADMIN',
        (lang) => this.purchasedText(list, lang),
        (lang) => this.purchasedButtons(lang, list.event?.id),
      );
      await this.saveRefs(id, { purchased: refs });
    });
  }

  /** The sum was corrected: keep the report in Telegram right. */
  notifyPriceFixed(id: string) {
    return this.safely('Xarid hisoboti tahrirlanmadi', async () => {
      const list = await this.loadList(id);
      if (!list || (list.status !== 'PURCHASED' && list.status !== 'CLOSED')) {
        return;
      }
      const refs =
        ((list.telegramMessages ?? {}) as ListMessages).purchased ?? [];
      await this.edit(refs, (lang) => ({
        text: this.purchasedText(list, lang),
        buttons: this.purchasedButtons(lang, list.event?.id),
      }));
    });
  }

  // ------------------------------------------------------ Taken from the store

  /** A chef took products from the store for a wedding: list them for the super admins. */
  notifyStockUsage(id: string) {
    return this.safely('Ombor xabari yuborilmadi', async () => {
      const usage = await this.prisma.stockUsage.findUnique({
        where: { id },
        include: {
          items: { orderBy: { name: 'asc' } },
          worker: { select: { fullName: true } },
          event: {
            select: {
              id: true,
              clientName: true,
              clientNameRu: true,
              eventDate: true,
              guestCount: true,
            },
          },
        },
      });
      if (!usage) return;
      // Only super admins get this message, so the cost may be shown.
      const unpriced = usage.items.filter((i) => i.totalCost === null).length;
      const total = usage.items.reduce(
        (sum, i) => sum + Number(i.totalCost ?? 0),
        0,
      );
      const refs = await this.toStaff(
        'SUPER_ADMIN',
        (lang) => {
          const t = BOT_TEXT[lang];
          const rows = usage.items.map(
            (i) =>
              `• ${i.name} — ${fmtQty(i.quantity)} ${this.unit(i.unit, lang)}`,
          );
          const cost =
            unpriced === usage.items.length
              ? t.stockNoPrice
              : t.stockTotal(money(total, lang), unpriced);
          return t.stockUsage(
            `${this.clientName(usage.event, lang)} — ${dayMonth(usage.event.eventDate, lang, this.timeZone)}, ${t.guests(usage.event.guestCount)}`,
            usage.worker.fullName,
            rows.join('\n'),
            cost,
          );
        },
        (lang) => [
          {
            text: BOT_TEXT[lang].eventCard,
            url: `${this.webUrl}/dashboard/events/${usage.event.id}`,
          },
          {
            text: BOT_TEXT[lang].storeButton,
            url: `${this.webUrl}/dashboard/inventory`,
          },
        ],
      );
      await this.prisma.stockUsage.update({
        where: { id },
        data: { telegramMessages: refs as object },
      });
    });
  }

  /** The products went back to the store: say so under the original message. */
  notifyStockReturned(stored: unknown, byName: string) {
    return this.safely('Qaytarish xabari yuborilmadi', async () => {
      const refs = (Array.isArray(stored) ? stored : []) as MessageRef[];
      for (const ref of refs) {
        const lang = await this.chatLang(ref.chatId);
        await this.call('sendMessage', {
          chat_id: ref.chatId,
          text: BOT_TEXT[lang].returned(byName),
          reply_parameters: {
            message_id: ref.messageId,
            allow_sending_without_reply: true,
          },
        }).catch((err: Error) =>
          this.logger.warn(`Qaytarish xabari: ${err.message}`),
        );
      }
    });
  }
}

type LoadedList = NonNullable<Awaited<ReturnType<TelegramService['loadList']>>>;
