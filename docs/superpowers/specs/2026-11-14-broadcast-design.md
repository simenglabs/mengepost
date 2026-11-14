# Desain: Broadcast ke banyak platform

Tanggal: 2026-11-14 · Status: draft untuk disetujui

## 1. Maksud dan alasannya

Mengepost sekarang adalah alat untuk merencanakan dan menjadwalkan posting **ke TikTok saja**. Asumsi "satu post = satu kiriman TikTok" ada di semua lapisan: tabel `posts`, logika publish, cron, editor, sidebar/dashboard, dan halaman legal.

Pemilik ingin Mengepost menjadi alat **broadcast**: satu post (video, beberapa gambar, atau teks) bisa diterbitkan ke **TikTok, YouTube, Instagram, Threads, dan X** sekaligus, langsung atau terjadwal. Tujuannya supaya konten yang sama tidak perlu diunggah manual satu per satu di tiap aplikasi.

Koneksi akun YouTube (OAuth, tabel `social_accounts`, kartu di Settings → Connections) **sudah dibangun** dan berfungsi lokal. Belum ada posting ke YouTube.

## 2. Tujuan, bukan tujuan, dan yang harus dihindari

### Tujuan
- Satu post bisa memilih beberapa platform tujuan sekaligus.
- Satu **caption utama** dipakai semua platform; tiap platform **boleh** punya caption sendiri yang menimpa caption utama.
- Isi post bisa: **video** (satu), **gambar** (satu atau beberapa / carousel), atau **teks saja**.
- Tiap platform punya status sendiri di dalam post. Bila sebagian gagal, pengguna bisa **retry hanya yang gagal**.
- Satu akun per platform per pengguna Mengepost (seperti TikTok sekarang).
- Jadwal, kanban, dan kalender tetap bekerja untuk post multi-platform.

### Bukan tujuan (untuk sekarang)
- Beberapa akun di platform yang sama per pengguna.
- Analitik, komentar, balasan, Stories, YouTube community post.
- Mengedit atau menghapus post yang sudah terbit di platform.
- Akun yang dipakai bersama satu tim.

### Harus dihindari (gagal walau secara teknis jalan)
- **Post ganda**: retry atau cron yang berjalan dua kali tidak boleh menerbitkan ulang ke platform yang sudah berhasil.
- **Memotong diam-diam**: caption yang terlalu panjang atau gambar yang melebihi batas platform tidak boleh dipotong otomatis. Tampilkan peringatan; platform itu tidak bisa dipilih atau disimpan sampai diperbaiki.
- **Merusak alur TikTok** yang sudah ada, termasuk aturan UX yang diwajibkan audit TikTok: menampilkan creator info, tidak ada privacy default, opsi comment/duet/stitch, dan pengungkapan konten bermerek.
- **Media terbuka permanen**: link media untuk platform yang menarik file dari URL harus sementara dan tidak bisa ditebak.
- Media dihapus dari R2 padahal masih ada platform yang belum terbit.

## 3. Batasan

- Stack tetap: SvelteKit (Svelte 5 runes) di Cloudflare Workers, D1, R2, cron tiap menit (`scripts/wrap-worker.js` → `/api/cron`). Tidak menambah framework atau layanan hosting baru.
- Batas Workers: body request maksimal 100MB (upload video sekarang dibatasi 95MB), plus batas CPU time dan jumlah subrequest per invocation. Pekerjaan publish harus bisa dicicil antar cron tick, jangan semua dalam satu request.
- Token tiap platform disimpan terenkripsi (`src/lib/server/crypto.ts`, AES-GCM dari `APP_SECRET`) dan di-refresh otomatis.
- **Instagram, Threads, dan TikTok photo post menarik media dari URL publik**, tidak menerima upload file. Konsekuensinya:
  - Mengepost harus bisa memberi URL sementara untuk file di R2.
  - Fitur ini **tidak bisa dites dari `localhost`** tanpa tunnel publik (misalnya cloudflared).
  - TikTok mensyaratkan domain/URL prefix asal media diverifikasi di TikTok developer portal.
- Status aplikasi di tiap platform:
  - **Google** masih "Testing": hanya test user yang bisa connect, dan koneksi kedaluwarsa sekitar 7 hari. Video yang diupload lewat API dari project yang belum diaudit terkunci *private*.
  - **Meta** (Instagram, Threads) butuh app review untuk akses publik.
  - **X** butuh tier API berbayar untuk posting dengan media.
- Batas tiap platform di dokumen ini berasal dari pengetahuan umum. **Builder wajib memverifikasi ke dokumentasi resmi terbaru** sebelum mengimplementasikan tiap adapter.

## 4. Keputusan pemilik

1. Broadcast: satu post → beberapa platform.
2. Caption utama + caption per platform opsional.
3. Jenis isi: video, gambar (carousel), atau teks.
4. Gagal sebagian → retry hanya target yang gagal.
5. Satu akun per platform per pengguna.
6. Urutan pengerjaan: (1) fondasi + TikTok + YouTube, (2) Instagram + Threads, (3) X.
7. Bila hasil kiriman ke platform **tidak pasti**, target ditandai **"perlu dicek"**; pengguna memeriksa platformnya sendiri sebelum boleh mengirim ulang. Risiko post ganda lebih buruk daripada repot memeriksa.
8. Aplikasi TikTok **masih dalam review**. UI TikTok yang di-review tidak boleh berubah perilakunya, dan TikTok photo post ditunda (lihat §6).
9. **Platform tujuan terkunci begitu ada satu target yang terbit.** Untuk menambah platform lain, pengguna membuat post baru dan mengunggah ulang medianya.

## 5. Desain

Bagian bertanda **[usulan Claude]** dibuat saat brainstorming dan disetujui sebagai bagian gambaran keseluruhan, tapi detailnya boleh dikoreksi.

### 5.1 Model data [usulan Claude]

**`social_accounts`** (sudah ada, dari `migrations/0002_social_accounts.sql`) menjadi satu-satunya tempat akun. Isi `tiktok_accounts` dipindah ke sini (`open_id` → `external_id`), lalu `tiktok_accounts` dihapus. `src/lib/server/tiktok.ts` diubah untuk membaca dan menulis `social_accounts`.

**`posts`** menyimpan hal yang sama untuk semua platform: `caption` (utama), `status`, `scheduled_at`, `published_at`, timestamp. Kolom khusus TikTok (`privacy`, `allow_comment`, `allow_duet`, `allow_stitch`, `brand_organic`, `brand_content`) dan kolom publish (`publish_id`, `fail_reason`) pindah ke target. Kolom video tunggal (`video_*`) pindah ke `post_media`.

**`post_media`**: satu baris per file. Isinya `post_id`, urutan (`position`), `kind` (`video` | `image`), kunci R2, nama, ukuran, MIME type, dan metadata yang dibutuhkan validasi (misalnya durasi video, dimensi gambar).
Aturan isi post: **tepat satu video**, **atau satu sampai N gambar**, **atau tanpa media** (teks). Video dan gambar tidak dicampur dalam satu post.

**`post_targets`**: satu baris per (post, platform). Isinya:
- `status`: `pending` | `publishing` | `published` | `failed` | `unknown` ("perlu dicek", lihat 5.3)
- `caption` override (NULL = pakai caption utama)
- `settings` JSON (pengaturan khusus platform, lihat 5.4)
- ID hasil publish di platform (publish id, container id, atau video id) dan URL post bila tersedia
- `fail_reason`, `published_at`, `updated_at`

**Status post dihitung dari targetnya** (disimpan ulang setiap kali target berubah supaya kanban dan cron bisa query cepat):
- `idea` / `draft` / `scheduled`: dipilih pengguna, seperti sekarang.
- `publishing`: masih ada target yang sedang diproses.
- `published`: semua target `published`.
- `failed`: tidak ada target yang masih diproses, dan minimal satu target `failed` atau `unknown`. Kartu post menampilkan ringkasan, misalnya "2 dari 3 terbit" atau "1 perlu dicek".

Kanban dan kalender tetap memakai kolom yang sama. Post `failed` (termasuk gagal sebagian) tetap muncul di kolom Drafts seperti sekarang, dengan penanda platform mana yang gagal.

**Data lama**: D1 production kosong; D1 lokal hanya berisi data tes. Migrasi cukup memindahkan post yang ada menjadi target `tiktok`, tanpa perlu menjaga kompatibilitas jangka panjang.

### 5.2 Adapter per platform [usulan Claude]

Setiap platform punya satu modul server (`src/lib/server/<platform>.ts`, pola `tiktok.ts` dan `youtube.ts` yang sudah ada) yang menyediakan antarmuka yang sama:

- **Kemampuan (capabilities)**, dipakai juga di editor (client):
  - jenis isi yang didukung (teks / gambar / video)
  - jumlah gambar maksimal
  - panjang caption maksimal
  - tipe dan ukuran file yang diterima
- **Validasi**: apakah post + target ini siap terbit, dengan pesan error yang ramah.
- **Publish**: mulai menerbitkan. Hasilnya `published` (selesai sinkron) atau `processing` + ID untuk dicek kemudian.
- **Cek status**: untuk platform yang memproses secara async (TikTok, container Instagram/Threads, pemrosesan video YouTube bila perlu).
- **Koneksi**: authorize URL, tukar code, refresh token, disconnect (yang sudah ada untuk TikTok dan YouTube).

Matriks kemampuan awal (verifikasi ulang ke dokumentasi):

| | Teks | Gambar | Carousel maks | Video | Cara kirim media |
|---|---|---|---|---|---|
| TikTok | ✗ | ✓ (photo post, ditunda ke tahap 4) | 35 | ✓ | Video: upload chunk (sudah ada). Foto: tarik dari URL |
| YouTube | ✗ | ✗ | – | ✓ | Upload resumable |
| Instagram | ✗ | ✓ | 10 | ✓ (Reels) | Tarik dari URL |
| Threads | ✓ | ✓ | 20 | ✓ | Tarik dari URL |
| X | ✓ | ✓ | 4 | ✓ | Upload media chunk |

### 5.3 Alur publish [usulan Claude]

- **Post now** atau **cron untuk post terjadwal yang jatuh tempo**: post diklaim secara atomik (seperti `publishPost` sekarang). Semua target `pending` atau `failed` menjadi `publishing`, lalu tiap target dikirim lewat adapternya. Kegagalan satu target tidak menghentikan target lain.
- **Klaim per target juga atomik** (`UPDATE … WHERE status IN (…)`), supaya dua cron tick atau klik ganda tidak menerbitkan dua kali. Target yang `published` tidak pernah dikirim ulang.
- **Cron** juga mengecek target yang masih `processing`, menggantikan `syncStatus` yang sekarang khusus TikTok. Endpoint `/api/posts/[id]/sync` tetap ada untuk polling dari editor.
- **Gagal pasti vs hasil tidak pasti** (keputusan pemilik #7):
  - **`failed`**: platform jelas menolak sebelum menerima post (error API, token kedaluwarsa, validasi). Aman di-retry.
  - **`unknown` ("perlu dicek")**: Mengepost tidak tahu apakah platform sudah menerima post. Contohnya: request timeout atau putus setelah data terkirim, Worker berhenti di tengah upload, atau target tertahan di `publishing` melewati batas waktu (dideteksi cron). Target ini **tidak boleh di-retry otomatis**.
  - UI target `unknown` menampilkan penjelasan dan dua pilihan:
    - **"Sudah terbit"**: tandai `published`; link post boleh diisi, tidak wajib.
    - **"Belum terbit, kirim ulang"**: retry seperti target `failed`.
  - Bila adapter bisa memastikan sendiri lewat API (misalnya status `publish_id` TikTok atau container Instagram/Threads masih bisa ditanyakan), cek otomatis dulu sebelum menandai `unknown`.
- **Retry**: tombol di post yang gagal (atau gagal sebagian) hanya mengirim ulang target `failed`, plus target `unknown` setelah pengguna memilih "Belum terbit". Bisa per platform atau "retry semua yang gagal". Sebelum retry, validasi dijalankan ulang (misalnya akun sudah di-reconnect).
- **Pilihan platform terkunci** begitu ada satu target `published` (keputusan pemilik #9): target tidak bisa ditambah atau dihapus lagi. Editor menjelaskan bahwa untuk platform lain pengguna perlu membuat post baru dan mengunggah ulang medianya. Dengan begitu post `published` tidak pernah kembali ke status sebelumnya.
- **Mengedit post yang sudah terbit sebagian** [usulan Claude]:
  - Media dan caption utama dikunci begitu ada target yang `published`, supaya isi di tiap platform tetap sama.
  - Pengaturan dan caption override target yang `failed` masih boleh diubah sebelum retry.
- **Media di R2**: dihapus otomatis setelah **semua** target `published`. Selama masih ada target yang gagal, media disimpan sampai post dihapus pengguna. Ini menggantikan perilaku sekarang, yang menghapus video begitu TikTok selesai.

### 5.4 Editor post [usulan Claude]

Urutan isi editor:
1. **Media**: unggah satu video, atau satu sampai beberapa gambar yang bisa diurutkan ulang; atau kosong untuk post teks.
2. **Caption utama**.
3. **Pilih platform**: chip/toggle untuk lima platform.
   - Platform yang belum di-connect tidak bisa dipilih, dengan link ke Settings → Connections.
   - Platform yang tidak cocok dengan isi post juga tidak bisa dipilih, dengan alasan singkat. Contoh: "YouTube butuh video", "X maksimal 4 gambar".
4. **Panel per platform terpilih**: penghitung karakter sesuai batas platform, toggle "pakai caption sendiri", dan pengaturan khusus:
   - **TikTok**: aplikasi TikTok masih dalam review (keputusan pemilik #8). Seluruh UI yang ada sekarang dipindah ke panel TikTok **tanpa mengubah perilaku, isian, urutan, atau teks pernyataannya**: creator info, privacy tanpa default, comment/duet/stitch, disclosure konten bermerek, batas durasi, dan teks persetujuan. Hanya posisinya di halaman yang berubah.
   - **YouTube**: judul (wajib, maks 100 karakter, default diambil dari baris pertama caption, bisa diubah), deskripsi (default caption), visibility (public/unlisted/private), dan "made for kids" (wajib dijawab menurut kebijakan YouTube). Kategori memakai default.
   - **Instagram**: video menjadi Reels; gambar menjadi post tunggal atau carousel.
   - **Threads** dan **X**: hanya caption dengan batas karakternya.
5. **Simpan / jadwalkan / post now**: tombol dinonaktifkan dengan alasan jelas bila ada target yang belum valid.
6. **Status per platform** setelah publish: terbit (dengan link ke post bila ada), sedang diproses, atau gagal (dengan alasan + tombol Retry).

Teks khusus TikTok ("Your next TikTok…", "Publishing to TikTok…") diganti dengan teks yang netral platform.

Editor **tidak boleh error** bila TikTok belum di-connect. Ini terjadi sekarang karena `creatorInfo` selalu dipanggil di `src/routes/app/posts/[id]/+page.server.ts`.

### 5.5 Settings, sidebar, dashboard, daftar post

- **Settings → Connections**: kartu untuk kelima platform dengan pola yang sama (connect, reconnect, disconnect). TikTok dan YouTube sudah ada.
- **Sidebar** (`src/routes/app/+layout.svelte`) dan **dashboard** (`src/routes/app/+page.svelte`): ganti indikator "Connect TikTok" dengan ringkasan koneksi (misalnya "2 dari 5 terhubung"), lalu link ke Connections.
- **Daftar post, kanban, kalender**: tampilkan ikon platform tujuan per post beserta status per platform.

### 5.6 Halaman publik dan legal

Landing (`src/routes/(site)/+page.svelte`), Terms, dan Privacy diperbarui untuk menyebut semua platform, data yang diambil dari masing-masing, dan cara mencabut akses. Untuk Google, halaman Privacy wajib memuat pernyataan kepatuhan **Google API Services User Data Policy (Limited Use)**. Ini dibutuhkan untuk verifikasi aplikasi Google.

### 5.7 Media publik sementara [usulan Claude]

Untuk platform yang menarik media dari URL, Mengepost menyajikan file R2 lewat route di domain aplikasi dengan **URL bertanda tangan dan kedaluwarsa** (HMAC dari `APP_SECRET`, berlaku cukup lama untuk platform menarik file, misalnya beberapa jam). Bucket R2 tidak dibuat publik.

## 6. Tahapan

1. **Fondasi + TikTok + YouTube**: model data baru (5.1), migrasi TikTok ke `social_accounts`, adapter (5.2), alur publish, retry, dan "perlu dicek" (5.3), editor baru (5.4), sidebar/dashboard/daftar post (5.5), halaman legal (5.6), dan posting video ke YouTube. TikTok tetap **video saja** di tahap ini.
2. **Instagram + Threads**: koneksi akun dan adapter keduanya, plus URL media sementara (5.7).
   - **Instagram** [keputusan Claude]: memakai **Instagram API with Instagram Login**, untuk akun Professional (Business/Creator) tanpa perlu Facebook Page. Akun pribadi tidak didukung oleh API, dan kartu Connections harus menjelaskannya.
   - **Threads**: koneksi terpisah lewat Threads API.
3. **X**: koneksi OAuth 2.0 dan adapter. [keputusan Claude] Bila tier API yang dibeli tidak mendukung upload media, X dirilis untuk **post teks saja** (matriks kemampuan disesuaikan) dan kuota bulanan tier itu ditampilkan atau ditangani. Tier dipilih pemilik saat tahap ini dimulai.
4. **TikTok photo post** (ditunda): setelah aplikasi TikTok lolos review, izin photo post tersedia, dan `mengepost.menglabs.id` diverifikasi sebagai sumber media di TikTok developer portal. Memakai URL media sementara dari tahap 2.

Setiap tahap harus bisa di-deploy sendiri tanpa merusak yang sudah ada.

## 7. Diserahkan ke builder

- Skema SQL persis, nama kolom, dan isi migrasi.
- Struktur file adapter dan komponen UI editor.
- Interval polling status dan berapa target yang diproses per cron tick (dalam batas Workers).
- Skema tanda tangan URL media sementara.
- Batas ukuran dan tipe file gambar, validasi dimensi dan durasi, dan cara membaca metadata media.
- Detail pesan error per platform.
- Batas waktu sebelum target `publishing` dianggap `unknown`, dan apakah "Post now" memproses di request itu sendiri atau menyerahkan ke cron (selama aturan "perlu dicek" di 5.3 dipatuhi).
