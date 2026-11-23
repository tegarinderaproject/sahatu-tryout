// Mengubah bahan/Soal-Dummy-SAHATU-P0.xlsx + zip gambarnya menjadi data contoh untuk Tahap 2.
// Jalankan: node scripts/import-soal-dummy.mjs
// Hasil: src/data/soal-p0.json (dibaca server saja) dan public/soal/p0/*.png
// Di Tahap 3 data ini pindah ke database Supabase lewat halaman admin.
import ExcelJS from "exceljs";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, mkdtempSync, readdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const xlsx = path.join(root, "bahan/Soal-Dummy-SAHATU-P0.xlsx");
const zip = path.join(root, "bahan/Gambar-Soal-Dummy-P0.zip");
const outJson = path.join(root, "src/data/soal-p0.json");
const outImg = path.join(root, "public/soal/p0");

const text = (v) => {
  if (v == null) return "";
  if (typeof v === "object" && v.richText) return v.richText.map((r) => r.text).join("");
  if (typeof v === "object" && "result" in v) return String(v.result ?? "");
  return String(v).trim();
};

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(xlsx);
const sheet = wb.getWorksheet("Soal");
if (!sheet) throw new Error('Sheet "Soal" tidak ditemukan');

const header = sheet.getRow(1).values.map(text);
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Kolom ${name} tidak ada`);
  return i;
};

const L = ["a", "b", "c", "d", "e"];
const questions = [];
sheet.eachRow((row, n) => {
  if (n === 1) return;
  const v = (name) => text(row.getCell(col(name)).value);
  if (!v("nomor")) return;
  const subtes = v("subtes").toUpperCase();
  const kunci = v("kunci").toUpperCase();
  questions.push({
    nomor: Number(v("nomor")),
    subtes,
    kategori: v("kategori") || null,
    soal: v("soal"),
    gambar: v("gambar_soal") || null,
    opsi: L.map((l) => ({
      label: l.toUpperCase(),
      teks: v(`opsi_${l}`) || null,
      gambar: v(`gambar_opsi_${l}`) || null,
      benar: subtes !== "TKP" && kunci === l.toUpperCase(),
      bobot: subtes === "TKP" ? Number(v(`bobot_${l}`)) : null,
    })),
    pembahasan: v("pembahasan"),
  });
});
questions.sort((a, b) => a.nomor - b.nomor);

// Validasi sederhana (aturan lengkap ada di SPEC.md bagian 8, dibuat di Tahap 3).
const count = (s) => questions.filter((q) => q.subtes === s).length;
const errors = [];
if (count("TWK") !== 30 || count("TIU") !== 35 || count("TKP") !== 45)
  errors.push(`Jumlah soal salah: TWK ${count("TWK")}, TIU ${count("TIU")}, TKP ${count("TKP")}`);
for (const q of questions) {
  if (q.subtes === "TKP") {
    const b = q.opsi.map((o) => o.bobot).sort().join("");
    if (b !== "12345") errors.push(`Soal ${q.nomor}: bobot TKP harus 1–5 masing-masing sekali`);
  } else if (q.opsi.filter((o) => o.benar).length !== 1) errors.push(`Soal ${q.nomor}: kunci tidak valid`);
  if (q.opsi.some((o) => !o.teks && !o.gambar)) errors.push(`Soal ${q.nomor}: ada opsi kosong`);
  if (!q.pembahasan) errors.push(`Soal ${q.nomor}: pembahasan kosong`);
}

// Gambar
mkdirSync(outImg, { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), "sahatu-p0-"));
execFileSync("unzip", ["-o", "-q", zip, "-d", tmp]);
const files = new Map();
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).forEach((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : files.set(e.name, path.join(d, e.name)),
  );
walk(tmp);
for (const q of questions) {
  for (const name of [q.gambar, ...q.opsi.map((o) => o.gambar)].filter(Boolean)) {
    const src = files.get(name);
    if (!src) errors.push(`Soal ${q.nomor}: gambar ${name} tidak ada di zip`);
    else copyFileSync(src, path.join(outImg, name));
  }
}

if (errors.length) {
  console.error("Gagal:\n" + errors.join("\n"));
  process.exit(1);
}
mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, JSON.stringify(questions, null, 1) + "\n");
console.log(`OK: ${questions.length} soal → ${path.relative(root, outJson)}, gambar → ${path.relative(root, outImg)}`);
if (!existsSync(outJson)) process.exit(1);
