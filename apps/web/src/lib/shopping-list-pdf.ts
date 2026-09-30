"use client";

import { jsPDF } from "jspdf";
import { UNIT_LABELS_UZ } from "@iqbol/shared";
import type { ShoppingList } from "@/lib/types";
import { formatDate, formatDateTime, formatSom } from "@/lib/utils";
import { trText } from "@/i18n/tr";
import type { Locale } from "@/i18n/types";

function slug(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

export function downloadShoppingListPdf(list: ShoppingList, locale: Locale = "uz") {
  const tr = (text: string) => trText(locale, text);
  const doc = new jsPDF();
  const left = 14;
  const right = 196;
  let y = 18;

  doc.setFontSize(16);
  doc.text(tr("Bozorlik ro'yxati"), left, y);
  y += 9;

  doc.setFontSize(10);
  doc.text(tr(`Yuborilgan: ${formatDateTime(list.createdAt, locale)}`), left, y);
  y += 6;
  doc.text(tr(`Yubordi: ${list.createdByWorker.fullName}`), left, y);
  y += 6;
  if (list.event) {
    doc.text(tr(`To'y: ${list.event.clientName} — ${formatDate(list.event.eventDate, locale)}`), left, y);
    y += 6;
  }
  y += 4;

  doc.setFontSize(11);
  doc.text(tr("Mahsulot"), left, y);
  doc.text(tr("Miqdor"), 105, y);
  doc.text(tr("1 dona narxi"), 140, y);
  doc.text(tr("Holati"), 175, y);
  y += 2;
  doc.line(left, y, right, y);
  y += 7;

  doc.setFontSize(10);
  let total = 0;
  for (const item of list.items) {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    const itemTotal =
      item.totalCost != null ? Number(item.totalCost) : item.unitPrice ? Number(item.unitPrice) * Number(item.quantity) : 0;
    total += itemTotal;

    doc.text(item.name, left, y, { maxWidth: 88 });
    doc.text(`${item.quantity} ${tr(UNIT_LABELS_UZ[item.unit])}`, 105, y);
    doc.text(item.unitPrice ? formatSom(item.unitPrice, locale) : "-", 140, y);
    doc.text(item.isPurchased ? tr("Olindi") : tr("Kutilmoqda"), 175, y);
    y += 7;
  }

  y += 2;
  doc.line(left, y, right, y);
  y += 8;
  doc.setFontSize(12);
  doc.text(tr(`Jami: ${formatSom(total, locale)}`), left, y);

  const parts = ["bozorlik", list.event ? slug(list.event.clientName) : "royxat", slug(formatDate(list.createdAt))];
  doc.save(`${parts.join("_")}.pdf`);
}
