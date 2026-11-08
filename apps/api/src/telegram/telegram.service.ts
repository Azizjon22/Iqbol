import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  PERIOD_LABELS,
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
  from?: { first_name?: string; last_name?: string; username?: string };
  text?: string;
  contact?: { phone_number: string };
}

interface LinkButton {
  text: string;
  url: string;
}

interface TgCallback {
  id: string;
  from: { id: number };
  message?: { chat: { id: number; type: string } };
  data?: string;
}

const REPORT_TITLES: Record<ReportKind, string> = {
  ACCOUNTING: '📊 Hisob-kitob',
  ARCHIVE: '🗂 Arxiv',
};

const WEDDING_BUTTON = "🧾 To'y xarajatlari";

/** A sent message, kept so it can be edited when the list changes. */
interface MessageRef {
  chatId: string;
  messageId: number;
}

/** Stored on the list: the super admins' copies of each announcement. */
interface ListMessages {
  submitted?: MessageRef[];
  purchased?: MessageRef[];
}

const LIST_INCLUDE = {
  items: { orderBy: { name: 'asc' as const } },
  createdByWorker: { select: { fullName: true } },
  event: {
    select: { id: true, clientName: true, eventDate: true, guestCount: true },
  },
};

function fmtSom(value: unknown) {
  return `${Math.round(Number(value ?? 0)).toLocaleString('ru-RU')} so'm`;
}

/** Where a chat is in the "phone, then code" linking conversation. */
type Pending =
  { step: 'PHONE' } | { step: 'CODE'; phone: string; kind: 'WORKER' | 'STAFF' };

const UNIT_UZ: Record<string, string> = {
  KG: 'kg',
  LITER: 'litr',
  DONA: 'dona',
};

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
 * Telegram bot for shopping lists, run inside the API by long polling (no
 * webhook, so it works from localhost).
 *
 * - Chefs and super admins link their chat with the same phone + PIN/password
 *   they log in with; an unknown phone is reported to the super admins.
 * - At TELEGRAM_REMINDER_TIMES every linked chef is reminded about tomorrow's
 *   weddings that still have no shopping list, and every linked super admin
 *   about lists they have not opened yet.
 * - A freshly submitted list is announced to the super admins at once.
 * - Super admins get the accounting summary and the wedding archive as PDF
 *   files (/hisobot, /arxiv, or the keyboard buttons).
 * - With an https TELEGRAM_WEB_URL every site link opens as a Telegram mini
 *   app (signed in through /tg), and the chat's menu button opens it too.
 *
 * Without TELEGRAM_BOT_TOKEN the whole service stays off.
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

  /** The command list, and the menu button that opens the mini app. */
  private async setUp() {
    await this.call('setMyCommands', {
      commands: [
        { command: 'start', description: 'Botni ulash' },
        { command: 'tekshir', description: 'Eslatmalarni hozir tekshirish' },
        { command: 'hisobot', description: 'Hisob-kitob (PDF, super admin)' },
        { command: 'arxiv', description: "To'ylar arxivi (PDF, super admin)" },
        {
          command: 'toy',
          description: "Bitta to'y xarajatlari — mijoz uchun PDF",
        },
        { command: 'chiqish', description: 'Botdan uzish' },
      ],
    }).catch((err: Error) => this.logger.warn(`setMyCommands: ${err.message}`));
    await this.call('setChatMenuButton', {
      menu_button: this.miniApp
        ? {
            type: 'web_app',
            text: 'Ilova',
            web_app: { url: `${this.webUrl}/tg` },
          }
        : { type: 'commands' },
    }).catch((err: Error) =>
      this.logger.warn(`setChatMenuButton: ${err.message}`),
    );
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
        signal,
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

  /** Rewrites messages sent earlier, e.g. after the list was edited. */
  private async edit(refs: MessageRef[], text: string, buttons: LinkButton[]) {
    for (const ref of refs) {
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

    if (text === '/start' || text === '/ulash') {
      const linked = await this.linkedAccount(chatId);
      if (linked && text === '/start') {
        await this.send(
          chatId,
          `${linked.fullName}, siz allaqachon ulangansiz.\n\n/tekshir — eslatmalarni hozir tekshirish` +
            (linked.role === 'SUPER_ADMIN'
              ? "\n/hisobot — hisob-kitob (PDF)\n/arxiv — to'ylar arxivi (PDF)\n/toy — bitta to'y xarajatlari (PDF)"
              : '') +
            '\n/chiqish — botdan uzish',
          this.homeButton(linked.kind),
        );
        if (linked.role === 'SUPER_ADMIN') await this.reportKeyboard(chatId);
        return;
      }
      this.pending.set(chatId, { step: 'PHONE' });
      await this.call('sendMessage', {
        chat_id: chatId,
        text: 'Assalomu alaykum! Tizimga kiradigan telefon raqamingizni yuboring (masalan, +998901234567) yoki pastdagi tugmani bosing.',
        reply_markup: {
          keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return;
    }

    if (text === '/chiqish') {
      await this.unlink(chatId);
      this.pending.delete(chatId);
      await this.send(
        chatId,
        'Bot hisobingizdan uzildi. Qayta ulash uchun /start bosing.',
      );
      return;
    }

    if (text === '/toy' || text === WEDDING_BUTTON) {
      const linked = await this.linkedAccount(chatId);
      if (linked?.role !== 'SUPER_ADMIN') {
        await this.send(chatId, 'Hisobotlar faqat super admin uchun.');
        return;
      }
      await this.weddingPicker(chatId);
      return;
    }

    const reportKind: ReportKind | null =
      text === '/hisobot' || text === REPORT_TITLES.ACCOUNTING
        ? 'ACCOUNTING'
        : text === '/arxiv' || text === REPORT_TITLES.ARCHIVE
          ? 'ARCHIVE'
          : null;
    if (reportKind) {
      const linked = await this.linkedAccount(chatId);
      if (linked?.role !== 'SUPER_ADMIN') {
        await this.send(chatId, 'Hisobotlar faqat super admin uchun.');
        return;
      }
      await this.call('sendMessage', {
        chat_id: chatId,
        text: `${REPORT_TITLES[reportKind]} — qaysi davr uchun?`,
        reply_markup: {
          inline_keyboard: [
            REPORT_PERIODS.slice(0, 2).map((p) => ({
              text: PERIOD_LABELS[p],
              callback_data: `rep:${reportKind}:${p}`,
            })),
            REPORT_PERIODS.slice(2).map((p) => ({
              text: PERIOD_LABELS[p],
              callback_data: `rep:${reportKind}:${p}`,
            })),
          ],
        },
      });
      return;
    }

    if (text === '/tekshir') {
      const linked = await this.linkedAccount(chatId);
      if (!linked) {
        await this.send(chatId, 'Avval /start orqali ulaning.');
        return;
      }
      if (linked.kind !== 'WORKER') {
        await this.send(
          chatId,
          "Bozorlikni oshpazlar o'zi yozib, tasdiqlab, xarid qiladi — tayyor bo'lganda shu yerga xabar keladi.",
        );
        return;
      }
      const sent = await this.remindChefs(String(chatId));
      if (sent === 0) {
        await this.send(
          chatId,
          "Ertangi to'ylar uchun bozorlik yozilgan va tasdiqlangan.",
        );
      }
      return;
    }

    const state = this.pending.get(chatId);
    if (!state) {
      await this.send(chatId, 'Boshlash uchun /start bosing.');
      return;
    }

    if (state.step === 'PHONE') {
      const phone = normalizePhone(msg.contact?.phone_number ?? text);
      if (!phone) {
        await this.send(
          chatId,
          "Telefon raqami noto'g'ri. Masalan: +998901234567",
        );
        return;
      }
      await this.onPhone(msg, phone);
      return;
    }

    await this.onCode(msg, state, text);
  }

  private async onPhone(msg: TgMessage, phone: string) {
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
        text: "Bu raqam tizimda oshpaz yoki admin sifatida ro'yxatdan o'tmagan. Super adminga xabar berildi.",
        reply_markup: { remove_keyboard: true },
      }).catch(() => undefined);
      const who = [msg.from?.first_name, msg.from?.last_name]
        .filter(Boolean)
        .join(' ');
      await this.toSuperAdmins(
        `⚠️ Botga ruxsatsiz kirishga urinish.\n\nRaqam: ${phone}\nTelegram: ${who || "noma'lum"}${msg.from?.username ? ` (@${msg.from.username})` : ''}\n\nBu raqam bazada oshpaz yoki admin sifatida yo'q.`,
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
      text: chef
        ? 'Endi tizimga kiradigan 4 xonali PIN kodingizni yozing.'
        : 'Endi tizimga kiradigan parolingizni yozing.',
      reply_markup: { remove_keyboard: true },
    });
  }

  private async onCode(
    msg: TgMessage,
    state: Extract<Pending, { step: 'CODE' }>,
    code: string,
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

      await this.unlink(chatId);
      if (state.kind === 'WORKER') {
        await this.prisma.worker.update({
          where: { id: user.id },
          data: { telegramChatId: String(chatId) },
        });
      } else {
        await this.prisma.staffUser.update({
          where: { id: user.id },
          data: { telegramChatId: String(chatId) },
        });
      }
      this.pending.delete(chatId);
      await this.send(
        chatId,
        state.kind === 'WORKER'
          ? `✅ ${user.fullName}, bot ulandi.\n\nErtangi to'ylar uchun bozorlik yozilmagan bo'lsa, soat ${this.reminderTimes.join(' va ')} da eslatma keladi.`
          : (user as { role?: string }).role === 'ADMIN'
            ? `✅ ${user.fullName}, bot ulandi.\n\nSuper admin bozorlik ro'yxatini tasdiqlasa, shu yerga xabar keladi.`
            : `✅ ${user.fullName}, bot ulandi.\n\nOshpaz bozorlik yuborsa, shu yerga xabar keladi. Ko'rilmagan ro'yxatlar soat ${this.reminderTimes.join(' va ')} da eslatiladi.`,
        this.homeButton(state.kind),
      );
      if ((user as { role?: string }).role === 'SUPER_ADMIN') {
        await this.reportKeyboard(chatId);
      }
    } catch (err) {
      await this.send(
        chatId,
        `${(err as Error).message || "Kod noto'g'ri"}\n\nQayta yozing yoki /start bilan boshidan boshlang.`,
      );
    }
  }

  /** Two always-visible buttons for the super admin's PDF reports. */
  private async reportKeyboard(chatId: number) {
    await this.call('sendMessage', {
      chat_id: chatId,
      text: "Hisobotlarni PDF ko'rinishida olish uchun pastdagi tugmalardan foydalaning.",
      reply_markup: {
        keyboard: [
          [{ text: REPORT_TITLES.ACCOUNTING }, { text: REPORT_TITLES.ARCHIVE }],
          [{ text: WEDDING_BUTTON }],
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
    if (linked?.role !== 'SUPER_ADMIN') {
      await this.call('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: 'Hisobotlar faqat super admin uchun.',
        show_alert: true,
      });
      return;
    }
    await this.call('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: 'Hisobot tayyorlanmoqda…',
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
  private async weddingPicker(chatId: number) {
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
      await this.send(chatId, "Hali o'tgan to'y yo'q.");
      return;
    }
    await this.call('sendMessage', {
      chat_id: chatId,
      text: "🧾 Qaysi to'yning xarajatlari kerak? (mijozga ko'rsatish uchun, mahsulot narxlarisiz)",
      reply_markup: {
        inline_keyboard: events.map((e) => [
          {
            text: `${e.eventDate.toLocaleDateString('uz-UZ', { timeZone: this.timeZone, day: '2-digit', month: '2-digit' })} — ${e.clientName}`.slice(
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
        { method: 'POST', body: form },
      );
      const data = (await res.json()) as { ok: boolean; description?: string };
      if (!data.ok) throw new Error(data.description ?? 'sendDocument failed');
      return true;
    } catch (err) {
      this.logger.error(`Hisobot yuborilmadi: ${(err as Error).message}`);
      await this.send(
        chatId,
        "Hisobotni tayyorlab bo'lmadi, birozdan keyin qayta urinib ko'ring.",
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

  private homeButton(kind: 'WORKER' | 'STAFF'): LinkButton {
    return kind === 'WORKER'
      ? { text: '📱 Oshpaz sahifasi', url: `${this.webUrl}/worker` }
      : { text: '📱 Ilovani ochish', url: `${this.webUrl}/dashboard` };
  }

  private async linkedAccount(chatId: number) {
    const id = String(chatId);
    const worker = await this.prisma.worker.findUnique({
      where: { telegramChatId: id },
    });
    if (worker)
      return {
        kind: 'WORKER' as const,
        fullName: worker.fullName,
        role: undefined,
      };
    const staff = await this.prisma.staffUser.findUnique({
      where: { telegramChatId: id },
    });
    if (staff)
      return {
        kind: 'STAFF' as const,
        fullName: staff.fullName,
        role: staff.role,
      };
    return null;
  }

  /** One chat belongs to one account at a time. */
  private async unlink(chatId: number) {
    const id = String(chatId);
    await this.prisma.worker.updateMany({
      where: { telegramChatId: id },
      data: { telegramChatId: null },
    });
    await this.prisma.staffUser.updateMany({
      where: { telegramChatId: id },
      data: { telegramChatId: null },
    });
  }

  /** Sends to every linked, active staff member of a role; returns what was sent. */
  private async toStaff(
    role: 'SUPER_ADMIN' | 'ADMIN',
    text: string,
    buttons: LinkButton | LinkButton[] = [],
  ): Promise<MessageRef[]> {
    const staff = await this.prisma.staffUser.findMany({
      where: { role, isActive: true, telegramChatId: { not: null } },
      select: { telegramChatId: true },
    });
    const refs: MessageRef[] = [];
    for (const member of staff) {
      const messageId = await this.send(member.telegramChatId!, text, buttons);
      if (messageId) refs.push({ chatId: member.telegramChatId!, messageId });
    }
    return refs;
  }

  private async toSuperAdmins(text: string, button?: LinkButton) {
    return (await this.toStaff('SUPER_ADMIN', text, button)).length;
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
      this.logger.log(`Eslatma ${time}: oshpazlarga ${chefs} ta xabar.`);
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
      select: { telegramChatId: true },
    });

    let sent = 0;
    for (const event of events) {
      const date = event.eventDate.toLocaleDateString('uz-UZ', {
        timeZone: this.timeZone,
        day: 'numeric',
        month: 'long',
      });
      const time = event.eventDate.toLocaleTimeString('uz-UZ', {
        timeZone: this.timeZone,
        hour: '2-digit',
        minute: '2-digit',
      });
      const dishes = [event.firstDish, event.secondDish]
        .filter(Boolean)
        .join(', ');
      const text =
        `🛒 Ertaga to'y bor — ${date}, soat ${time}\n\n` +
        `${event.clientName}\n${event.guestCount} mehmon` +
        (dishes ? `\nTaomlar: ${dishes}` : '') +
        (event.shoppingLists.length > 0
          ? `\n\nBozorlik ro'yxati yozilgan, lekin hali tasdiqlanmagan — tasdiqlab, xaridga chiqing.`
          : `\n\nShu sana uchun bozorlik yozishingiz kerak.`);
      for (const chef of chefs) {
        await this.send(chef.telegramChatId!, text, {
          text: 'Bozorlik yozish',
          url: `${this.webUrl}/worker/shopping?event=${event.id}`,
        });
        sent++;
      }
    }
    return sent;
  }

  // ------------------------------------------------------ List announcements

  private listsButton(): LinkButton {
    return {
      text: 'Bozorlikni ochish',
      url: `${this.webUrl}/dashboard/shopping-lists`,
    };
  }

  private loadList(id: string) {
    return this.prisma.shoppingList.findUnique({
      where: { id },
      include: LIST_INCLUDE,
    });
  }

  private listHead(
    list: NonNullable<Awaited<ReturnType<TelegramService['loadList']>>>,
  ) {
    const event = list.event
      ? `${list.event.clientName} — ${list.event.eventDate.toLocaleDateString('uz-UZ', { timeZone: this.timeZone, day: 'numeric', month: 'long' })}, ${list.event.guestCount} mehmon`
      : "To'ysiz ro'yxat";
    return `${event}\nOshpaz: ${list.createdByWorker.fullName}`;
  }

  /** What is to be bought. */
  private itemRows(
    list: NonNullable<Awaited<ReturnType<TelegramService['loadList']>>>,
  ) {
    const rows = list.items.slice(0, 40).map((i) => {
      const unit = UNIT_UZ[i.unit] ?? i.unit;
      let mark = '';
      if (i.originalQuantity && !i.originalQuantity.equals(i.quantity)) {
        mark = i.originalQuantity.isZero()
          ? " (qo'shildi)"
          : ` (oshpaz: ${fmtQty(i.originalQuantity)})`;
      }
      return `• ${i.name} — ${fmtQty(i.quantity)} ${unit}${mark}`;
    });
    if (list.items.length > rows.length) {
      rows.push(`… va yana ${list.items.length - rows.length} ta`);
    }
    return rows.join('\n');
  }

  private submittedText(
    list: NonNullable<Awaited<ReturnType<TelegramService['loadList']>>>,
  ) {
    return `🛒 Oshpaz bozorlik ro'yxatini tasdiqladi va xaridga chiqdi\n\n${this.listHead(list)}\n\n${this.itemRows(list)}`;
  }

  private purchasedText(
    list: NonNullable<Awaited<ReturnType<TelegramService['loadList']>>>,
  ) {
    const rows = list.items.slice(0, 40).map((i) => {
      const unit = UNIT_UZ[i.unit] ?? i.unit;
      const price = i.unitPrice ? ` × ${fmtSom(i.unitPrice)}` : '';
      return `• ${i.name} — ${fmtQty(i.quantity)} ${unit}${price} = ${fmtSom(i.totalCost)}`;
    });
    const total = list.items.reduce(
      (sum, i) => sum + Number(i.totalCost ?? 0),
      0,
    );
    return (
      `💰 Bozorlik xarid qilindi\n\n${this.listHead(list)}\n\n${rows.join('\n')}` +
      `\n\nJami: ${fmtSom(total)}` +
      (list.event ? "\nBu summa to'yning xarajatlariga o'zi yozildi." : '')
    );
  }

  /** Under the price report: the wedding's card, where the expense now sits. */
  private purchasedButtons(eventId?: string): LinkButton[] {
    const buttons = [this.listsButton()];
    if (eventId) {
      buttons.unshift({
        text: "To'y kartasi",
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

  /** A chef confirmed a list and went to buy it: tell the super admins. */
  notifyListSubmitted(id: string) {
    return this.safely("Yangi ro'yxat xabari yuborilmadi", async () => {
      const list = await this.loadList(id);
      if (!list) return;
      const refs = await this.toStaff(
        'SUPER_ADMIN',
        this.submittedText(list),
        this.listsButton(),
      );
      await this.saveRefs(id, { submitted: refs });
    });
  }

  /** Everything is bought and priced: report quantities and prices to the super admins. */
  notifyListPurchased(id: string) {
    return this.safely('Xarid hisoboti yuborilmadi', async () => {
      const list = await this.loadList(id);
      if (!list) return;
      const refs = await this.toStaff(
        'SUPER_ADMIN',
        this.purchasedText(list),
        this.purchasedButtons(list.event?.id),
      );
      await this.saveRefs(id, { purchased: refs });
    });
  }

  /** A price was corrected after purchase: keep the report in Telegram right. */
  notifyPriceFixed(id: string) {
    return this.safely('Xarid hisoboti tahrirlanmadi', async () => {
      const list = await this.loadList(id);
      if (!list || list.status !== 'PURCHASED') return;
      const refs =
        ((list.telegramMessages ?? {}) as ListMessages).purchased ?? [];
      await this.edit(
        refs,
        this.purchasedText(list),
        this.purchasedButtons(list.event?.id),
      );
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
              eventDate: true,
              guestCount: true,
            },
          },
        },
      });
      if (!usage) return;
      const date = usage.event.eventDate.toLocaleDateString('uz-UZ', {
        timeZone: this.timeZone,
        day: 'numeric',
        month: 'long',
      });
      const rows = usage.items.map(
        (i) =>
          `• ${i.name} — ${fmtQty(i.quantity)} ${UNIT_UZ[i.unit] ?? i.unit}`,
      );
      // Only super admins get this message, so the cost may be shown.
      const unpriced = usage.items.filter((i) => i.totalCost === null).length;
      const total = usage.items.reduce(
        (sum, i) => sum + Number(i.totalCost ?? 0),
        0,
      );
      const cost =
        unpriced === usage.items.length
          ? 'Narxi: omborda bu mahsulotlarga narx kiritilmagan'
          : `Jami: ${fmtSom(total)}` +
            (unpriced > 0 ? ` (${unpriced} ta mahsulot narxsiz)` : '');
      const refs = await this.toStaff(
        'SUPER_ADMIN',
        `📦 Ombordan shu to'yga olingan mahsulotlar\n\n` +
          `${usage.event.clientName} — ${date}, ${usage.event.guestCount} mehmon\n` +
          `Oshpaz: ${usage.worker.fullName}\n\n${rows.join('\n')}\n\n${cost}`,
        [
          {
            text: "To'y kartasi",
            url: `${this.webUrl}/dashboard/events/${usage.event.id}`,
          },
          { text: 'Ombor', url: `${this.webUrl}/dashboard/inventory` },
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
        await this.call('sendMessage', {
          chat_id: ref.chatId,
          text: `↩️ Bu mahsulotlar omborga qaytarildi (${byName}).`,
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
