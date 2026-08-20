# Rekap Cepat

Aplikasi web untuk menggabungkan dan merapikan file Excel/CSV berantakan dari berbagai unit di
lingkungan universitas — tanpa perlu login, tanpa instalasi, dan **tanpa mengunggah data ke server
mana pun**. Semua proses (baca file, deteksi header, pemetaan kolom, pembersihan data, ekspor)
terjadi sepenuhnya di browser Anda.

Cocok untuk staf administrasi/analis data yang sering menerima banyak file rekap dengan format
tidak konsisten (nama kolom beda-beda, header tidak di baris pertama, format tanggal/angka
campur aduk, NIM yang kehilangan angka nol di depan, dsb).

## Alur pemakaian

1. **Unggah** — drag & drop atau pilih banyak file `.xlsx`/`.xls`/`.csv` sekaligus. Belum punya
   data? Klik **"Muat data contoh"** untuk mencoba dengan 3 file dummy bawaan.
2. **Pemetaan** — koreksi baris header bila terdeteksi salah, lalu petakan nama kolom yang
   berbeda-beda (mis. "NIM", "N.I.M", "nim mahasiswa") menjadi satu kolom target. Skema pemetaan
   bisa disimpan/dimuat ulang (localStorage) atau diekspor/diimpor sebagai JSON.
3. **Pembersihan** — pilih opsi pembersihan (trim spasi, Title Case nama, NIM/NIP/NIK/telepon
   tetap sebagai teks, normalisasi tanggal & angka gaya Indonesia, samakan nilai kategori,
   hapus baris kosong, deteksi duplikat) dan lihat Laporan Validasi secara langsung.
4. **Hasil** — tabel gabungan dengan pencarian/sortir/filter/sembunyikan kolom, ringkasan/pivot
   sederhana dengan grafik batang, lalu ekspor ke `.xlsx` (3 sheet: Data, Ringkasan, Laporan
   Validasi), `.csv`, atau salin langsung ke clipboard.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS
- [SheetJS (`xlsx`)](https://sheetjs.com/) untuk baca/tulis file, dijalankan di dalam Web Worker
  supaya UI tidak macet saat memproses file besar (~50.000 baris)
- `react-window` untuk virtual scrolling tabel hasil
- State cukup pakai React state/reducer; `localStorage` hanya dipakai untuk menyimpan **skema
  pemetaan kolom** (bukan data)
- Vitest untuk unit test fungsi pembersihan data

## Menjalankan secara lokal

Butuh Node.js 18+ dan npm.

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Perintah lain yang tersedia:

```bash
npm run build   # build produksi, sekaligus memeriksa tipe TypeScript
npm run start   # jalankan hasil build produksi
npm test        # jalankan unit test (Vitest)
npm run lint    # linting
```

## Deploy ke Vercel

Aplikasi ini murni client-side (tidak ada backend/API route/database), jadi build-nya berupa
halaman statis yang bisa di-deploy ke Vercel tanpa konfigurasi tambahan.

**Opsi 1 — lewat GitHub (disarankan):**

1. Push repo ini ke GitHub.
2. Buka [vercel.com/new](https://vercel.com/new), pilih **Import Project**, lalu pilih repo ini.
3. Vercel otomatis mendeteksi framework Next.js — biarkan pengaturan default (`npm run build`),
   lalu klik **Deploy**.

**Opsi 2 — lewat Vercel CLI:**

```bash
npm i -g vercel
vercel --prod
```

Ikuti instruksi di terminal (login, pilih/klaim project, konfirmasi direktori). Setelah selesai,
Vercel akan memberikan URL produksi.

## Privasi & keamanan data

- Tidak ada file yang pernah dikirim ke server — semua parsing, pembersihan, dan ekspor terjadi
  di memori browser Anda memakai Web Worker.
- Tidak ada database, tidak ada login, tidak ada tracking data pengguna.
- Satu-satunya hal yang disimpan di perangkat (lewat `localStorage`) adalah **skema pemetaan
  kolom** (nama kolom target & aturan pemetaannya) — bukan data mahasiswa/pegawai itu sendiri —
  supaya bisa dipakai ulang untuk file rekap berikutnya dengan format serupa.

## Struktur folder

```
src/
  app/            # Next.js App Router (layout, halaman utama, global CSS)
  components/
    wizard/       # Komponen 4 langkah wizard (Upload, Pemetaan, Pembersihan, Hasil)
    ui/           # Komponen UI kecil (Button, dst)
    DataTable.tsx # Tabel hasil dengan virtual scrolling
    BarChart.tsx  # Grafik batang sederhana untuk panel ringkasan/pivot
  lib/            # Logika murni: parsing, deteksi header, kemiripan teks, pembersihan,
                  # pemetaan otomatis, pivot, ekspor file
    worker/       # Web Worker untuk parsing file .xlsx/.xls/.csv di luar main thread
  state/          # State management wizard (React reducer)
  __tests__/      # Unit test (Vitest) untuk fungsi pembersihan & kemiripan teks
```
