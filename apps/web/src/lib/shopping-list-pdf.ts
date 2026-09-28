"use client";

import { jsPDF } from "jspdf";
import { UNIT_LABELS_UZ } from "@shodiyora/shared";
import type { ShoppingList } from "@/lib/types";
import { formatDate, formatDateTime, formatSom } from "@/lib/utils";

function slug(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

export function downloadShoppingListPdf(list: ShoppingList) {
  const doc = new jsPDF();
  const left = 14;
  const right = 196;
  let y = 18;

  doc.setFontSize(16);
  doc.text("Bozorlik ro'yxati", left, y);
  y += 9;

  doc.setFontSize(10);
  doc.text(`Yuborilgan: ${formatDateTime(list.createdAt)}`, left, y);
  y += 6;
  doc.text(`Yubordi: ${list.createdByWorker.fullName}`, left, y);
  y += 6;
  if (list.event) {
    doc.text(`To'y: ${list.event.clientName} — ${formatDate(list.event.eventDate)}`, left, y);
    y += 6;
  }
  y += 4;

  doc.setFontSize(11);
  doc.text("Mahsulot", left, y);
  doc.text("Miqdor", 105, y);
  doc.text("1 dona narxi", 140, y);
  doc.text("Holati", 175, y);
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
    doc.text(`${item.quantity} ${UNIT_LABELS_UZ[item.unit]}`, 105, y);
    doc.text(item.unitPrice ? formatSom(item.unitPrice) : "-", 140, y);
    doc.text(item.isPurchased ? "Olindi" : "Kutilmoqda", 175, y);
    y += 7;
  }

  y += 2;
  doc.line(left, y, right, y);
  y += 8;
  doc.setFontSize(12);
  doc.text(`Jami: ${formatSom(total)}`, left, y);

  const parts = ["bozorlik", list.event ? slug(list.event.clientName) : "royxat", slug(formatDate(list.createdAt))];
  doc.save(`${parts.join("_")}.pdf`);
}
