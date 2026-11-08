import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { netPaid } from '../common/money/net-paid';
import { TZ_OFFSET_MS, localMidnight } from '../common/time/tashkent';

export const REPORT_KINDS = ['ACCOUNTING', 'ARCHIVE'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_PERIODS = [
  'THIS_MONTH',
  'LAST_MONTH',
  'THIS_YEAR',
  'ALL',
] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  THIS_MONTH: 'Shu oy',
  LAST_MONTH: "O'tgan oy",
  THIS_YEAR: 'Shu yil',
  ALL: 'Butun davr',
};

const STATUS_UZ: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  CONFIRMED: 'Tasdiqlangan',
  COMPLETED: 'Yakunlangan',
  CANCELLED: 'Bekor qilingan',
};

const EXPENSE_UZ: Record<string, string> = {
  SHOPPING: 'Bozorlik',
  STOCK: 'Ombor mahsulotlari',
  CAMERAMAN: 'Kamerachi',
  ARTIST: "San'atkor",
  KORTEJ: 'Kortej',
  CHEF: "Oshpazga to'lov",
  WAITERS: "Afitsantlarga to'lov",
  ZAVZAL: "Zavzalga to'lov",
  CARWASH: 'Moyka',
  OTHER: 'Boshqa',
};

const METHOD_UZ: Record<string, string> = {
  CASH: 'Naqd',
  CARD: 'Karta',
  TRANSFER: "O'tkazma",
};

const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

export interface ReportFile {
  buffer: Buffer;
  filename: string;
  /** One line for the Telegram caption. */
  caption: string;
}

type Align = 'left' | 'right';
interface Column {
  title: string;
  width: number;
  align?: Align;
}

const zero = () => new Prisma.Decimal(0);

function som(value: Prisma.Decimal | number) {
  return `${Math.round(Number(value)).toLocaleString('ru-RU')} so'm`;
}

function num(value: Prisma.Decimal | number) {
  return Math.round(Number(value)).toLocaleString('ru-RU');
}

/** Tashkent wall-clock parts of an instant. */
function local(date: Date) {
  const d = new Date(date.getTime() + TZ_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateText(date: Date) {
  const t = local(date);
  return `${pad(t.day)}.${pad(t.month + 1)}.${t.year}`;
}

function dateTimeText(date: Date) {
  const t = local(date);
  return `${dateText(date)} ${pad(t.hour)}:${pad(t.minute)}`;
}

/** UTC instant of Tashkent midnight on the given local calendar date. */
function localDate(year: number, month: number, day = 1) {
  return new Date(Date.UTC(year, month, day) - TZ_OFFSET_MS);
}

function fontDir() {
  const candidates = [
    path.resolve(__dirname, '../../../assets/fonts'),
    path.resolve(process.cwd(), 'assets/fonts'),
    path.resolve(process.cwd(), 'apps/api/assets/fonts'),
  ];
  return candidates.find((dir) => existsSync(path.join(dir, 'DejaVuSans.ttf')));
}

/**
 * PDF reports for the super admin — the accounting summary and the wedding
 * archive — sent by the Telegram bot or downloaded from the site.
 *
 * Money follows the accounting page: only weddings whose day has come count
 * (no projected income), cancelled ones included for money that really
 * moved (a kept deposit, costs already paid).
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  range(period: ReportPeriod, now = new Date()) {
    const t = local(now);
    switch (period) {
      case 'THIS_MONTH':
        return {
          from: localDate(t.year, t.month),
          to: localDate(t.year, t.month + 1),
          label: `${MONTHS_UZ[t.month]} ${t.year}`,
        };
      case 'LAST_MONTH': {
        const year = t.month === 0 ? t.year - 1 : t.year;
        const month = t.month === 0 ? 11 : t.month - 1;
        return {
          from: localDate(year, month),
          to: localDate(year, month + 1),
          label: `${MONTHS_UZ[month]} ${year}`,
        };
      }
      case 'THIS_YEAR':
        return {
          from: localDate(t.year, 0),
          to: localDate(t.year + 1, 0),
          label: `${t.year}-yil`,
        };
      default:
        return { from: undefined, to: undefined, label: PERIOD_LABELS.ALL };
    }
  }

  async build(kind: ReportKind, period: ReportPeriod): Promise<ReportFile> {
    if (!REPORT_KINDS.includes(kind) || !REPORT_PERIODS.includes(period)) {
      throw new BadRequestException("Hisobot turi yoki davri noto'g'ri");
    }
    return kind === 'ACCOUNTING'
      ? this.accounting(period)
      : this.archive(period);
  }

  // ------------------------------------------------------------ Accounting

  private async accounting(period: ReportPeriod): Promise<ReportFile> {
    const { from, to, label } = this.range(period);
    const startOfTomorrow = localMidnight(new Date(), 1);
    const until = to && to < startOfTomorrow ? to : startOfTomorrow;

    const [events, debtors, brand] = await Promise.all([
      this.prisma.event.findMany({
        where: { eventDate: { gte: from, lt: until } },
        include: {
          payments: true,
          expenses: true,
          menu: { select: { name: true } },
        },
        orderBy: { eventDate: 'asc' },
      }),
      this.prisma.event.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { payments: true },
        orderBy: { eventDate: 'asc' },
      }),
      this.brandName(),
    ]);

    const live = events.filter((e) => e.status !== 'CANCELLED');
    const paidOf = (e: (typeof events)[number]) => netPaid(e.payments);
    const spentOf = (e: (typeof events)[number]) =>
      e.expenses.reduce((s, x) => s.add(x.amount), zero());

    const expected = live.reduce((s, e) => s.add(e.totalPrice), zero());
    const collected = events.reduce((s, e) => s.add(paidOf(e)), zero());
    const spent = events.reduce((s, e) => s.add(spentOf(e)), zero());
    const outstanding = live.reduce(
      (s, e) => s.add(e.totalPrice.sub(paidOf(e))),
      zero(),
    );

    const byCategory = new Map<string, Prisma.Decimal>();
    const byMethod = new Map<string, Prisma.Decimal>();
    for (const e of events) {
      for (const x of e.expenses) {
        byCategory.set(
          x.category,
          (byCategory.get(x.category) ?? zero()).add(x.amount),
        );
      }
      for (const p of e.payments) {
        const signed = p.type === 'REFUND' ? p.amount.neg() : p.amount;
        byMethod.set(p.method, (byMethod.get(p.method) ?? zero()).add(signed));
      }
    }

    const owing = debtors
      .map((e) => ({ e, balance: e.totalPrice.sub(netPaid(e.payments)) }))
      .filter((d) => d.balance.greaterThan(0))
      .sort((a, b) => b.balance.comparedTo(a.balance));

    const pdf = this.document();
    this.title(pdf, `${brand} — Hisob-kitob`, label);
    this.stats(pdf, [
      ["To'ylar", String(live.length)],
      ['Kelishilgan summa', som(expected)],
      ["To'langan (qaytarishlar ayirilgan)", som(collected)],
      ['Xarajatlar', som(spent)],
      ['Sof foyda', som(collected.sub(spent))],
      ['Qolgan qarz (shu davr)', som(outstanding)],
    ]);

    if (byCategory.size > 0 || byMethod.size > 0) {
      this.heading(pdf, "Xarajatlar va to'lov usullari");
      this.table(
        pdf,
        [
          { title: 'Xarajat turi', width: 260 },
          { title: 'Summa', width: 140, align: 'right' },
        ],
        [...byCategory.entries()]
          .sort((a, b) => b[1].comparedTo(a[1]))
          .map(([k, v]) => [EXPENSE_UZ[k] ?? k, som(v)]),
      );
      if (byMethod.size > 0) {
        pdf.moveDown(0.6);
        this.table(
          pdf,
          [
            { title: "To'lov usuli", width: 260 },
            { title: 'Summa', width: 140, align: 'right' },
          ],
          [...byMethod.entries()].map(([k, v]) => [METHOD_UZ[k] ?? k, som(v)]),
        );
      }
    }

    this.heading(pdf, "To'ylar bo'yicha");
    if (events.length === 0) {
      this.note(pdf, "Bu davrda to'y bo'lmagan.");
    } else {
      this.table(
        pdf,
        [
          { title: 'Sana', width: 62 },
          { title: 'Mijoz', width: 150 },
          { title: 'Mehmon', width: 56, align: 'right' },
          { title: 'Menyu', width: 92 },
          { title: 'Holat', width: 78 },
          { title: 'Narx', width: 82, align: 'right' },
          { title: "To'langan", width: 82, align: 'right' },
          { title: 'Xarajat', width: 74, align: 'right' },
          { title: 'Foyda', width: 82, align: 'right' },
        ],
        events.map((e) => {
          const paid = paidOf(e);
          const exp = spentOf(e);
          return [
            dateText(e.eventDate),
            e.clientName,
            String(e.guestCount),
            e.menu.name,
            STATUS_UZ[e.status] ?? e.status,
            e.status === 'CANCELLED' ? '—' : num(e.totalPrice),
            num(paid),
            num(exp),
            num(paid.sub(exp)),
          ];
        }),
        [
          'Jami',
          '',
          String(live.reduce((s, e) => s + e.guestCount, 0)),
          '',
          '',
          num(expected),
          num(collected),
          num(spent),
          num(collected.sub(spent)),
        ],
      );
    }

    this.heading(pdf, "Qarzdor to'ylar (barcha sanalar)");
    if (owing.length === 0) {
      this.note(pdf, "Qarzdor to'y yo'q.");
    } else {
      this.table(
        pdf,
        [
          { title: 'Sana', width: 70 },
          { title: 'Mijoz', width: 190 },
          { title: 'Telefon', width: 110 },
          { title: 'Narx', width: 110, align: 'right' },
          { title: "To'langan", width: 110, align: 'right' },
          { title: 'Qarz', width: 110, align: 'right' },
        ],
        owing.map(({ e, balance }) => [
          dateText(e.eventDate),
          e.clientName,
          e.clientPhone,
          num(e.totalPrice),
          num(netPaid(e.payments)),
          num(balance),
        ]),
        [
          'Jami',
          '',
          '',
          '',
          '',
          num(owing.reduce((s, d) => s.add(d.balance), zero())),
        ],
      );
    }

    return {
      buffer: await this.finish(pdf),
      filename: `hisob-kitob-${this.slug(label)}.pdf`,
      caption: `📊 Hisob-kitob — ${label}. Sof foyda: ${som(collected.sub(spent))}`,
    };
  }

  // --------------------------------------------------------------- Archive

  private async archive(period: ReportPeriod): Promise<ReportFile> {
    const { from, to, label } = this.range(period);
    const startOfToday = localMidnight(new Date());
    const until = to && to < startOfToday ? to : startOfToday;

    const [events, brand] = await Promise.all([
      this.prisma.event.findMany({
        where: { eventDate: { gte: from, lt: until } },
        include: {
          payments: true,
          expenses: true,
          menu: { select: { name: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: { eventDate: 'desc' },
      }),
      this.brandName(),
    ]);

    const counts = new Map<string, number>();
    for (const e of events) {
      counts.set(e.status, (counts.get(e.status) ?? 0) + 1);
    }
    const live = events.filter((e) => e.status !== 'CANCELLED');

    const pdf = this.document();
    this.title(pdf, `${brand} — To'ylar arxivi`, label);
    this.stats(pdf, [
      ["O'tgan to'ylar", String(events.length)],
      ...[...counts.entries()].map(
        ([k, v]) => [STATUS_UZ[k] ?? k, String(v)] as [string, string],
      ),
      ['Jami mehmonlar', String(live.reduce((s, e) => s + e.guestCount, 0))],
    ]);

    this.heading(pdf, "To'ylar ro'yxati");
    if (events.length === 0) {
      this.note(pdf, "Bu davrda o'tgan to'y yo'q.");
    } else {
      this.table(
        pdf,
        [
          { title: 'Sana', width: 84 },
          { title: 'Mijoz', width: 130 },
          { title: 'Telefon', width: 88 },
          { title: 'Mehmon', width: 54, align: 'right' },
          { title: 'Menyu', width: 84 },
          { title: 'Taomlar', width: 110 },
          { title: 'Holat', width: 70 },
          { title: 'Narx', width: 74, align: 'right' },
          { title: 'Qarz', width: 64, align: 'right' },
        ],
        events.map((e) => {
          const balance =
            e.status === 'CANCELLED'
              ? zero()
              : e.totalPrice.sub(netPaid(e.payments));
          return [
            dateTimeText(e.eventDate),
            e.clientName,
            e.clientPhone,
            String(e.guestCount),
            e.menu.name,
            [e.firstDish, e.secondDish].filter(Boolean).join(', ') || '—',
            STATUS_UZ[e.status] ?? e.status,
            e.status === 'CANCELLED' ? '—' : num(e.totalPrice),
            balance.greaterThan(0) ? num(balance) : '—',
          ];
        }),
      );
    }

    return {
      buffer: await this.finish(pdf),
      filename: `arxiv-${this.slug(label)}.pdf`,
      caption: `🗂 To'ylar arxivi — ${label}: ${events.length} ta to'y`,
    };
  }

  // ------------------------------------------------------------ PDF helpers

  private async brandName() {
    const settings = await this.prisma.appSettings.findUnique({
      where: { id: 'app' },
      select: { brandName: true },
    });
    return settings?.brandName || 'Iqbol';
  }

  private slug(label: string) {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private document() {
    const pdf = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      bufferPages: true,
      info: { Title: 'Hisobot', Producer: 'Iqbol' },
    });
    const dir = fontDir();
    if (dir) {
      pdf.registerFont('Body', path.join(dir, 'DejaVuSans.ttf'));
      pdf.registerFont('Bold', path.join(dir, 'DejaVuSans-Bold.ttf'));
    } else {
      // Without the bundled fonts Cyrillic would not render; Latin still does.
      pdf.registerFont('Body', 'Helvetica');
      pdf.registerFont('Bold', 'Helvetica-Bold');
    }
    pdf.font('Body');
    return pdf;
  }

  private finish(pdf: PDFKit.PDFDocument): Promise<Buffer> {
    const chunks: Buffer[] = [];
    pdf.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
    });
    const range = pdf.bufferedPageRange();
    const printed = `Tayyorlandi: ${dateTimeText(new Date())}`;
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      // Writing below the bottom margin would otherwise open a new page.
      pdf.page.margins.bottom = 0;
      const bottom = pdf.page.height - 24;
      pdf
        .font('Body')
        .fontSize(8)
        .fillColor('#888888')
        .text(printed, 36, bottom, { lineBreak: false })
        .text(`${i + 1} / ${range.count}`, pdf.page.width - 96, bottom, {
          width: 60,
          align: 'right',
          lineBreak: false,
        });
    }
    pdf.end();
    return done;
  }

  private title(pdf: PDFKit.PDFDocument, title: string, label: string) {
    pdf.font('Bold').fontSize(18).fillColor('#1f2a24').text(title);
    pdf.font('Body').fontSize(11).fillColor('#555555').text(`Davr: ${label}`);
    pdf.moveDown(0.8);
  }

  private heading(pdf: PDFKit.PDFDocument, text: string) {
    // Room for the heading, a table header and its first row together.
    this.ensureSpace(pdf, 110);
    pdf.moveDown(0.8);
    pdf.font('Bold').fontSize(13).fillColor('#1f2a24').text(text, 36);
    pdf.moveDown(0.3);
  }

  private note(pdf: PDFKit.PDFDocument, text: string) {
    pdf.font('Body').fontSize(10).fillColor('#666666').text(text, 36);
  }

  /** Label/value tiles, three per row. */
  private stats(pdf: PDFKit.PDFDocument, items: [string, string][]) {
    const perRow = 3;
    const gap = 10;
    const width = (pdf.page.width - 72 - gap * (perRow - 1)) / perRow;
    const height = 44;
    for (let i = 0; i < items.length; i += perRow) {
      this.ensureSpace(pdf, height + gap);
      const y = pdf.y;
      items.slice(i, i + perRow).forEach(([label, value], j) => {
        const x = 36 + j * (width + gap);
        pdf
          .roundedRect(x, y, width, height, 6)
          .fillAndStroke('#f3f5f2', '#dfe5dc');
        pdf
          .font('Body')
          .fontSize(8.5)
          .fillColor('#666666')
          .text(label, x + 10, y + 8, { width: width - 20, lineBreak: false });
        pdf
          .font('Bold')
          .fontSize(13)
          .fillColor('#1f2a24')
          .text(value, x + 10, y + 21, { width: width - 20, lineBreak: false });
      });
      pdf.x = 36;
      pdf.y = y + height + gap;
    }
  }

  private ensureSpace(pdf: PDFKit.PDFDocument, needed: number) {
    if (pdf.y + needed > pdf.page.height - 48) {
      pdf.addPage();
      pdf.y = 36;
    }
  }

  /** A simple grid with a repeating header and an optional bold total row. */
  private table(
    pdf: PDFKit.PDFDocument,
    columns: Column[],
    rows: string[][],
    total?: string[],
  ) {
    const padX = 4;
    const fontSize = 8.5;
    const left = 36;
    const tableWidth = columns.reduce((s, c) => s + c.width, 0);

    const rowHeight = (cells: string[], font: string) => {
      pdf.font(font).fontSize(fontSize);
      return (
        Math.max(
          ...cells.map((cell, i) =>
            pdf.heightOfString(cell || ' ', {
              width: columns[i].width - padX * 2,
            }),
          ),
        ) + 8
      );
    };

    const drawRow = (cells: string[], font: string, fill?: string) => {
      const h = rowHeight(cells, font);
      if (pdf.y + h > pdf.page.height - 48) {
        pdf.addPage();
        pdf.y = 36;
        drawHeader();
      }
      const y = pdf.y;
      if (fill) pdf.rect(left, y, tableWidth, h).fill(fill);
      let x = left;
      pdf.font(font).fontSize(fontSize).fillColor('#1f2a24');
      cells.forEach((cell, i) => {
        pdf.text(cell ?? '', x + padX, y + 4, {
          width: columns[i].width - padX * 2,
          align: columns[i].align ?? 'left',
        });
        x += columns[i].width;
      });
      pdf
        .moveTo(left, y + h)
        .lineTo(left + tableWidth, y + h)
        .lineWidth(0.5)
        .strokeColor('#dfe5dc')
        .stroke();
      pdf.x = left;
      pdf.y = y + h;
    };

    const drawHeader = () =>
      drawRow(
        columns.map((c) => c.title),
        'Bold',
        '#e7ece4',
      );

    // The header never sits alone at the foot of a page.
    this.ensureSpace(pdf, 60);
    drawHeader();
    rows.forEach((row, i) =>
      drawRow(row, 'Body', i % 2 === 1 ? '#fafbf9' : undefined),
    );
    if (total) drawRow(total, 'Bold', '#eef2ec');
  }
}
