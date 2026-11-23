# SPEC — Web Tryout SKD CPNS (Satu Hari Satu Soal)

Dokumen ini adalah acuan untuk membangun web tryout SKD CPNS. Simpan di root folder project sebagai `SPEC.md`. Claude Code membaca file ini sebelum mengerjakan setiap tahap.

**Brand:** SAHATU Academy.

**Desain:** ikuti mockup di canvas "SAHATU Academy — Mockup Web Tryout" (https://claude.ai/artifact/G22EcUgpGTW5HGockDyyc3). Ada 5 layar: landing, katalog, ujian CAT, hasil, dan pembahasan.

- Font: Plus Jakarta Sans.
- Palet warna (jadikan token Tailwind):
  - Deep Cocoa `#5B4032`: warna utama, tombol utama, judul.
  - Mocha Brown `#8B6248`: warna sekunder.
  - Caramel `#C49A75`: aksen. Hanya untuk latar atau dekorasi, jangan dipakai sebagai warna teks di atas latar terang (kontrasnya kurang).
  - Warm Beige `#E8D8C3`: warna pendukung, kartu, dan badge.
  - Cream White `#F7F2E9`: latar.
  - Charcoal `#34302C`: teks.
- Warna tambahan:
  - `#9A3B2E` untuk status "belum lulus" atau "salah", selalu disertai ikon dan label teks.
  - `#5E5148` untuk teks sekunder.
- Layar ujian tetap polos dan fokus. Warna brand hanya sebagai aksen.

**Bahan di folder project:**
- `bahan/Soal-Dummy-SAHATU-P0.xlsx` + `bahan/Gambar-Soal-Dummy-P0.zip`: 110 soal dummy (Part "P0") untuk data contoh di Tahap 2 dan tes upload di Tahap 3. Kunci tertulis di awal setiap soal, misalnya `[DUMMY – kunci C]`.
- `bahan/Template-Upload-Soal-SAHATU.xlsx`: template kosong untuk soal asli. Web hanya membaca sheet "Soal".

---

## 1. Ringkasan produk

Web tryout SKD CPNS yang meniru pengalaman CAT BKN. Peserta membeli paket tryout per "Part", mengerjakannya dengan timer, langsung mendapat nilai per subtes (TWK, TIU, TKP) beserta status passing grade, lalu bisa membaca pembahasan dan melihat ranking.

Fase 2 (setelah launching TO): **kelas bimbel** yang dibeli di web yang sama, dengan sesi live, rekaman YouTube yang di-embed, materi, dan PR. Lihat bagian 11.

**Target launching:** kurang dari 2 minggu sejak 16 November 2026. Launching awal dengan Part 1 dan Part 2. Bundling 3 Part dibuka setelah Part 3 siap.

---

## 2. Teknologi

| Bagian | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS, mobile-first (mayoritas peserta pakai HP) |
| Database & Auth | Supabase (Postgres + Auth + Storage + Realtime), region Singapore |
| Hosting | Vercel |
| Pembayaran | Mayar (payment link via API + webhook), metode **QRIS saja** |
| Video rekaman bimbel (fase 2) | YouTube **Unlisted**, di-embed di halaman kelas |

Aturan umum:
- Semua key rahasia (Supabase `service_role`, Mayar API key, webhook secret) hanya ada di environment variable server. Jangan pernah dikirim ke browser atau di-commit ke GitHub.
- Row Level Security (RLS) aktif di semua tabel Supabase.

---

## 3. Struktur produk & harga

- **1 Part = 1 TO lengkap SKD** (110 soal).
- Harga satuan: **Rp10.000 per Part**.
- Bundling: **3 Part = Rp25.000**. Dibuka setelah Part 3 tersedia.
- Pembeli paket soal Drive (produk lama) mendapat **1 kali voucher gratis 1 Part**. Kode voucher dibagikan lewat PDF di Google Drive mereka.
- Harga dan isi paket bisa diatur admin, tidak di-hardcode.

### Aturan akses
- **Masa akses: 1 tahun (365 hari) sejak tanggal pembelian**, dihitung per pembelian:
  - Beli Part 1 tanggal X, maka akses Part 1 berakhir X + 365 hari.
  - Beli bundling, maka semua Part di bundling berakhir 365 hari sejak tanggal beli bundling.
  - Akses dari voucher juga 365 hari sejak voucher ditukar.
  - Kalau peserta membeli Part yang sama lagi saat aksesnya masih aktif, masa akses diperpanjang dari tanggal berakhir yang lama, bukan dihitung ulang dari hari ini.
- Tanggal berakhir akses tampil jelas di dashboard peserta.
- **Boleh mengulang tanpa batas** selama masa akses aktif.
- **Ranking hanya memakai percobaan pertama** tiap peserta per Part.
- **Satu akun hanya bisa aktif di satu perangkat pada waktu yang sama** (detail di bagian 5.1).

---

## 4. Aturan ujian & penilaian

| Subtes | Jumlah soal | Penilaian | Nilai maks | Passing grade (default) |
|---|---|---|---|---|
| TWK | 30 | Benar = 5, salah/kosong = 0 | 150 | 65 |
| TIU | 35 | Benar = 5, salah/kosong = 0 | 175 | 80 |
| TKP | 45 | Tiap opsi berbobot 1–5, kosong = 0 | 225 | 166 |
| **Total** | **110** | | **550** | |

- Durasi: **100 menit**. Timer dihitung di server berdasarkan waktu mulai, jadi refresh halaman tidak me-reset timer. Saat waktu habis, jawaban otomatis dikumpulkan.
- **Lulus** = ketiga subtes memenuhi passing grade masing-masing.
- Passing grade, jumlah soal, dan durasi disimpan sebagai pengaturan yang bisa diubah admin, untuk antisipasi perubahan aturan BKN.
- **Penilaian dilakukan di server.** Kunci jawaban dan bobot TKP tidak pernah dikirim ke browser sebelum peserta mengumpulkan jawaban.

### Tampilan ujian (meniru CAT BKN)
- Satu soal per layar, dengan tombol Sebelumnya / Berikutnya.
- Panel nomor soal: warna berbeda untuk sudah dijawab, belum dijawab, dan ragu-ragu.
- Tombol "Ragu-ragu".
- Timer selalu terlihat.
- Jawaban tersimpan otomatis setiap kali dipilih (autosave ke server), supaya aman kalau koneksi putus atau HP mati.
- Konfirmasi sebelum "Selesai Ujian".
- Soal dan opsi bisa berisi **gambar** (wajib untuk soal figural TIU). Gambar figural harus tampil utuh dan bisa diperbesar (tap untuk zoom) di layar HP, termasuk semua opsi A–E.

---

## 5. Fitur peserta

1. Daftar / login: email + password, dan Login with Google.
2. **Katalog:** daftar Part dan bundling beserta harga. Ada tombol beli dan kolom tukar voucher.
3. **Pembayaran:** klik beli, diarahkan ke halaman bayar QRIS Mayar, setelah lunas akses otomatis aktif.
4. **Dashboard:** Part yang dimiliki, tanggal berakhir akses, tombol mulai TO.
5. **Hasil TO:**
   - Nilai TWK / TIU / TKP / total.
   - Status lulus atau tidak lulus per subtes dan keseluruhan.
   - Jumlah benar, salah, dan kosong.
6. **Pembahasan:** semua soal, jawaban peserta, kunci (untuk TKP: bobot tiap opsi), dan pembahasan. Hanya bisa dibuka setelah TO dikumpulkan.
7. **Riwayat:** semua percobaan beserta nilainya, untuk melihat perkembangan.
8. **Halaman Ranking per Part** (lihat artboard "6. Ranking" di mockup):
   - **Hanya bisa dilihat untuk Part yang dimiliki peserta** (punya entitlement aktif). Part yang belum dibeli tampil terkunci dan diarahkan ke katalog. Data ranking Part tersebut tidak boleh terkirim ke browser, jadi pengecekannya di server, bukan sekadar disembunyikan di tampilan.
   - Hanya memakai percobaan pertama tiap peserta.
   - Urutan: total nilai. Kalau total sama, bandingkan TKP, lalu TIU, lalu TWK.
   - Isi halaman: pilihan Part, 3 besar, kotak "Posisimu" (peringkat, persentil, selisih poin ke top 100), tabel top 10 yang bisa dibuka sampai 50 besar (TWK/TIU/TKP/total/status), dan penjelasan cara hitung.
   - Ringkasan ranking juga tampil di halaman Hasil.
   - Nama ditampilkan sebagian, misalnya "Teg***".

### 5.1 Satu akun, satu perangkat aktif

Tujuan: satu akun tidak bisa dipakai di dua perangkat pada waktu yang sama (mencegah akun dipakai bersama).

Aturan: **login terakhir yang menang.** Login di perangkat baru otomatis mengeluarkan sesi di perangkat lama. Peserta yang ganti HP atau HP-nya hilang tidak terkunci.

Cara kerja:
1. Setiap kali login berhasil (email/password maupun Google), server menyimpan `session_id` dari token Supabase sebagai `active_session_id` di `profiles`, lalu mencabut sesi lain milik akun itu (sign out sesi lain).
2. Middleware Next.js di semua halaman yang butuh login membandingkan `session_id` di token dengan `active_session_id`. Kalau tidak sama, sesi di perangkat itu dihapus dan peserta diarahkan ke halaman login dengan pesan: **"Akunmu baru saja masuk di perangkat lain, jadi kamu dikeluarkan dari perangkat ini. Kalau itu bukan kamu, segera ganti password."**
3. Semua API dan fungsi server yang mengembalikan data berbayar (soal, simpan jawaban, pembahasan, ranking, video ID, link live, materi) juga melakukan pengecekan yang sama, bukan hanya middleware halaman.
4. **Perangkat lama dikeluarkan tanpa menunggu pindah halaman.** Halaman yang lama terbuka (ujian, pembahasan, halaman sesi kelas) berlangganan sinyal Supabase Realtime untuk akun tersebut, ditambah pengecekan cadangan setiap 60 detik. Begitu sesi tidak lagi aktif, konten disembunyikan (player video dilepas dari halaman) dan muncul pesan di atas.
5. **Saat TO sedang berjalan** dan peserta login di perangkat lain, halaman TO di perangkat baru menampilkan: "Kamu sedang mengerjakan {nama Part}. Lanjutkan di perangkat ini?" Jawaban yang sudah autosave tetap ada dan timer tetap dihitung di server (tidak berhenti dan tidak bertambah).
6. **Batas ganti perangkat:** maksimal **3 kali login dari perangkat berbeda dalam 24 jam** (angka bisa diubah admin). Kalau lewat batas, login ditolak dengan pesan untuk menghubungi admin. "Perangkat berbeda" ditentukan dari ID perangkat acak yang disimpan di cookie/localStorage browser saat login pertama, dilengkapi info browser dan sistem operasi.
7. Halaman profil peserta menampilkan perangkat yang sedang aktif dan waktu login terakhir.

Batasan yang perlu dipahami: aturan ini mencegah pemakaian **bersamaan**, bukan dua orang yang bergantian di jam berbeda. Penghalangnya adalah batas ganti perangkat (poin 6) dan pemantauan admin (bagian 6 poin 11).

---

## 6. Fitur admin

1. **Kelola Part:** nama, deskripsi, harga, status (draft / terbit).
2. **Upload soal via file CSV/Excel** (format di bagian 8), plus edit soal satu per satu.
3. **Upload gambar** soal dan opsi ke Supabase Storage.
4. **Kelola bundling:** Part apa saja dan harganya.
5. **Voucher:** buat kode (sekali pakai atau kuota tertentu), pilih Part yang dibuka, lihat status pemakaian.
6. **Daftar transaksi:** status pembayaran dan siapa membeli apa.
7. **Pemberian akses manual:** cadangan kalau webhook gagal.
8. **Pengaturan ujian:** passing grade, durasi, jumlah soal per subtes.
9. **Statistik sederhana:** jumlah pembeli per Part, jumlah percobaan, dan rata-rata nilai.
10. **Laporan soal:** tombol "Laporkan soal" di halaman pembahasan, masuk ke daftar admin. Gunanya untuk memperbaiki kunci atau soal yang salah.
11. **Perangkat & sesi:**
    - Riwayat login per peserta (waktu, perangkat, browser/OS, perkiraan lokasi dari IP).
    - Daftar akun yang paling sering ganti perangkat dalam 7 hari terakhir, sebagai tanda akun dipakai bergantian.
    - Tombol **"Keluarkan dari semua perangkat"** dan **"Reset batas ganti perangkat"** per peserta.
    - Pengaturan batas ganti perangkat per 24 jam.

Hanya akun dengan role `admin` yang bisa membuka halaman admin. Akun admin tidak terkena batas ganti perangkat.

---

## 7. Pembayaran (Mayar)

Alur:
1. Peserta klik beli. Server membuat transaksi `pending` di database, lalu membuat payment link lewat API Mayar dengan nominal dan referensi transaksi.
2. Peserta diarahkan ke halaman bayar Mayar dan membayar dengan QRIS.
3. Mayar mengirim webhook ke `/api/webhooks/mayar`.
4. Server memverifikasi bahwa webhook benar-benar dari Mayar (cek signature/secret atau konfirmasi ulang status lewat API), mencocokkan referensi transaksi dan nominal, lalu mengubah status menjadi `paid` dan memberi akses.
5. Proses harus **idempotent**: webhook yang terkirim dua kali tidak boleh memberi akses ganda atau memperpanjang akses dua kali.
6. Halaman "menunggu pembayaran" mengecek status secara berkala, lalu mengarahkan ke dashboard setelah lunas.

Cadangan: kalau integrasi webhook belum siap di hari launching, admin bisa memberi akses manual atau membuat voucher untuk pembeli.

Lihat dokumentasi Mayar: https://docs.mayar.id (Webhook, API V2, Payment Link).

---

## 8. Format upload soal (CSV/Excel)

Satu baris = satu soal. File Excel: baca sheet bernama **"Soal"** saja; sheet lain (Contoh, Cek, Petunjuk) diabaikan. Template ada di `bahan/Template-Upload-Soal-SAHATU.xlsx`.

| Kolom | Isi |
|---|---|
| `nomor` | 1–110 |
| `subtes` | TWK / TIU / TKP |
| `kategori` | Opsional, misalnya silogisme, deret angka, pelayanan publik |
| `soal` | Teks soal (boleh berisi baris baru) |
| `gambar_soal` | Nama file gambar (opsional) |
| `opsi_a` … `opsi_e` | Teks opsi (boleh kosong kalau gambar opsi diisi) |
| `gambar_opsi_a` … `gambar_opsi_e` | Nama file gambar opsi (opsional) |
| `kunci` | Untuk TWK/TIU: huruf jawaban benar (A–E). Untuk TKP: kosongkan |
| `bobot_a` … `bobot_e` | Untuk TKP: bobot 1–5 tiap opsi, masing-masing angka dipakai sekali. Untuk TWK/TIU: kosongkan |
| `pembahasan` | Teks pembahasan |

Nama file gambar: `P{nomor Part}-{nomor soal 3 digit}-soal.png` dan `P{Part}-{nomor}-A.png` … `-E.png`. Gambar di-upload bersama (boleh dalam satu file zip) dan dicocokkan berdasarkan nama file.

Validasi waktu upload (tolak dan tampilkan baris yang salah):
- Jumlah soal per subtes sesuai pengaturan (30 / 35 / 45).
- TWK/TIU wajib punya tepat satu `kunci`.
- TKP wajib punya bobot 1–5 di kelima opsi, masing-masing angka sekali.
- Setiap opsi wajib punya teks atau gambar.
- Setiap nama file gambar yang disebut di sheet harus ada di file gambar yang di-upload.
- Tidak ada soal tanpa pembahasan.

---

## 9. Model data (garis besar)

- `profiles`: id (= auth user), nama, role (`peserta` / `admin`), active_session_id, active_device_id, active_sejak
- `device_logins`: id, user_id, session_id, device_id, info_perangkat (browser/OS), ip, waktu_login, dikeluarkan_pada, alasan (`login_baru` / `admin` / `logout`)
- `parts`: id, nama, deskripsi, harga, status
- `bundles`: id, nama, harga, status; `bundle_parts`: bundle_id, part_id
- `questions`: id, part_id, nomor, subtes, kategori, soal, gambar, pembahasan
- `options`: id, question_id, label (A–E), teks, gambar, benar (bool), bobot (1–5, untuk TKP)
- `orders`: id, user_id, item (part / bundle), nominal, status (`pending` / `paid` / `expired`), mayar_ref, dibuat, dibayar
- `entitlements`: user_id, part_id, sumber (order / voucher / manual), berlaku_sampai
- `vouchers`: kode, part_id, kuota, terpakai, aktif; `voucher_redemptions`: voucher, user_id, waktu
- `attempts`: id, user_id, part_id, mulai, selesai, nilai_twk, nilai_tiu, nilai_tkp, total, lulus, percobaan_ke
- `answers`: attempt_id, question_id, opsi_dipilih, ragu (bool)
- `settings`: passing grade, durasi, jumlah soal per subtes, batas_ganti_perangkat_per_24jam
- `question_reports`: question_id, user_id, isi, status

Tambahan untuk fase 2 (bimbel) ada di bagian 11.

RLS:
- Peserta hanya bisa membaca data miliknya sendiri.
- Tabel `options` kolom `benar` dan `bobot` tidak boleh terbaca peserta lewat API langsung. Akses ke kolom ini hanya lewat fungsi server.
- Kolom `active_session_id` dan tabel `device_logins` hanya bisa diubah oleh server, tidak oleh peserta.

---

## 10. Keamanan, wajib dites

- Paket tidak bisa dibuka tanpa entitlement aktif, termasuk lewat URL langsung.
- Kunci jawaban dan bobot TKP tidak muncul di network response sebelum TO dikumpulkan.
- Timer tidak bisa diakali dengan refresh atau mengubah jam HP.
- Webhook palsu (tanpa signature yang valid) ditolak.
- Akses berakhir tepat di tanggal `berlaku_sampai`.
- Halaman admin tidak bisa dibuka akun peserta.
- **Satu perangkat aktif:**
  - Login di perangkat B membuat perangkat A keluar dalam waktu maksimal 60 detik, termasuk saat A sedang membuka halaman ujian atau video.
  - Setelah dikeluarkan, perangkat A tidak bisa memanggil API data berbayar (soal, simpan jawaban, pembahasan, video ID, materi), meskipun token lamanya belum kedaluwarsa.
  - TO yang dipindah dari A ke B tetap menyimpan semua jawaban dan sisa waktu yang benar.
  - Login ke-4 dari perangkat berbeda dalam 24 jam ditolak; tombol reset admin membukanya kembali.

---

## 11. Modul Bimbel (fase 2, setelah launching TO)

Kelas bimbel dijual dan diakses di web yang sama: login, pembayaran Mayar, sistem masa akses, dan aturan satu perangkat aktif yang sama dengan Part TO.

### 11.1 Konsep produk
- **Kelas** punya tipe:
  - `live`: ada jadwal sesi via Zoom/Google Meet, rekaman menyusul setelah sesi.
  - `rekaman`: hanya video rekaman (misalnya rekaman batch sebelumnya), tanpa live.
- Setiap kelas berisi beberapa **sesi**. Satu sesi bisa punya: jadwal, link live, video rekaman, materi PDF, dan PR.
- Kelas bisa menyertakan **bonus Part TO** (misalnya 1–2 Part gratis untuk peserta kelas).
- Kelas bisa punya **link grup WA khusus peserta**, hanya tampil untuk pemilik akses.
- Harga, masa akses (default 365 hari sejak beli), kuota peserta, dan status (draft / buka pendaftaran / berjalan / selesai) diatur admin.

### 11.2 Rekaman: YouTube Unlisted + embed
Keputusan: rekaman di-upload ke YouTube dengan status **Unlisted**, lalu di-embed di halaman sesi.

Aturan teknis:
- Admin cukup menempelkan URL YouTube. Server mengambil dan menyimpan **video ID**-nya saja.
- **Video ID hanya dikirim ke browser peserta yang punya entitlement aktif untuk kelas itu.** Halaman sesi dirender di server setelah cek akses. Video ID tidak boleh muncul di halaman katalog, halaman publik, atau API yang bisa dibuka tanpa login.
- Gunakan embed standar `youtube-nocookie.com/embed/{id}`, ukuran responsif (16:9), minimal 200×200 px.
- **Jangan menaruh lapisan apa pun di atas player** (watermark, tombol, overlay transparan) dan jangan memblokir fungsi player. Aturan YouTube melarang ini.
- Sebagai pengingat untuk tidak menyebar link, tampilkan teks kecil **di bawah** player (bukan di atas): "Rekaman ini khusus untuk {nama} ({email tersamar}). Mohon tidak dibagikan."
- Kalau sesi peserta dikeluarkan karena login di perangkat lain (bagian 5.1), player dilepas dari halaman, bukan ditutupi.
- Di setting YouTube, matikan komentar dan jangan masukkan video kelas ke playlist publik.
- Kalau ditemukan link rekaman bocor: admin upload ulang video sebagai Unlisted baru, ganti URL di sesi, lalu set video lama menjadi Private. Peserta tidak perlu melakukan apa-apa.

Risiko yang sudah diketahui dan diterima pemilik:
- Peserta yang membeli bisa menyalin link YouTube dan menyebarkannya. Siapa pun yang punya link bisa menonton.
- Aturan YouTube API Services melarang memungut bayaran untuk menonton konten di player YouTube yang di-embed. Pemilik memilih tetap memakai cara ini untuk tahap awal.
- Rencana upgrade kalau bocor jadi masalah atau peserta bertambah banyak: pindah ke layanan video berbayar seperti Bunny Stream (link bertoken, kunci domain, watermark). Struktur data menyimpan `video_provider` supaya perpindahan tidak perlu mengubah halaman.

### 11.3 Live
- Link Zoom/Meet disimpan per sesi dan **hanya tampil untuk pemilik akses**, mulai 30 menit sebelum jadwal sampai sesi selesai.
- Di luar waktu itu tampil status: "Akan datang (tanggal, jam WIB)", "Sedang berlangsung", atau "Rekaman tersedia / segera tersedia".
- Opsional: tombol "Tambah ke Google Calendar" per sesi.

### 11.4 Materi & PR
- **Materi PDF** diunggah ke Supabase Storage (bucket private). Peserta mengunduh lewat signed URL berumur pendek (misalnya 10 menit) yang dibuat server setelah cek akses.
- **PR / latihan** memakai mesin CAT yang sama dengan TO, dengan set soal kecil:
  - Set latihan disimpan sebagai `parts` dengan `jenis = latihan`, punya jumlah soal dan durasi sendiri (tidak harus 30/35/45).
  - Penilaian sama (5/0 untuk TWK/TIU, bobot untuk TKP). Pembahasan langsung terbuka setelah dikumpulkan.
  - Latihan tidak masuk ranking nasional, tapi admin bisa melihat rekap nilai PR per peserta kelas.
- Upload soal latihan memakai format CSV yang sama (bagian 8). Validasi jumlah soal mengikuti pengaturan set latihan, bukan 30/35/45.

### 11.5 Fitur peserta (kelas)
1. Katalog menampilkan tab **Tryout** dan **Kelas**. Kartu kelas: nama, tipe, periode, jumlah pertemuan, harga, sisa kuota.
2. Halaman detail kelas (publik): deskripsi, kurikulum/daftar sesi (judul dan jadwal saja), fasilitas, harga, tombol beli.
3. **Kelas Saya:** daftar sesi berurutan dengan status, link live, rekaman (embed), materi, PR, link grup WA, dan tanggal akses berakhir.
4. Progres sederhana: sesi yang sudah ditandai "sudah ditonton" (tombol manual oleh peserta) dan PR yang sudah dikerjakan.

### 11.6 Fitur admin (kelas)
1. Kelola kelas: nama, tipe, deskripsi, harga, masa akses, kuota, status, bonus Part, link grup WA.
2. Kelola sesi: judul, urutan, jadwal, link live, URL YouTube rekaman, upload materi PDF, pilih set latihan sebagai PR.
3. Daftar peserta per kelas (nama, email, nomor WA, tanggal beli, akses berakhir) dengan tombol **export CSV**.
4. Rekap nilai PR per peserta.
5. Pemberian akses kelas manual (cadangan kalau webhook gagal).

### 11.7 Tambahan model data
- `classes`: id, nama, tipe (`live` / `rekaman`), deskripsi, harga, masa_akses_hari, kuota, status, link_grup_wa
- `class_sessions`: id, class_id, urutan, judul, jadwal_mulai, jadwal_selesai, link_live, video_provider (`youtube`), video_id, latihan_part_id (opsional)
- `class_materials`: id, session_id, nama, path_storage
- `class_bonus_parts`: class_id, part_id
- `session_progress`: user_id, session_id, ditonton (bool), waktu
- `parts`: tambah kolom `jenis` (`tryout` / `latihan`), `jumlah_soal`, `durasi_menit`
- `orders.item`: tambah nilai `kelas`
- `entitlements`: tambah `class_id` (nullable; satu baris berisi `part_id` atau `class_id`)
- Saat kelas dibeli: buat entitlement kelas, lalu entitlement untuk setiap bonus Part dengan tanggal berakhir yang sama.

RLS tambahan:
- `class_sessions.link_live`, `class_sessions.video_id`, dan `class_materials` hanya bisa dibaca lewat fungsi server yang mengecek entitlement kelas dan sesi perangkat aktif.

### 11.8 Keamanan kelas, wajib dites
- Halaman sesi, link live, video ID, dan materi tidak bisa dibuka tanpa entitlement kelas aktif, termasuk lewat URL langsung.
- Video ID dan link live tidak muncul di network response halaman publik/katalog.
- Signed URL materi kedaluwarsa sesuai pengaturan.
- Bonus Part ikut berakhir bersama akses kelas.
- Player video di perangkat lama hilang maksimal 60 detik setelah akun login di perangkat lain.

---

## 12. Di luar cakupan versi awal

Fitur berikut menyusul setelah launching:
- TO serentak dengan jadwal tertentu dan ranking nasional live.
- Aplikasi Android/iOS.
- Video pembahasan.
- Analisis per kategori soal (misalnya "kamu lemah di deret angka").
- Metode bayar selain QRIS.
- Program afiliasi/reseller.
- Hosting video rekaman berbayar (Bunny Stream atau sejenisnya), menggantikan YouTube Unlisted.

---

## 13. Urutan pengerjaan

| Tahap | Isi | Selesai kalau… |
|---|---|---|
| 1 | Setup project Next.js + Supabase + deploy awal ke Vercel | Web kosong bisa dibuka di `*.vercel.app` |
| 2 | Tampilan CAT + penilaian dengan data contoh (`bahan/Soal-Dummy-SAHATU-P0.xlsx`) | Bisa mengerjakan 110 soal contoh, timer jalan, nilai dan passing grade benar |
| 3 | Login, database, RLS, **satu perangkat aktif (bagian 5.1)**, halaman admin + upload CSV/Excel | Admin upload Part dummy P0 beserta gambarnya, peserta bisa mengerjakan dari database, login di perangkat kedua mengeluarkan perangkat pertama |
| 4 | Hasil, pembahasan, riwayat, laporan soal | Semua tampil benar setelah TO dikumpulkan |
| 5 | Entitlement, voucher, katalog | Akses dari voucher berjalan dan berakhir sesuai tanggal |
| 6 | Pembayaran Mayar + webhook | Bayar QRIS (mode tes/sandbox) langsung membuka akses |
| 7 | Ranking, landing page, halaman admin perangkat & sesi, polishing tampilan HP | Siap uji coba, semua tes di bagian 10 lulus |
| 8 | Uji coba tertutup 10–20 orang dengan soal asli, perbaikan bug, hapus Part dummy P0 | Daftar bug kritis kosong |
| 9 | Launching Part 1 & 2 | |
| 10 | Fase 2: kelas, sesi, katalog tab Kelas, pembelian kelas lewat Mayar, bonus Part | Admin membuat 1 kelas, peserta membeli dan melihat daftar sesi |
| 11 | Rekaman YouTube (embed), link live, materi PDF, export peserta | Rekaman, link live, dan materi hanya terbuka untuk pemilik akses (lulus tes keamanan 11.8) |
| 12 | Latihan/PR memakai mesin CAT + rekap nilai PR + progres sesi | Peserta mengerjakan PR, admin melihat rekap |

Kerjakan **satu tahap per sesi**. Di akhir tiap tahap, cek kriteria "selesai kalau…" sebelum lanjut. Tahap 10–12 baru dimulai setelah Tahap 9 (launching TO) selesai.

---

## 14. Prompt pembuka untuk Claude Code

Tempel ini di sesi pertama Claude Code:

```
Baca SPEC.md di root project ini. Aku pemula di coding, jadi jelaskan setiap langkah yang harus aku lakukan sendiri (install, setting akun, environment variable) dengan bahasa sederhana.

Kerjakan Tahap 1 saja dulu: setup project Next.js + TypeScript + Tailwind, hubungkan ke Supabase, dan siapkan deploy ke Vercel lewat GitHub. Jangan minta aku menempelkan key rahasia ke chat. Tunjukkan di mana aku harus memasukkannya sendiri (.env.local dan pengaturan Vercel). Folder ini sudah berisi SPEC.md dan folder bahan/; jangan hapus keduanya.

Setelah selesai, beri tahu cara mengecek bahwa Tahap 1 berhasil, lalu tunggu aku sebelum lanjut ke Tahap 2.
```
