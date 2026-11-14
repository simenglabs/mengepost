# Broadcast Tahap 1 (Fondasi + TikTok + YouTube) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ubah Mengepost dari "satu post = satu kiriman TikTok" menjadi post dengan target per platform. Tahap ini membuat TikTok (video) dan YouTube (video) bisa dipilih bersamaan, dengan status per platform, retry hanya yang gagal, dan status "perlu dicek".

**Architecture:**
- Logika murni (kemampuan platform, validasi pengaturan, status turunan, aturan kunci edit, deteksi target macet) ada di `src/lib/platforms.ts` dan `src/lib/targets.ts`. Keduanya dipakai client dan server, dan dites dengan `node --test`.
- Server menyimpan target di `post_targets` dan media di `post_media`.
- Tiap platform punya adapter dengan antarmuka `publish`/`poll` yang sama. Satu mesin publish (`src/lib/server/publish.ts`) dipakai bersama oleh "Post now", retry, sync, dan cron.

**Tech Stack:** SvelteKit 3 + Svelte 5 runes, Cloudflare Workers, D1, R2, wrangler 4, Node 24 (type stripping untuk tes `.ts`), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-14-broadcast-design.md`

## Global Constraints

- Stack tetap: SvelteKit, Workers, D1, R2, dan cron per menit lewat `scripts/wrap-worker.js` → `/api/cron`. Tidak menambah dependency runtime.
- File yang diimpor client (`src/lib/platforms.ts`, `src/lib/targets.ts`, `src/lib/posts.ts`) tidak boleh mengimpor `cloudflare:workers` atau `$app/*`. Gunakan sintaks TypeScript yang bisa di-strip (tanpa `enum` atau `namespace`) supaya `node --test` bisa menjalankannya.
- Token platform disimpan terenkripsi lewat `encrypt`/`decrypt` di `src/lib/server/crypto.ts`.
- Target `published` **tidak pernah** dikirim ulang. Klaim post dan klaim target memakai `UPDATE … WHERE status IN (…)` lalu mengecek `meta.changes`.
- Hasil tidak pasti → status target `unknown` ("perlu dicek"), dan tidak pernah di-retry otomatis.
- Panel TikTok: perilaku, isian, urutan, dan teks persetujuan harus **sama** dengan editor sekarang (`src/routes/app/posts/[id]/+page.svelte:430-573`). Hanya posisinya yang pindah. Aplikasi TikTok masih dalam review.
- TikTok di tahap ini hanya video. Instagram, Threads, dan X tampil sebagai "Coming soon" dan tidak bisa dipilih atau di-connect.
- Platform tujuan terkunci setelah ada satu target `published` atau `unknown`.
- Media di R2 dihapus hanya saat **semua** target `published`, atau saat post dihapus.
- Batas upload: video ≤ 95MB (`video/mp4`, `video/quicktime`, `video/webm`, satu per post). Gambar `image/jpeg` atau `image/png`, ≤ 8MB per file, maksimal 35 per post. Video dan gambar tidak dicampur.
- Batas caption: TikTok 2200, YouTube (deskripsi) 5000, Instagram 2200, Threads 500, X 280 karakter. Batas carousel: TikTok 35, Instagram 10, Threads 20, X 4. Angka ini dari pengetahuan umum; verifikasi ke dokumentasi resmi saat mengerjakan adapter terkait.
- Judul YouTube wajib diisi, maksimal 100 karakter, tanpa karakter `<` atau `>`. Visibility dan "made for kids" wajib dipilih tanpa default.
- Teks UI tetap dalam bahasa Inggris, mengikuti UI yang sudah ada.
- Kuota YouTube Data API default 10.000 unit/hari, dan satu upload video memakan kuota besar (verifikasi angkanya). Tampilkan error kuota dengan ramah, jangan di-retry otomatis.

## Review Focus

1. **Klik ganda "Post now" atau cron yang tumpang tindih** harus tetap menerbitkan satu kali per platform. Diverifikasi di Task 6, Step 7.
2. **TikTok selesai lebih dulu daripada YouTube** tidak boleh menghapus video yang masih dibutuhkan YouTube. Dites di Task 2 (`shouldDeleteMedia`) dan diverifikasi di Task 6.
3. **TikTok belum di-connect atau token kedaluwarsa**: editor tetap terbuka, dan TikTok hanya tampil "Connect first". Diverifikasi di Task 8, Step 6.
4. **Post lama setelah migrasi**: post TikTok yang sudah ada tetap tampil, bisa diedit, dan dijadwalkan dengan pengaturan yang sama. Diverifikasi di Task 3, Step 5.
5. **Caption utama melebihi batas, tapi platform memakai caption sendiri yang pendek**: platform itu tetap valid, karena yang dihitung caption efektif. Dites di Task 1.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `src/lib/platforms.ts` (baru) | Daftar platform, label, kemampuan, jenis isi, masalah kecocokan platform, caption efektif, default judul YouTube |
| `src/lib/targets.ts` (baru) | Tipe status target dan pengaturan per platform, parse/validasi pengaturan, status post turunan, aturan kunci edit, deteksi target macet, kapan media dihapus |
| `src/lib/posts.ts` | Tipe `Post`, `PostView`, `Media`, `Target` (tanpa kolom TikTok), label status, kolom kanban |
| `migrations/0003_broadcast.sql` (baru) | `post_media`, `post_targets`, pemindahan data TikTok, buang kolom lama |
| `src/lib/server/platform-error.ts` (baru) | `PlatformError` bersama (hasil `failed` vs `unknown`) |
| `src/lib/server/accounts.ts` (baru) | Baca daftar koneksi user dari `social_accounts` |
| `src/lib/server/tiktok.ts` | Pindah ke `social_accounts`; adapter publish/poll |
| `src/lib/server/youtube.ts` | Tambah adapter publish (upload resumable) dan poll |
| `src/lib/server/adapters.ts` (baru) | Antarmuka `Adapter` + peta `platform → adapter` |
| `src/lib/server/posts.ts` | CRUD post, target, dan media (tanpa logika publish) |
| `src/lib/server/media.ts` (baru) | Simpan, hapus, urutkan, dan stream media R2 |
| `src/lib/server/publish.ts` (baru) | Klaim, kirim, poll, retry, resolve unknown, refresh status, cron |
| `src/routes/api/posts/[id]/media/…` (baru) | Upload, hapus, urutkan, dan stream media (menggantikan `/video`) |
| `src/routes/api/posts/[id]/retry`, `…/targets/[platform]/resolve` (baru) | Retry dan resolve "perlu dicek" |
| `src/routes/app/posts/[id]/*.svelte` | Editor dipecah: `MediaPicker`, `PlatformPicker`, `TikTokPanel`, `YouTubePanel`, `TargetStatus` |
| `src/lib/ui/PlatformBadge.svelte` (baru) | Ikon/label platform + status kecil untuk list, kanban, kalender |

---

### Task 1: Test runner + modul platform bersama

**Files:**
- Modify: `package.json` (script `test`)
- Create: `src/lib/platforms.ts`
- Test: `src/lib/platforms.test.js`

**Interfaces:**
- Produces:
  - `type Platform = 'tiktok' | 'youtube' | 'instagram' | 'threads' | 'x'`
  - `PLATFORMS: Platform[]` (urutan tampil sama dengan urutan di type)
  - `platformLabel: Record<Platform, string>` → `TikTok`, `YouTube`, `Instagram`, `Threads`, `X`
  - `type ContentKind = 'text' | 'image' | 'video'`
  - `type Caps = { available: boolean; kinds: ContentKind[]; maxImages: number; maxCaption: number }`
  - `CAPS: Record<Platform, Caps>`:
    - `tiktok {available:true, kinds:['video'], maxImages:0, maxCaption:2200}`
    - `youtube {true, ['video'], 0, 5000}`
    - `instagram {false, ['image','video'], 10, 2200}`
    - `threads {false, ['text','image','video'], 20, 500}`
    - `x {false, ['text','image','video'], 4, 280}`
  - `contentKind(media: { kind: 'image' | 'video' }[]): ContentKind`
  - `effectiveCaption(main: string, override: string | null): string`
  - `platformIssue(p: Platform, ctx: { media: { kind: 'image' | 'video' }[]; caption: string }): string | null`. `ctx.caption` adalah caption **efektif**.
  - `defaultYouTubeTitle(caption: string): string`

- [ ] **Step 1: Tambahkan script tes** di `package.json`: `"test": "node --test \"src/**/*.test.js\""`. Ubah `src/lib/server/chunking.test.js` ke `node:test` (`test('chunking', …)`) supaya ikut terdeteksi.

- [ ] **Step 2: Tulis tes yang gagal** di `src/lib/platforms.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPS, PLATFORMS, contentKind, effectiveCaption, platformIssue, defaultYouTubeTitle } from './platforms.ts';

const vid = [{ kind: 'video' }];
const imgs = (n) => Array.from({ length: n }, () => ({ kind: 'image' }));

test('order and availability', () => {
	assert.deepEqual(PLATFORMS, ['tiktok', 'youtube', 'instagram', 'threads', 'x']);
	assert.deepEqual(PLATFORMS.filter((p) => CAPS[p].available), ['tiktok', 'youtube']);
});
test('contentKind', () => {
	assert.equal(contentKind([]), 'text');
	assert.equal(contentKind(vid), 'video');
	assert.equal(contentKind(imgs(3)), 'image');
});
test('effectiveCaption uses override only when non-null', () => {
	assert.equal(effectiveCaption('main', null), 'main');
	assert.equal(effectiveCaption('main', ''), '');
	assert.equal(effectiveCaption('main', 'yt'), 'yt');
});
test('platformIssue', () => {
	assert.equal(platformIssue('youtube', { media: vid, caption: 'hi' }), null);
	assert.equal(platformIssue('youtube', { media: [], caption: 'hi' }), 'YouTube needs a video.');
	assert.equal(platformIssue('tiktok', { media: imgs(2), caption: '' }), 'TikTok needs a video.');
	assert.equal(platformIssue('instagram', { media: vid, caption: '' }), 'Instagram is coming soon.');
	assert.equal(platformIssue('tiktok', { media: vid, caption: 'x'.repeat(2201) }), 'TikTok captions can be up to 2200 characters.');
	// Review Focus 5: a long main caption does not matter when the effective (override) caption is short.
	assert.equal(platformIssue('tiktok', { media: vid, caption: effectiveCaption('x'.repeat(5000), 'short') }), null);
});
test('defaultYouTubeTitle', () => {
	assert.equal(defaultYouTubeTitle('First line\nsecond'), 'First line');
	assert.equal(defaultYouTubeTitle('a'.repeat(150)), 'a'.repeat(100));
	assert.equal(defaultYouTubeTitle('Hi <b>there</b>'), 'Hi bthere/b'); // < and > are stripped
	assert.equal(defaultYouTubeTitle('  '), '');
});
```

- [ ] **Step 3: Jalankan** `npm test`. Expected: FAIL, `Cannot find module './platforms.ts'`.

- [ ] **Step 4: Implementasikan `src/lib/platforms.ts`** sesuai Interfaces.
  - Urutan pengecekan `platformIssue`:
    1. Platform belum tersedia → `` `${label} is coming soon.` ``
    2. Jenis isi tidak didukung → untuk platform yang hanya menerima video: `` `${label} needs a video.` ``. Selain itu: `` `${label} can't post ${kind} posts.` ``
    3. Jumlah gambar > `maxImages` → `` `${label} allows up to ${n} images.` ``
    4. Caption terlalu panjang → `` `${label} captions can be up to ${max} characters.` ``
  - `defaultYouTubeTitle`: ambil baris pertama, buang `<` dan `>`, trim, lalu potong ke 100 karakter.

- [ ] **Step 5: Jalankan** `npm test`. Expected: semua PASS, termasuk `chunking`.

- [ ] **Step 6: Commit**

```bash
git add package.json src/lib/platforms.ts src/lib/platforms.test.js src/lib/server/chunking.test.js
git commit -m "feat: shared platform capabilities"
```

---

### Task 2: Model target bersama (status, pengaturan, kunci, macet)

**Files:**
- Create: `src/lib/targets.ts`
- Modify: `src/lib/posts.ts`
- Test: `src/lib/targets.test.js`

**Interfaces:**
- Consumes: `Platform`, `CAPS` dari Task 1.
- Produces (di `src/lib/targets.ts`):
  - `type TargetStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'unknown'`
  - `type TikTokSettings = { privacy: Privacy | null; allow_comment: boolean; allow_duet: boolean; allow_stitch: boolean; brand_organic: boolean; brand_content: boolean }`
  - `type YouTubeVisibility = 'public' | 'unlisted' | 'private'`
  - `type YouTubeSettings = { title: string; visibility: YouTubeVisibility | null; made_for_kids: boolean | null }`
  - `type TargetSettings = TikTokSettings | YouTubeSettings | Record<string, never>`
  - `defaultSettings(p: Platform, caption: string): TargetSettings`
    - TikTok: privacy `null`, semua flag `false`
    - YouTube: `{ title: defaultYouTubeTitle(caption), visibility: null, made_for_kids: null }`
    - Lainnya: `{}`
  - `parseSettings(p: Platform, input: unknown): TargetSettings`: untrusted input → nilai bersih. Melempar `Error` berisi pesan untuk bentuk yang salah.
  - `settingsIssue(p: Platform, s: TargetSettings, ctx: { tiktokPrivacyOptions?: Privacy[]; videoSeconds?: number | null; tiktokMaxSeconds?: number }): string | null`. Aturannya:
    - TikTok:
      - privacy wajib → `'Choose who can view this video.'`
      - privacy harus ada di opsi creator bila opsi diberikan → `'That privacy option is not available for this account. Choose another one.'`
      - `brand_content && privacy === 'SELF_ONLY'` → `'Branded content cannot be set to "Only me".'`
      - durasi melebihi batas → `'Choose a shorter video for TikTok.'`
    - YouTube:
      - judul kosong → `'Add a YouTube title.'`
      - lebih dari 100 karakter, atau berisi `<`/`>` → `'YouTube titles can be up to 100 characters, without < or >.'`
      - visibility null → `'Choose the YouTube visibility.'`
      - made_for_kids null → `'Tell YouTube whether this video is made for kids.'`
  - `derivePostStatus(current: Status, targets: TargetStatus[]): Status`. Algoritmanya:
    ```
    if targets kosong → current
    if current ∈ {idea,draft,scheduled} && semua 'pending' → current
    if semua 'published' → 'published'
    if ada 'pending' atau 'publishing' → 'publishing'
    else → 'failed'
    ```
  - `editRules(post: { status: Status }, targets: { status: TargetStatus }[]): { frozen: boolean; contentLocked: boolean; editable: (t: TargetStatus) => boolean }`
    - `frozen`: post `publishing` atau `published`, tidak ada yang bisa diedit.
    - `contentLocked`: ada target `published` atau `unknown`. Media, caption utama, set platform, status, dan jadwal terkunci.
    - `editable(t)`: target itu boleh diubah pengaturan atau caption-nya, yaitu bila `!frozen && (!contentLocked || t === 'failed')`.
  - `STALE_MS = 15 * 60_000`, `PROCESSING_GIVE_UP_MS = 24 * 3_600_000`
  - `staleOutcome(t: { status: TargetStatus; external_id: string | null; started_at: number | null }, now: number, canPoll: boolean): 'unknown' | null`
    - `null` bila status bukan `publishing`.
    - Tanpa `external_id` dan sudah > `STALE_MS` → `'unknown'`.
    - Dengan `external_id`, dan (`!canPoll` atau sudah > `PROCESSING_GIVE_UP_MS`) → `'unknown'`.
    - Selain itu `null`.
  - `shouldDeleteMedia(targets: TargetStatus[]): boolean`: true hanya bila ada target dan semuanya `published`.
  - `readinessError(v: PostView, ctx?: { tiktokPrivacyOptions?: Privacy[]; tiktokMaxSeconds?: number }, only?: Platform[]): string | null`. Fungsi murni yang dipakai server (jadwal, publish, retry) dan client (editor, kanban). `only` membatasi target yang dicek, untuk retry.
    - Tanpa target → `'Choose at least one platform.'`
    - Selain itu, untuk tiap target (urut `PLATFORMS`): pesan pertama dari `platformIssue(platform, {media, caption: effectiveCaption(main, target.caption)})`, lalu `settingsIssue(...)` dengan `videoSeconds` dari `duration_ms` media video. Awali dengan `` `${label}: ` `` bila pesannya belum mengandung nama platform.
- Produces (di `src/lib/posts.ts`):
  - Hapus `privacy`, `allow_*`, `brand_*`, `video_*`, `publish_id`, `fail_reason` dari `Post`.
  - `type Media = { id: string; post_id: string; position: number; kind: 'image' | 'video'; name: string; size: number; type: string; duration_ms: number | null }`
  - `type Target = { post_id: string; platform: Platform; status: TargetStatus; caption: string | null; settings: TargetSettings; external_id: string | null; external_url: string | null; fail_reason: string | null; started_at: number | null; published_at: number | null; updated_at: number }`
  - `type PostView = Post & { media: Media[]; targets: Target[] }`
  - `postSummary(v: PostView): string`, contoh: `'2 of 3 published'`, `'1 needs checking'`, `''` bila tidak relevan.
  - `CreatorInfo`, `Privacy`, `PRIVACY`, dan `privacyLabel` tetap di `posts.ts`.

- [ ] **Step 1: Tulis tes yang gagal** di `src/lib/targets.test.js`. Gunakan `node:test` + `assert/strict` dan cakup:
  - `derivePostStatus`:
    - `('draft', ['pending','pending'])` → `'draft'`
    - `('publishing', ['published','publishing'])` → `'publishing'`
    - `('publishing', ['published','failed'])` → `'failed'`
    - `('publishing', ['published','unknown'])` → `'failed'`
    - `('publishing', ['published','published'])` → `'published'`
    - `('publishing', ['pending'])` → `'publishing'`
    - `('draft', [])` → `'draft'`
  - `shouldDeleteMedia`:
    - `['published','publishing']` → false (Review Focus 2)
    - `['published','failed']` → false
    - `['published','published']` → true
    - `[]` → false
  - `editRules`:
    - Post `draft` dengan target `failed` saja → `contentLocked` false.
    - Post `failed` dengan `['published','failed']` → `contentLocked` true, `editable('failed')` true, `editable('published')` false.
    - Post `publishing` → `frozen` true dan `editable('failed')` false.
  - `staleOutcome` (pakai `now = 10_000_000`):
    - publishing, tanpa id, mulai `now - STALE_MS - 1` → `'unknown'`
    - publishing, tanpa id, mulai `now - 1000` → `null`
    - publishing, id `'abc'`, canPoll true, mulai `now - STALE_MS - 1` → `null`
    - publishing, id `'abc'`, canPoll true, mulai `now - PROCESSING_GIVE_UP_MS - 1` → `'unknown'`
    - failed → `null`
  - `readinessError`:
    - Post tanpa target → `'Choose at least one platform.'`
    - Post video dengan target YouTube `visibility: null` → `'Choose the YouTube visibility.'` (sudah menyebut YouTube, jadi tanpa awalan)
    - Post video dengan target TikTok tanpa privacy → `'TikTok: Choose who can view this video.'`
    - Post tanpa media dengan target YouTube → `'YouTube needs a video.'`
    - Dengan `only: ['tiktok']`, masalah YouTube diabaikan.
  - `settingsIssue`:
    - TikTok tanpa privacy → `'Choose who can view this video.'`
    - TikTok `brand_content` + `SELF_ONLY` → pesan branded
    - TikTok privacy tidak ada di opsi `['SELF_ONLY']` → pesan opsi
    - TikTok `videoSeconds: 700, tiktokMaxSeconds: 600` → `'Choose a shorter video for TikTok.'`
    - YouTube `{title:'',…}` → `'Add a YouTube title.'`
    - YouTube judul `'a<b'` → pesan judul
    - YouTube lengkap `{title:'T', visibility:'private', made_for_kids:false}` → `null`
  - `parseSettings`:
    - `('youtube', {title:'T', visibility:'nope', made_for_kids:false})` melempar error.
    - `('tiktok', {privacy:'SELF_ONLY', allow_comment:1})` → `allow_comment: true`, flag lain `false`.
  - `defaultSettings('youtube', 'Hello\nworld').title === 'Hello'`

- [ ] **Step 2: Jalankan** `npm test`. Expected: FAIL, modul `./targets.ts` tidak ditemukan.

- [ ] **Step 3: Implementasikan `src/lib/targets.ts`** dan ubah tipe di `src/lib/posts.ts` sesuai Interfaces. `postSummary` hanya menghitung bila `status` ∈ {publishing, published, failed}. Prioritasnya: ada `unknown` → `` `${n} needs checking` ``; selain itu `` `${published} of ${total} published` ``.

- [ ] **Step 4: Jalankan** `npm test`. Expected: PASS. (`npm run check` boleh masih gagal karena file server belum disesuaikan. Itu diperbaiki di Task 3–4.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/targets.ts src/lib/targets.test.js src/lib/posts.ts
git commit -m "feat: shared target model and status rules"
```

---

### Task 3: Migrasi data + akun TikTok pindah ke `social_accounts`

**Files:**
- Create: `migrations/0003_broadcast.sql`, `src/lib/server/accounts.ts`
- Modify: `src/lib/server/tiktok.ts` (semua query `tiktok_accounts`), `src/routes/app/settings/+page.server.ts` (load TikTok), `src/routes/app/+layout.server.ts`

**Interfaces:**
- Produces:
  - Tabel `post_media(id TEXT PK, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, position INTEGER NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('image','video')), r2_key TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, type TEXT NOT NULL, duration_ms INTEGER, created_at INTEGER NOT NULL)`, plus index `(post_id, position)`.
  - Tabel `post_targets(post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, platform TEXT NOT NULL CHECK (platform IN ('tiktok','youtube','instagram','threads','x')), status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','publishing','published','failed','unknown')), caption TEXT, settings TEXT NOT NULL DEFAULT '{}', external_id TEXT, external_url TEXT, fail_reason TEXT, started_at INTEGER, published_at INTEGER, updated_at INTEGER NOT NULL, PRIMARY KEY (post_id, platform))`, plus index `(status, started_at)`.
  - `accounts.ts`: `listConnections(userId: string): Promise<Partial<Record<Platform, { display_name: string; avatar_url: string; connected_at: number; refresh_expires_at: number | null }>>>`
  - `tiktok.ts` tetap mengekspor `connectAccount`, `accessToken`, `disconnectAccount`, `authorizeUrl`, `creatorInfo`, `TikTokError`, tapi membaca dan menulis `social_accounts` dengan `platform = 'tiktok'`.

- [ ] **Step 1: Tulis `migrations/0003_broadcast.sql`** dengan urutan berikut:
  1. Buat dua tabel di atas.
  2. `INSERT INTO social_accounts (…) SELECT user_id, 'tiktok', open_id, display_name, avatar_url, token, access_expires_at, refresh_expires_at, connected_at FROM tiktok_accounts`.
  3. `INSERT INTO post_media` dari `posts` yang `video_key IS NOT NULL`: `id = lower(hex(randomblob(16)))`, `position 0`, `kind 'video'`, `duration_ms NULL`, `created_at = posts.updated_at`.
  4. `INSERT INTO post_targets` untuk **setiap** post dengan `platform 'tiktok'`:
     - `settings = json_object('privacy', privacy, 'allow_comment', json(CASE WHEN allow_comment THEN 'true' ELSE 'false' END), …)` untuk keenam field `TikTokSettings`.
     - Pemetaan status: `idea/draft/scheduled → pending`, `publishing → publishing` (`external_id = publish_id`, `started_at = updated_at`), `published → published` (`published_at`), `failed → failed` (`fail_reason`).
  5. `ALTER TABLE posts DROP COLUMN` untuk `privacy, allow_comment, allow_duet, allow_stitch, brand_organic, brand_content, video_key, video_name, video_size, video_type, publish_id, fail_reason`.
  6. `DROP TABLE tiktok_accounts`.

- [ ] **Step 2: Siapkan data uji lalu jalankan migrasi lokal.** Sebelum migrasi, sisipkan satu user uji dan dua post lama (satu `scheduled` dengan `privacy='SELF_ONLY'`, `allow_comment=1`, `video_key='k1'`; satu `failed` dengan `fail_reason='x'`) memakai `npx wrangler d1 execute mengepost --local --command "…"`. Lalu jalankan `npm run db:migrate:local`. Expected: `0003_broadcast.sql │ ✅`.

- [ ] **Step 3: Verifikasi hasil migrasi**

Run: `npx wrangler d1 execute mengepost --local --json --command "SELECT p.status, t.status ts, t.settings, t.fail_reason FROM posts p JOIN post_targets t ON t.post_id=p.id; SELECT count(*) n FROM post_media; SELECT name FROM sqlite_master WHERE name='tiktok_accounts'"`

Expected:
- Post scheduled → `ts: pending` dengan settings berisi `"privacy":"SELF_ONLY","allow_comment":true`.
- Post failed → `ts: failed, fail_reason: x`.
- `post_media` berisi 1 baris.
- Tidak ada tabel `tiktok_accounts`.

- [ ] **Step 4: Ubah `tiktok.ts`, `accounts.ts`, settings loader, dan layout loader** ke `social_accounts`. Layout loader mengembalikan `connections: await listConnections(user.id)` sebagai pengganti `tiktok`. Pemakai `data.tiktok` di Svelte diperbaiki di Task 9; sampai saat itu, sementara isi `tiktok: connections.tiktok ?? null` supaya UI tetap jalan.

- [ ] **Step 5: Verifikasi.**
  - `npm run check` boleh masih gagal **hanya** di `src/lib/server/posts.ts` dan rute post (diperbaiki di Task 4).
  - Buka `http://localhost:5173/app/settings#connections`. Bila TikTok sudah terhubung, kartu TikTok tetap menampilkan akunnya.
  - Hapus data uji dari Step 2.

- [ ] **Step 6: Commit**

```bash
git add migrations/0003_broadcast.sql src/lib/server/accounts.ts src/lib/server/tiktok.ts src/routes/app/settings/+page.server.ts src/routes/app/+layout.server.ts
git commit -m "feat: post targets and media tables; TikTok accounts in social_accounts"
```

---

### Task 4: CRUD post, target, dan media di server + API

**Files:**
- Create: `src/lib/server/media.ts`, `src/routes/api/posts/[id]/media/+server.ts`, `src/routes/api/posts/[id]/media/[mediaId]/+server.ts`
- Delete: `src/routes/api/posts/[id]/video/+server.ts`
- Modify: `src/lib/server/posts.ts`, `src/routes/api/posts/+server.ts`, `src/routes/api/posts/[id]/+server.ts`, `src/routes/app/posts/[id]/+page.server.ts` (sementara: cukup kembalikan `post: PostView | null` agar lolos type check)

**Interfaces:**
- Consumes: `PostView`, `Media`, `Target` (Task 2), `editRules`, `parseSettings`, `defaultSettings`, `derivePostStatus`, `readinessError`, `contentKind`, `CAPS`.
- Produces (`src/lib/server/posts.ts`):
  - `PostError` (tetap)
  - `listPosts(userId): Promise<PostView[]>`: tiga query (posts, media, targets) untuk user itu, digabung di JS. `settings` di-`JSON.parse`.
  - `getPost(userId, id): Promise<PostView>`
  - `type Patch = { caption?: string; status?: 'idea' | 'draft' | 'scheduled'; scheduled_at?: number | null; targets?: { platform: Platform; caption: string | null; settings: unknown }[] }`
  - `parsePatch(input: unknown): Patch`. Caption maksimal 5000 karakter, karena batas per platform dicek oleh `platformIssue`.
  - `createPost(userId, patch): Promise<PostView>`, `updatePost(userId, id, patch): Promise<PostView>`, `deletePost(userId, id): Promise<void>`
- Produces (`src/lib/server/media.ts`):
  - `addMedia(userId, postId, body: ReadableStream, meta: { name: string; type: string; size: number; duration_ms: number | null }): Promise<PostView>`
  - `removeMedia(userId, postId, mediaId): Promise<PostView>`
  - `reorderMedia(userId, postId, ids: string[]): Promise<PostView>`
  - `openMedia(userId, postId, mediaId): Promise<{ media: Media; body: ReadableStream; size: number } | null>`
  - `deleteAllMedia(postId): Promise<void>` (hapus objek R2 dan baris)
  - `mediaObject(m: { r2_key: string }, range?: { offset: number; length: number }): Promise<R2ObjectBody | null>` untuk adapter
- Aturan `updatePost`, berurutan:
  1. `editRules` `frozen` → 409 `'This post is already being published and cannot be edited.'`
  2. `contentLocked` dan patch mengubah `caption`, `status`, `scheduled_at`, atau set platform `targets` → 409 `'Part of this post is already published. Only failed platforms can be changed.'`
  3. Saat `contentLocked`, `targets` hanya boleh mengubah `caption` dan `settings` target `failed`. Target lain di patch harus identik atau tidak disertakan.
  4. Bila tidak terkunci, `targets` mengganti seluruh set. Target baru memakai `defaultSettings` bila `settings` kosong. Target yang ada tetap mempertahankan `status`. Bila post `failed` tanpa target `published`/`unknown` diedit, semua target kembali ke `pending` dan post ke `draft` (kecuali status dipilih). Perilaku sekarang dipertahankan.
  5. `status === 'scheduled'` → `readinessError` + jadwal di masa depan (aturan sekarang: `scheduled_at < now - 60_000` ditolak).
- Aturan `addMedia`:
  - Tipe dan ukuran sesuai Global Constraints.
  - Tidak boleh mencampur video dan gambar → 400 `'A post can have one video or up to 35 images, not both.'`
  - Video kedua menggantikan video lama (dihapus dari R2).
  - Gambar ditambahkan di posisi terakhir; lebih dari 35 → 400.
  - Ditolak bila `contentLocked`.
- API:
  - `PUT /api/posts/[id]/media`: body = bytes; header `content-type`, `content-length`, `x-file-name`, dan opsional `x-duration-ms`.
  - `PATCH /api/posts/[id]/media` dengan `{ order: string[] }`.
  - `GET` dan `DELETE /api/posts/[id]/media/[mediaId]`.

- [ ] **Step 1: Implementasikan** `posts.ts` dan `media.ts` sesuai Interfaces. Jangan pindahkan `publishPost`/`syncStatus`/`runCron` ke sini; hapus saja (Task 6 membuat `publish.ts`). Sementara, ubah rute `publish`, `sync`, dan `cron` agar mengembalikan 501 sampai Task 6.

- [ ] **Step 2: Jalankan** `npm run check`. Expected: error hanya tersisa di file `.svelte` (diperbaiki di Task 8–9), tidak ada di `src/lib/server/**` atau `src/routes/api/**`.

- [ ] **Step 3: Smoke test API** dengan user dan sesi uji lokal (pola: insert `users` + `sessions` dengan `id = base64url(sha256(token))`, cookie `mp_sid`; lihat `src/lib/server/auth.ts:34-60`). Jalankan dengan curl:
  1. `POST /api/posts {"caption":"Hello\nworld","targets":[{"platform":"youtube","caption":null,"settings":{}}]}` → 200, `targets[0].settings.title === "Hello"`.
  2. `PUT /api/posts/{id}/media` dengan file mp4 kecil → `media.length === 1`, `kind: "video"`.
  3. `PUT` gambar png ke post yang sama → 400 dengan pesan campuran.
  4. `PATCH {"status":"scheduled","scheduled_at":<now+1h>}` → 400 `Choose the YouTube visibility.`
  5. `PATCH` dengan settings YouTube lengkap lalu status scheduled → 200, `status: "scheduled"`.
  6. `DELETE /api/posts/{id}` → 200; objek R2 dan baris `post_media` hilang (cek dengan `wrangler d1 execute … SELECT count(*) FROM post_media`).

- [ ] **Step 4: Commit**

```bash
git add -A src/lib/server/posts.ts src/lib/server/media.ts src/routes/api/posts
git commit -m "feat: posts with targets and media"
```

---

### Task 5: `PlatformError`, antarmuka adapter, dan adapter TikTok

**Files:**
- Create: `src/lib/server/platform-error.ts`, `src/lib/server/adapters.ts`
- Modify: `src/lib/server/tiktok.ts`, `src/lib/server/youtube.ts` (`YouTubeError extends PlatformError`), `src/lib/server/http.ts`

**Interfaces:**
- Produces:
  - `class PlatformError extends Error { constructor(message: string, public code = 'error', public outcome: 'failed' | 'unknown' = 'failed') }`. `TikTokError` dan `YouTubeError` menjadi subclass-nya, dengan konstruktor yang tetap kompatibel.
  - `type PublishInput = { userId: string; postId: string; caption: string; media: Media[]; settings: TargetSettings }`
  - `type PublishResult = { state: 'published'; externalId: string; url: string | null } | { state: 'processing'; externalId: string }`
  - `type PollResult = { state: 'processing' } | { state: 'published'; url: string | null } | { state: 'failed'; reason: string }`
  - `interface Adapter { publish(i: PublishInput): Promise<PublishResult>; poll?(userId: string, externalId: string): Promise<PollResult>; check?(userId: string): Promise<void> }`. `check` dipakai untuk validasi akun sebelum publish, misalnya creator info TikTok.
  - `adapters: Partial<Record<Platform, Adapter>>`: hanya `tiktok` dan `youtube` (YouTube diisi di Task 7; sampai saat itu, adapter YouTube melempar `PlatformError('YouTube posting is not ready yet.')`).
  - `tiktok.ts`: `tiktokAdapter: Adapter`
    - `publish` = `uploadToTikTok` yang sekarang, menerima `PublishInput`: video dari `media[0]` lewat `mediaObject` dengan range, caption = `caption`, pengaturan dari `settings as TikTokSettings`. Kembalikan `{ state: 'processing', externalId: publish_id }`.
    - `poll`: `PUBLISH_COMPLETE` → published (url `null`); `FAILED` → failed dengan `fail_reason`; lainnya → processing.
  - `http.ts`: `PlatformError` → 502 `{ message, code }`.
- Aturan `outcome`: semua error TikTok yang terjadi **sebelum** permintaan `init` mengembalikan `publish_id` adalah `failed`. Bila `init` berhasil tapi upload chunk gagal, hasilnya tetap `failed`, karena TikTok tidak menerbitkan upload yang tidak lengkap.

- [ ] **Step 1: Implementasikan** sesuai Interfaces. Hapus `publishStatus`/`uploadToTikTok` lama setelah logikanya pindah ke adapter.
- [ ] **Step 2: Jalankan** `npm run check` (error yang tersisa hanya di `.svelte` dan rute yang akan diurus Task 6) dan `npm test` (PASS).
- [ ] **Step 3: Commit**

```bash
git add src/lib/server/platform-error.ts src/lib/server/adapters.ts src/lib/server/tiktok.ts src/lib/server/youtube.ts src/lib/server/http.ts
git commit -m "feat: platform adapter interface; TikTok adapter"
```

---

### Task 6: Mesin publish, retry, "perlu dicek", sync, cron

**Files:**
- Create: `src/lib/server/publish.ts`, `src/routes/api/posts/[id]/retry/+server.ts`, `src/routes/api/posts/[id]/targets/[platform]/resolve/+server.ts`
- Modify: `src/routes/api/posts/[id]/publish/+server.ts`, `src/routes/api/posts/[id]/sync/+server.ts`, `src/routes/api/cron/+server.ts`

**Interfaces:**
- Consumes: `adapters`, `PlatformError`, `getPost`, `readinessError`, `deleteAllMedia`, `derivePostStatus`, `staleOutcome`, `shouldDeleteMedia`, `effectiveCaption`.
- Produces (`publish.ts`):
  - `publishPost(v: PostView, from: Status[]): Promise<boolean>`
    1. `readinessError` (dengan creator info TikTok bila ada target TikTok) → `PostError`.
    2. Klaim post: `status IN from → 'publishing'`. Tidak ada perubahan → `false`.
    3. Ubah semua target `pending`/`failed` ke `pending`, lalu proses target `pending` satu per satu dengan `processTarget`.
    4. `refreshPostStatus`, lalu kembalikan `true`.
  - `processTarget(v: PostView, platform: Platform): Promise<void>`
    1. Klaim: `pending → publishing`, set `started_at = now` dan `fail_reason = NULL`. Tidak ada perubahan → return.
    2. Panggil `adapter.publish`:
       - `published` → set `published`, `external_id`, `external_url`, `published_at`.
       - `processing` → simpan `external_id`, status tetap `publishing`.
       - `PlatformError` dengan `outcome 'failed'` → `failed` + pesan.
       - `PlatformError` dengan `outcome 'unknown'` → `unknown` + pesan.
       - Error lain → `unknown` dengan pesan `'We could not confirm whether this was posted. Check {Platform} before trying again.'`
  - `retryTargets(userId, postId, platforms?: Platform[]): Promise<PostView>`
    - Post harus `failed`. Target `failed` yang dipilih (default semua yang `failed`) → `pending`. Post `failed → publishing`, diklaim atomik.
    - Readiness dicek hanya untuk target yang di-retry. Proses seperti `publishPost`.
  - `resolveUnknown(userId, postId, platform, outcome: 'published' | 'retry', url?: string | null): Promise<PostView>`. Target harus `unknown`.
    - `published` → set `published` (`external_url` = `url` bila `https://`).
    - `retry` → set `failed` dengan `fail_reason` `'Marked as not posted. Ready to retry.'`
    - Lalu `refreshPostStatus`.
  - `syncPost(v: PostView): Promise<void>`: poll setiap target `publishing` yang punya `external_id` dan adapter-nya punya `poll`, lalu terapkan `staleOutcome`, lalu `refreshPostStatus`. Error transien saat poll hanya di-log. `PlatformError` dengan kode `not_connected` atau `reconnect` saat poll → target `unknown`, dengan pesan koneksi + "check {Platform}".
  - `refreshPostStatus(postId): Promise<void>`
    - Hitung `derivePostStatus` lalu simpan.
    - Bila hasilnya `published`, set `posts.published_at = max(target.published_at)`.
    - Bila `shouldDeleteMedia`, panggil `deleteAllMedia`.
  - `runCron(): Promise<{ due: number; claimed: number; polled: number; stale: number }>`
    1. Post `scheduled` yang jatuh tempo (`LIMIT 5`) → `publishPost(v, ['scheduled'])`.
    2. Post `publishing` (`LIMIT 20`): ambil target `pending` → `processTarget` (memulihkan Worker yang mati di tengah jalan), lalu `syncPost`.
- API:
  - `POST /publish` → `publishPost(v, ['idea','draft','scheduled','failed'])`. Hasil `false` → 409 `'Already publishing.'`. Bila post punya target `published` atau `unknown` → 409 `'Use retry for the failed platforms.'`
  - `POST /retry` dengan body `{ platforms?: Platform[] }`
  - `POST /targets/[platform]/resolve` dengan body `{ outcome: 'published' | 'retry', url?: string }`
  - `POST /sync`
  - `POST /api/cron` (secret tetap)

- [ ] **Step 1: Implementasikan** `publish.ts` dan rutenya.
- [ ] **Step 2: Jalankan** `npm run check`. Expected: error tersisa hanya di `.svelte`.
- [ ] **Step 3: Uji jalur TikTok** dengan akun TikTok uji yang terhubung (akun **Private**, karena aplikasi belum diaudit): buat post video + target TikTok (`privacy: 'SELF_ONLY'`), lalu `POST /publish`. Expected: post `publishing`, target `publishing` dengan `external_id`. Panggil `POST /sync` berulang sampai target `published` dan post `published`. `post_media` untuk post itu kosong, dan objek R2-nya hilang.
- [ ] **Step 4: Uji gagal sebagian.** Putuskan YouTube (atau biarkan adapter YouTube melempar "not ready") dan buat post dengan target TikTok + YouTube.
  - Setelah publish dan sync: TikTok `published`, YouTube `failed`, post `failed`, `postSummary` = `'1 of 2 published'`.
  - Media **masih ada** di R2 (Review Focus 2).
  - `PATCH caption` → 409.
  - `POST /retry` hanya mengirim YouTube; `external_id` TikTok tidak berubah.
- [ ] **Step 5: Uji "perlu dicek".** Set satu target secara manual ke `publishing` dengan `started_at = now - 16 menit` dan `external_id NULL` lewat `wrangler d1 execute`, lalu panggil `/sync`.
  - Expected: target `unknown`, post `failed`, dan `/retry` tidak menyentuhnya.
  - `POST /targets/youtube/resolve {"outcome":"retry"}` → target `failed`.
  - `resolve {"outcome":"published"}` pada target `unknown` lain → `published`.
- [ ] **Step 6: Uji cron.** `curl -X POST -H "x-cron-secret: $APP_SECRET" -H "origin: http://localhost:5173" -H "content-type: application/json" -d '{}' http://localhost:5173/api/cron` dengan satu post terjadwal yang sudah jatuh tempo → `claimed: 1`.
- [ ] **Step 7: Uji klik ganda** (Review Focus 1). Kirim dua `POST /publish` paralel (`curl … & curl … ; wait`) ke post draft yang sama. Expected: satu 200 dan satu 409, dan hanya satu `external_id` TikTok yang tercatat.
- [ ] **Step 8: Commit**

```bash
git add src/lib/server/publish.ts src/routes/api
git commit -m "feat: per-target publish engine with retry and needs-checking"
```

---

### Task 7: Adapter YouTube (upload video)

**Files:**
- Modify: `src/lib/server/youtube.ts`, `src/lib/server/adapters.ts`

**Interfaces:**
- Consumes: `accessToken(userId)` (sudah ada), `mediaObject`, `PublishInput`, `YouTubeSettings`.
- Produces: `youtubeAdapter: Adapter` dengan `publish` dan `poll`.
- Alurnya (verifikasi ke https://developers.google.com/youtube/v3/docs/videos/insert dan panduan resumable upload):
  1. `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`, dengan header `Authorization`, `Content-Type: application/json; charset=UTF-8`, `X-Upload-Content-Length`, `X-Upload-Content-Type`. Body:

     ```
     { snippet: { title, description: caption, categoryId: '22' },
       status: { privacyStatus: visibility, selfDeclaredMadeForKids: made_for_kids } }
     ```

     Respons non-2xx → `PlatformError` `failed`, dengan pesan dari `error.errors[0].reason`:
     - `quotaExceeded` → `'YouTube upload quota is used up for today. Try again tomorrow.'`
     - `uploadLimitExceeded` → `'This channel has reached its YouTube upload limit. Try again later.'`
     - `401` → kode `reconnect`
  2. Ambil URL upload dari header `Location`.
  3. `PUT` ke URL itu dengan body stream objek R2 (`Content-Length` dari `media.size`).
     - `fetch` melempar (timeout atau putus) → `PlatformError` `outcome 'unknown'`.
     - Respons 4xx → `failed`.
     - Respons 5xx → `unknown`, karena YouTube mungkin sudah menerima.
     - 200/201 → `{ state: 'processing', externalId: video.id }`.
  4. `poll`: `GET https://www.googleapis.com/youtube/v3/videos?part=status&id={id}`.
     - `uploadStatus === 'processed'` → `published` dengan url `https://www.youtube.com/watch?v={id}`.
     - `'rejected'`, `'failed'`, atau `'deleted'` → `failed`, dengan alasan `rejectionReason`/`failureReason`.
     - Item tidak ada → `failed` `'YouTube removed this video.'`
     - Lainnya → `processing`.

- [ ] **Step 1: Implementasikan** `youtubeAdapter` dan daftarkan di `adapters`.
- [ ] **Step 2: Jalankan** `npm run check` dan `npm test`.
- [ ] **Step 3: Uji nyata** dengan channel uji yang sudah terhubung (MengVideo): buat post video pendek, target YouTube `{title:'Mengepost test', visibility:'private', made_for_kids:false}`, lalu `POST /publish` dan `/sync` berulang. Expected:
  - target `published` dengan `external_url` `https://www.youtube.com/watch?v=…`
  - video muncul sebagai **private** di YouTube Studio
  - media dihapus dari R2

  Catat bahwa project yang belum diaudit memang memaksa video menjadi private.
- [ ] **Step 4: Uji TikTok + YouTube sekaligus** dalam satu post. Expected: keduanya `published`, dan media baru dihapus setelah keduanya selesai.
- [ ] **Step 5: Commit**

```bash
git add src/lib/server/youtube.ts src/lib/server/adapters.ts
git commit -m "feat: YouTube video publishing"
```

---

### Task 8: Editor post multi-platform

**Files:**
- Modify: `src/routes/app/posts/[id]/+page.server.ts`, `src/routes/app/posts/[id]/+page.svelte`
- Create: `src/routes/app/posts/[id]/MediaPicker.svelte`, `PlatformPicker.svelte`, `TikTokPanel.svelte`, `YouTubePanel.svelte`, `TargetStatus.svelte`

**Interfaces:**
- Consumes: `PostView`, `CAPS`, `PLATFORMS`, `platformLabel`, `platformIssue`, `settingsIssue`, `defaultSettings`, `editRules`, `effectiveCaption`, `contentKind`, `postSummary`, dan API dari Task 4 & 6.
- Produces (load):

  ```
  { post: PostView | null; from; date; initialStatus;
    connections: Partial<Record<Platform, { display_name: string; avatar_url: string }>>;
    creator: CreatorInfo | null; creatorError: string | null }
  ```

  `creatorInfo` hanya dipanggil bila TikTok terhubung. Bila tidak terhubung: `creator = null`, `creatorError = null`, dan tidak ada error halaman (Review Focus 3).
- Komponen (props, dengan `$bindable` di tempat yang diubah komponen):
  - `MediaPicker { media: Media[]; pending: File[] (bindable); locked: boolean; postId: string | null; onremove(id); onreorder(ids) }`: satu video atau sampai 35 gambar (`image/jpeg`, `image/png`, ≤ 8MB). Menampilkan pratinjau. Membaca durasi video dari elemen `<video>` lalu mengirimnya sebagai `x-duration-ms` saat upload.
  - `PlatformPicker { selected: Platform[] (bindable); connections; kind: ContentKind; imageCount: number; locked: boolean }`: chip untuk 5 platform. Chip nonaktif menampilkan alasan:
    - belum tersedia → `'Coming soon'`
    - belum terhubung → link `'Connect in Settings'` ke `/app/settings#connections`
    - tidak cocok dengan isi → pesan `platformIssue` (tanpa cek caption)
  - `TikTokPanel { settings: TikTokSettings (bindable); creator; creatorError; videoSeconds; disabled }`: **pindahkan markup dan logika** `+page.svelte:430-527` dan `559-573`, lalu sesuaikan binding ke `settings.*`. Teks, urutan, dan aturan nonaktif tidak berubah. `disclose` tetap state lokal UI.
  - `YouTubePanel { settings: YouTubeSettings (bindable); disabled }`:
    - judul (`maxlength=100`, penghitung karakter)
    - visibility berupa radio `Public / Unlisted / Private` tanpa pilihan awal
    - "Made for kids" berupa radio `Yes, it's made for kids` / `No, it's not made for kids` tanpa pilihan awal
  - Per panel platform: toggle `Use a different caption for {Platform}` + textarea, dengan penghitung `{effectiveCaption.length}/{CAPS[p].maxCaption}`.
  - `TargetStatus { post: PostView; onretry(platforms?: Platform[]); onresolve(platform, outcome, url?) }`: satu baris per target berisi badge status dan link `external_url` bila ada.
    - `failed`: alasan + tombol `Retry`.
    - `unknown`: teks `We couldn't confirm whether this was posted to {Platform}. Check {Platform} first.`, tombol `It's posted` (dengan input URL opsional), dan tombol `Not posted — try again`.
    - Bila ada lebih dari satu target `failed`: tombol `Retry all failed`.
- Perilaku halaman:
  - Subjudul `Your next TikTok, thoughtfully put together.` → `One post, every place it belongs.`
  - `Publishing to TikTok…` → `Publishing…` + daftar `TargetStatus`. Polling `/sync` tiap 4 detik selama post `publishing` (perilaku sekarang).
  - Kartu "Published" menampilkan link per platform, dan teks penghapusan media diganti menjadi `Media files were removed from {site.name} storage after publishing.`
  - Saat `contentLocked`: media, caption utama, pilihan platform, dan status/jadwal dinonaktifkan dengan catatan `Part of this post is already published. To post it somewhere else, create a new post and upload the media again.` Panel target `failed` tetap bisa diedit, dan tombol utama menjadi `Save changes` (PATCH targets).
  - Urutan simpan: PATCH/POST field + targets dengan status awal `draft` bila masih ada file yang menunggu dan status target `scheduled` → upload file berurutan (progress per file) → PATCH status final → opsional `/publish`. Pola ini sama dengan `save()` sekarang; pertahankan juga penanganan error yang menyimpan ID.
  - `readyToPost` = ada platform terpilih, dan setiap target lolos `platformIssue` + `settingsIssue`. Catatan di bawah tombol menampilkan masalah pertama, diawali nama platform.
  - Post baru tanpa pilihan platform: pilih otomatis platform yang terhubung **dan** tersedia. Bila tidak ada yang terhubung, tidak ada yang dipilih.

- [ ] **Step 1: Pindahkan UI TikTok** ke `TikTokPanel.svelte` tanpa mengubah teks. Jalankan `git diff -M` dan bandingkan bahwa teks-teks berikut tetap ada persis sama: `Who can view this video`, `Select privacy`, `(off in your TikTok settings)`, `Disclose video content`, `Your brand`, `Branded content`, `Paid partnership`, `Promotional content`, `Branded content visibility cannot be set to "Only me".`, `By posting, you agree to TikTok's`, `Music Usage Confirmation`, `Branded Content Policy`.
- [ ] **Step 2: Buat komponen lain** dan susun ulang `+page.svelte` sesuai perilaku di atas.
- [ ] **Step 3: Jalankan** `npm run check`. Expected: 0 errors di `src/routes/app/posts/**`.
- [ ] **Step 4: Uji manual di browser** (`http://localhost:5173`):
  1. Post baru: upload video, pilih TikTok + YouTube, isi pengaturan, lalu jadwalkan → status Scheduled, dan kedua panel tersimpan setelah reload.
  2. Hapus video → kedua chip menjadi `needs a video` dan tombol Schedule nonaktif.
  3. Upload 3 gambar → TikTok/YouTube nonaktif, Instagram/Threads/X tampil `Coming soon`.
  4. Caption utama 2500 karakter dengan TikTok aktif → muncul peringatan batas TikTok. Aktifkan caption TikTok sendiri yang pendek → peringatan hilang.
  5. Post gagal sebagian (dari Task 6): media dan caption terkunci, panel YouTube bisa diedit, `Retry` hanya mengirim YouTube.
  6. Putuskan TikTok di Settings → editor tetap terbuka, dan chip TikTok menampilkan `Connect in Settings` (Review Focus 3).
- [ ] **Step 5: Commit**

```bash
git add src/routes/app/posts
git commit -m "feat: multi-platform post editor"
```

---

### Task 9: Daftar post, kanban, kalender, dashboard, sidebar, Settings

**Files:**
- Create: `src/lib/ui/PlatformBadge.svelte`
- Modify: `src/routes/app/+layout.server.ts`, `src/routes/app/+layout.svelte:84-90`, `src/routes/app/+page.server.ts`, `src/routes/app/+page.svelte` (strip connect, attention), `src/routes/app/kanban/+page.svelte`, `src/routes/app/posts/+page.svelte`, `src/routes/app/calendar/+page.svelte`, `src/routes/app/settings/+page.svelte`

**Interfaces:**
- Consumes: `PostView`, `postSummary`, `readinessError`, `PLATFORMS`, `CAPS`, `platformLabel`, `listConnections`.
- Produces: `PlatformBadge { platform: Platform; status?: TargetStatus; size?: number }`. Tampilannya label/ikon platform + titik status (pending abu, publishing kuning, published hijau, failed merah, unknown oranye) dengan `title` yang berisi teks status. Bentuk visualnya diserahkan ke builder, tapi jangan pakai logo merek resmi.
- Perubahan:
  - **Layout:** `connections` (dari Task 3), lalu hapus `tiktok`.
    - Sidebar: `{n} of 5 connected` + nama platform yang terhubung, dengan link ke `/app/settings#connections`.
    - Bila belum ada yang terhubung: `Connect an account` / `Make your next post happen`.
  - **Dashboard:**
    - Strip connect muncul bila belum ada koneksi sama sekali, dengan teks `Your workspace is ready. Bring your accounts along.` dan tombol `Connect accounts`.
    - `attention`: post `failed`, atau `draft` tanpa media. Untuk post `failed`, alasan yang ditampilkan adalah `postSummary` + alasan target gagal pertama.
  - **Kanban:**
    - Cek saat drag ke Scheduled memakai `readinessError` dari `src/lib/targets.ts` (Task 2), menggantikan cek `video_key`/`privacy` yang ada sekarang.
    - Tag `privacyLabel` diganti deretan `PlatformBadge` per target.
    - `fail_reason` diganti `postSummary`.
  - **Daftar post:** ikon thumbnail berdasarkan `contentKind(media)`, nama media pertama, dan `PlatformBadge` per target.
  - **Kalender:** chip menambahkan `PlatformBadge` kecil per target.
  - **Settings:**
    - Hash `#connections`.
    - Kartu Instagram, Threads, dan X dengan pill `Coming soon`, deskripsi satu kalimat, dan tanpa tombol. Untuk Instagram: `Business and Creator accounts only.`

- [ ] **Step 1: Implementasikan** perubahan di atas.
- [ ] **Step 2: Jalankan** `npm run check`. Expected: `0 ERRORS 0 WARNINGS`. Jalankan juga `npm test` (PASS).
- [ ] **Step 3: Uji manual:** dashboard, kanban (drag post tanpa pengaturan YouTube ke Scheduled → ditolak dengan pesan YouTube), daftar post, kalender, sidebar (`2 of 5 connected`), dan Settings (5 kartu).
- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/PlatformBadge.svelte src/routes/app
git commit -m "feat: multi-platform lists, dashboard and connections"
```

---

### Task 10: Landing, Terms, Privacy

**Files:**
- Modify: `src/routes/(site)/+page.svelte`, `src/routes/(site)/terms/+page.svelte`, `src/routes/(site)/privacy/+page.svelte`

**Interfaces:** tidak ada. Isinya teks.

- Isi wajib:
  - **Landing/FAQ:** Mengepost menerbitkan ke TikTok dan YouTube sekarang; Instagram, Threads, dan X segera. FAQ "How do I connect…" menyebut Settings → Connections.
  - **Terms:** menyebut TikTok dan YouTube sebagai layanan yang dipakai; tautan ke Terms of Service YouTube `https://www.youtube.com/t/terms`; pernyataan tidak berafiliasi berlaku untuk semua platform.
  - **Privacy:**
    - Data per platform: TikTok (tetap seperti sekarang); YouTube (ID channel, nama, foto channel, token OAuth Google, video yang diunggah).
    - Retensi: media dihapus setelah semua platform tujuan terbit, atau saat post dihapus.
    - Cara mencabut akses Google: `https://myaccount.google.com/permissions`.
    - Tautan ke Google Privacy Policy `https://policies.google.com/privacy`.
    - Kalimat **persis** ini:
      > Mengepost's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

- [ ] **Step 1: Perbarui ketiga halaman** sesuai isi wajib.
- [ ] **Step 2: Jalankan** `npm run check` lalu `curl -s http://localhost:5173/privacy | grep -c "Limited Use"`. Expected: `1` atau lebih.
- [ ] **Step 3: Commit**

```bash
git add "src/routes/(site)"
git commit -m "docs: legal and landing copy for multi-platform posting"
```

---

### Task 11: Verifikasi akhir dan rilis production

**Files:** tidak ada perubahan kode, kecuali ada temuan.

- [ ] **Step 1:** `npm test` dan `npm run check` → PASS dan `0 ERRORS`. `npm run build` → selesai dengan `wrapped worker with cron handler`.
- [ ] **Step 2:** Ulangi skenario Review Focus 1–5 secara end-to-end di dev, lalu catat hasilnya.
- [ ] **Step 3: Minta izin pemilik** sebelum menyentuh production, lalu jalankan berurutan:
  1. `npx wrangler d1 migrations apply mengepost --remote` (0002 dan 0003)
  2. `npx wrangler secret put GOOGLE_CLIENT_ID`
  3. `npx wrangler secret put GOOGLE_CLIENT_SECRET`
  4. `npm run deploy`
- [ ] **Step 4:** Smoke test production: login, connect YouTube (akun test user), lalu buat post private ke YouTube dan pastikan terbit.
