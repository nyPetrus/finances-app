// Parser for Contabilizei Bank's exported statement CSV:
//   Data,Categoria,Lançamento,Descrição,Entrada,Saída,Saldo do dia
//   02/04/2026,Pessoa Jurídica,TED,ECUSTOMIZE ...,"R$ 5.000,00",-,"R$ 5.000,00"
// Pure string-in/rows-out so it stays independent of Drive and Supabase.

import { normalizeHeader, parseCsv } from "./csv-utils";
import type { ParsedStatementRow } from "./parsed-statement-row";

// "R$ 5.000,00" / "-R$ 4.000,00" / "-" → number | null. The space after
// "R$" is a non-breaking space in the real files; stripping everything but
// digits, comma and minus handles it.
function parseBrl(value: string): number | null {
  const cleaned = value.replace(/[^\d,-]/g, "");
  if (!/\d/.test(cleaned)) return null;
  const parsed = Number(cleaned.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseContabilizeiCsv(text: string): ParsedStatementRow[] {
  const [header, ...records] = parseCsv(text.replace(/^﻿/, ""));
  if (!header) throw new Error("The file is empty.");

  const columns = header.map(normalizeHeader);
  const dateIndex = columns.indexOf("data");
  const descriptionIndex = columns.indexOf("descricao");
  const incomeIndex = columns.indexOf("entrada");
  const expenseIndex = columns.indexOf("saida");
  const balanceIndex = columns.indexOf("saldo do dia");

  if ([dateIndex, descriptionIndex, incomeIndex, expenseIndex, balanceIndex].includes(-1)) {
    throw new Error("Unrecognized columns — expected Data, Descrição, Entrada, Saída, Saldo do dia.");
  }

  return records.map((record, index) => {
    const line = index + 2;
    const dateMatch = record[dateIndex]?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dateMatch) throw new Error(`Line ${line}: invalid date "${record[dateIndex] ?? ""}".`);

    const income = parseBrl(record[incomeIndex] ?? "") ?? 0;
    const expense = parseBrl(record[expenseIndex] ?? "") ?? 0;
    if (income === 0 && expense === 0) throw new Error(`Line ${line}: no Entrada or Saída amount.`);

    return {
      date: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`,
      description: (record[descriptionIndex] ?? "").trim().toLowerCase(),
      amount: income - Math.abs(expense),
      balance: parseBrl(record[balanceIndex] ?? ""),
    };
  });
}
