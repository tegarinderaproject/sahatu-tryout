import "server-only";

import ExcelJS from "exceljs";
import type { ExamSettings } from "./exam/settings";
import { SUBTES, type Label, type Subtes } from "./exam/types";

// Membaca & memvalidasi file soal (SPEC bagian 8).
// Excel: hanya sheet "Soal". CSV: baris pertama = nama kolom, pemisah koma atau titik koma.

export type ParsedOption = {
  label: Label;
  teks: string | null;
  gambar: string | null;
  benar: boolean;
  bobot: number | null;
};
export type ParsedQuestion = {
  baris: number;
  nomor: number;
  subtes: Subtes;
  kategori: string | null;
  soal: string;
  gambar: string | null;
  opsi: ParsedOption[];
  pembahasan: string;
};

const LABELS: Label[] = ["A", "B", "C", "D", "E"];
const KOLOM_WAJIB = ["nomor", "subtes", "soal", "kunci", "pembahasan"];

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim();
    if ("result" in v) return String(v.result ?? "").trim();
    if ("text" in v) return String(v.text ?? "").trim();
    if ("error" in v) return "";
  }
  return String(v).trim();
}

/** CSV sederhana yang mendukung tanda kutip dan baris baru di dalam sel. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((x) => x.trim()));
}

async function readTable(fileName: string, data: ArrayBuffer): Promise<{ table: string[][]; error?: string }> {
  if (/\.csv$/i.test(fileName)) {
    return { table: parseCsv(new TextDecoder("utf-8").decode(data)) };
  }
  if (!/\.xlsx$/i.test(fileName)) return { table: [], error: "Format file harus .xlsx atau .csv." };
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data);
  } catch {
    return { table: [], error: "File Excel tidak bisa dibaca. Pastikan formatnya .xlsx." };
  }
  const sheet = wb.worksheets.find((w) => w.name.trim().toLowerCase() === "soal");
  if (!sheet) return { table: [], error: 'Sheet bernama "Soal" tidak ditemukan di file Excel.' };
  const table: string[][] = [];
  const width = sheet.columnCount;
  sheet.eachRow({ includeEmpty: true }, (row, n) => {
    const r: string[] = [];
    for (let c = 1; c <= width; c++) r.push(cellText(row.getCell(c).value));
    table[n - 1] = r;
  });
  for (let i = 0; i < table.length; i++) table[i] ??= [];
  return { table };
}

export async function parseSoalFile(
  fileName: string,
  data: ArrayBuffer,
  settings: ExamSettings,
): Promise<{ questions: ParsedQuestion[]; errors: string[]; images: string[] }> {
  const errors: string[] = [];
  const { table, error } = await readTable(fileName, data);
  if (error) return { questions: [], errors: [error], images: [] };
  if (table.length < 2) return { questions: [], errors: ["File kosong."], images: [] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const missing = KOLOM_WAJIB.filter((k) => col(k) < 0);
  if (missing.length) return { questions: [], errors: [`Kolom tidak ditemukan: ${missing.join(", ")}`], images: [] };

  const questions: ParsedQuestion[] = [];
  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    const v = (name: string) => {
      const c = col(name);
      return c < 0 ? "" : (r[c] ?? "").trim();
    };
    if (r.every((x) => !x?.trim())) continue; // baris kosong
    const baris = i + 1;
    const err = (m: string) => errors.push(`Baris ${baris} (nomor ${v("nomor") || "?"}): ${m}`);

    const nomor = Number(v("nomor"));
    const subtes = v("subtes").toUpperCase() as Subtes;
    if (!Number.isInteger(nomor) || nomor < 1) err("kolom nomor harus angka bulat.");
    if (!SUBTES.includes(subtes)) err("subtes harus TWK, TIU, atau TKP.");
    if (!v("soal")) err("teks soal kosong.");
    if (!v("pembahasan")) err("pembahasan kosong.");

    const kunci = v("kunci").toUpperCase();
    const opsi: ParsedOption[] = LABELS.map((L) => {
      const l = L.toLowerCase();
      const bobotRaw = v(`bobot_${l}`);
      return {
        label: L,
        teks: v(`opsi_${l}`) || null,
        gambar: v(`gambar_opsi_${l}`) || null,
        benar: subtes !== "TKP" && kunci === L,
        bobot: subtes === "TKP" && bobotRaw ? Number(bobotRaw) : null,
      };
    });
    for (const o of opsi) if (!o.teks && !o.gambar) err(`opsi ${o.label} harus punya teks atau gambar.`);

    if (subtes === "TKP") {
      const b = opsi.map((o) => o.bobot);
      if (b.some((x) => x === null || !Number.isInteger(x)) || [...b].sort().join("") !== "12345") {
        err("TKP wajib punya bobot 1–5 di kelima opsi, masing-masing angka dipakai sekali.");
      }
    } else if (subtes === "TWK" || subtes === "TIU") {
      if (!LABELS.includes(kunci as Label)) err("TWK/TIU wajib punya tepat satu kunci (A–E).");
    }

    questions.push({
      baris,
      nomor,
      subtes,
      kategori: v("kategori") || null,
      soal: v("soal"),
      gambar: v("gambar_soal") || null,
      opsi,
      pembahasan: v("pembahasan"),
    });
  }

  // Nomor unik & jumlah per subtes sesuai pengaturan.
  const seen = new Map<number, number>();
  for (const q of questions) {
    if (seen.has(q.nomor)) errors.push(`Baris ${q.baris}: nomor ${q.nomor} dobel (juga di baris ${seen.get(q.nomor)}).`);
    else seen.set(q.nomor, q.baris);
  }
  for (const s of SUBTES) {
    const n = questions.filter((q) => q.subtes === s).length;
    const harus = settings.subtes[s].jumlahSoal;
    if (n !== harus) errors.push(`Jumlah soal ${s} ada ${n}, seharusnya ${harus}.`);
  }

  const images = [
    ...new Set(questions.flatMap((q) => [q.gambar, ...q.opsi.map((o) => o.gambar)]).filter((x): x is string => !!x)),
  ];
  for (const name of images) {
    if (!/^[\w.\- ]+\.(png|jpe?g|webp|gif)$/i.test(name)) errors.push(`Nama file gambar tidak valid: ${name}`);
  }
  return { questions, errors, images };
}
