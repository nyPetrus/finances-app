// Parser for Nubank's exported account-statement CSV:
//   Data,Valor,Identificador,Descrição
//   07/07/2025,100.00,686ba73e-c491-4b6b-a236-878fd311c482,Transferência Recebida - ...
// Pure string-in/rows-out so it stays independent of Drive and Supabase.
//
// Unlike Contabilizei's export, amounts are already a plain signed decimal
// (no "R$", no thousands separator, "." as the decimal point) and there's
// no running-balance column — but there is a stable per-transaction
// Identificador, which is a better dedup key than content-hashing (see
// ParsedStatementRow.externalId).

import { normalizeHeader, parseCsv } from "./csv-utils";
import type { ParsedStatementRow } from "./parsed-statement-row";

export function parseNubankCsv(text: string): ParsedStatementRow[] {
  const [header, ...records] = parseCsv(text.replace(/^﻿/, ""));
  if (!header) throw new Error("The file is empty.");

  const columns = header.map(normalizeHeader);
  const dateIndex = columns.indexOf("data");
  const valueIndex = columns.indexOf("valor");
  const idIndex = columns.indexOf("identificador");
  const descriptionIndex = columns.indexOf("descricao");

  if ([dateIndex, valueIndex, idIndex, descriptionIndex].includes(-1)) {
    throw new Error("Unrecognized columns — expected Data, Valor, Identificador, Descrição.");
  }

  return records.map((record, index) => {
    const line = index + 2;
    const dateMatch = record[dateIndex]?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dateMatch) throw new Error(`Line ${line}: invalid date "${record[dateIndex] ?? ""}".`);

    const amount = Number(record[valueIndex]?.trim());
    if (!Number.isFinite(amount)) throw new Error(`Line ${line}: invalid amount "${record[valueIndex] ?? ""}".`);

    const externalId = record[idIndex]?.trim();
    if (!externalId) throw new Error(`Line ${line}: missing Identificador.`);

    return {
      date: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`,
      description: (record[descriptionIndex] ?? "").trim().toLowerCase(),
      amount,
      balance: null,
      externalId,
    };
  });
}
