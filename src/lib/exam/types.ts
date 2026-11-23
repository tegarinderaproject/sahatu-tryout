// Tipe data ujian yang boleh dipakai di browser maupun server.

export type Subtes = "TWK" | "TIU" | "TKP";
export const SUBTES: Subtes[] = ["TWK", "TIU", "TKP"];
export type Label = "A" | "B" | "C" | "D" | "E";

/** Soal versi aman untuk browser: TANPA kunci, bobot, dan pembahasan. */
export type PublicQuestion = {
  nomor: number;
  subtes: Subtes;
  soal: string;
  gambar: string | null;
  opsi: { label: Label; teks: string | null; gambar: string | null }[];
};

/** Jawaban peserta: nomor soal → huruf yang dipilih. */
export type Answers = Record<number, Label>;

export type SubtesResult = {
  subtes: Subtes;
  nilai: number;
  maks: number;
  passingGrade: number;
  lulus: boolean;
  benar: number; // TWK/TIU: jumlah benar. TKP: jumlah dijawab.
  salah: number; // TKP: selalu 0
  kosong: number;
  jumlahSoal: number;
};

export type ExamResult = {
  partId: string;
  partNama: string;
  total: number;
  maks: number;
  lulus: boolean;
  subtes: SubtesResult[];
  selesaiPada: string; // ISO
  waktuHabis: boolean;
};
