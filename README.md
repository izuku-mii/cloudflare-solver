# 🔓 Cloudflare Solver

Dua solver otomatis untuk proteksi Cloudflare menggunakan `puppeteer-real-browser`:

- **`cloudflare-solver.js`** — Bypass Cloudflare challenge page dan ekstrak cookie `cf_clearance`
- **`turnstile-solver.js`** — Solve Cloudflare Turnstile widget dan dapatkan token

---

## ✨ Fitur

### Cloudflare Solver
- Bypass halaman challenge Cloudflare secara otomatis
- Deteksi tipe challenge: `non-interactive`, `managed`, `interactive`
- Klik iframe Cloudflare (checkbox → label → widget → body fallback)
- Ekstrak cookie `cf_clearance` + semua cookies + cookie string siap pakai
- Support proxy URL (`http://user:pass@ip:port`) dan proxy file
- Random User-Agent dari `data/useragents.txt`

### Turnstile Solver
- **Mode Sitekey** — inject fake page dengan sitekey eksplisit
- **Mode Page** — solve langsung dari halaman target (auto-detect turnstile)
- Screen recording tiap sesi (`.mp4`) via `puppeteer-screen-recorder`
- Support proxy dengan autentikasi
- Output token dalam format JSON

---

## 📦 Instalasi

```bash
npm install puppeteer-real-browser puppeteer-screen-recorder
```

> **Requirements tambahan:**
> - Node.js >= 18
> - `ffmpeg` — dibutuhkan `puppeteer-screen-recorder` untuk encode MP4
> - `Xvfb` — untuk headless di Linux (dihandle otomatis oleh `puppeteer-real-browser`)

---

## 🔧 Penggunaan

### Cloudflare Solver

```js
const { solveCloudflare } = require('./cloudflare-solver');

const result = await solveCloudflare({
  url: 'https://example.com',
  headless: false,         // tampilkan browser
  timeout: 30,             // timeout dalam detik
  // proxy: 'http://user:pass@ip:port',
  // proxyFile: 'data/proxies.txt',
});

console.log(result);
```

#### Options

| Option | Tipe | Default | Deskripsi |
|--------|------|---------|-----------|
| `url` | `string` | — | **Wajib.** URL target |
| `headless` | `boolean` | `true` | Tampilkan browser atau tidak |
| `proxy` | `string` | `null` | Proxy URL: `http://user:pass@ip:port` |
| `proxyFile` | `string` | `null` | Path ke file daftar proxy (satu per baris) |
| `timeout` | `number` | `30` | Batas waktu solve challenge (detik) |

#### Output

Berhasil:

```json
{
  "success": true,
  "url": "https://example.com",
  "proxy": null,
  "user_agent": "Mozilla/5.0 ...",
  "cf_clearance": "abc123...",
  "all_cookies": [...],
  "cookie_string": "cf_clearance=abc123; ...",
  "unix_timestamp": 1747000000,
  "timestamp": "2025-05-12T00:00:00.000Z",
  "domain": ".example.com"
}
```

Gagal:

```json
{
  "success": false,
  "url": "https://example.com",
  "error": "Failed to obtain cf_clearance cookie"
}
```

---

### Turnstile Solver

```js
const TurnstileSolver = require('./turnstile-solver');

const solver = new TurnstileSolver({
  timeout: 60000,
  record: true,
  recordDir: './recordings',
  // proxy: { host: '...', port: 8080, username: 'user', password: 'pass' },
  width: 1280,
  height: 720,
});

await solver.initialize();

// Mode 1: pakai sitekey eksplisit
const result = await solver.solve('https://example.com', '0x4AAAAAAA...');

// Mode 2: auto-detect dari halaman target
const result = await solver.solve('https://example.com');

console.log(result);
await solver.cleanup();
```

#### Options Konstruktor

| Option | Tipe | Default | Deskripsi |
|--------|------|---------|-----------|
| `timeout` | `number` | `60000` | Batas waktu tunggu token (ms) |
| `record` | `boolean` | `false` | Aktifkan screen recording |
| `recordDir` | `string` | `./recordings` | Folder output recording |
| `proxy` | `object` | `null` | `{ host, port, username, password }` |
| `width` | `number` | `1280` | Viewport & recording width |
| `height` | `number` | `720` | Viewport & recording height |

#### Methods

| Method | Deskripsi |
|--------|-----------|
| `initialize()` | Launch browser (opsional, auto-called saat `solve`) |
| `solve(url, siteKey?)` | Solve turnstile — sitekey mode kalau diisi, page mode kalau tidak |
| `solveWithSitekey(url, siteKey)` | Inject fake page dengan sitekey eksplisit |
| `solveFromPage(url)` | Solve langsung dari halaman target |
| `cleanup()` | Tutup browser dan reset state |

#### Output

Berhasil:

```json
{
  "success": true,
  "creator": "XAi Community",
  "token": "0.eyJhbGci...",
  "time": 4.231
}
```

Gagal:

```json
{
  "success": false,
  "error": "Token invalid or empty",
  "time": 60.012
}
```

---

## 📁 Screen Recording

Kalau `record: true`, setiap sesi disimpan ke `recordDir` dengan format:

```
recordings/
├── sitekey_0x4AAAAAAA__1747123456789.mp4   ← mode sitekey
└── page_solve_1747123456789.mp4             ← mode page
```

---

## ⚙️ Cara Kerja

### Cloudflare Solver

1. Launch browser via `puppeteer-real-browser` dengan `turnstile: false`
2. Navigate ke URL target
3. Cek apakah `cf_clearance` sudah ada di cookies
4. Kalau belum, deteksi tipe challenge dari HTML (`cType: '...'`)
5. Cari iframe `challenges.cloudflare.com` lalu klik: checkbox → label → widget → body (fallback)
6. Poll cookies sampai `cf_clearance` muncul atau timeout
7. Return `cf_clearance`, semua cookies, dan `cookie_string` siap pakai

### Turnstile Solver — Mode Sitekey (`solveWithSitekey`)

1. Aktifkan request interception
2. Intercept request ke URL target, balas dengan fake HTML yang berisi widget Turnstile
3. `puppeteer-real-browser` dengan `turnstile: true` handle solve otomatis
4. Token diambil dari input hidden `[name="cf-response"]`

### Turnstile Solver — Mode Page (`solveFromPage`)

1. Inject polling script via `evaluateOnNewDocument` yang cek `window.turnstile.getResponse()`
2. Saat token tersedia, tulis ke input hidden `[name="cf-response"]`
3. `waitForSelector` menunggu sampai token siap

---

## 🚀 Contoh Lengkap (`run.js`)

```js
const { solveCloudflare } = require('./cloudflare-solver');
const TurnstileSolver      = require('./turnstile-solver');

// Cloudflare challenge
async function runCloudflare() {
  const result = await solveCloudflare({
    url: 'https://example.com',
    headless: false,
    timeout: 60,
  });
  console.log(result);
}

// Turnstile
async function runTurnstile() {
  const solver = new TurnstileSolver({ record: true });
  try {
    const res = await solver.solve('https://www.waifu2x.net', '0x4AAAAAABqlY7DKXMzoS81U');
    console.log(res);
  } finally {
    await solver.cleanup();
  }
}

(async () => {
  // await runCloudflare();
  await runTurnstile();
})();
```

---

## ⚠️ Disclaimer

Tool ini dibuat untuk keperluan edukasi dan testing. Penggunaan untuk bypass proteksi tanpa izin pemilik situs adalah tanggung jawab pengguna sepenuhnya.

---

## 📜 License

MIT License — Copyright (c) 2025 XAi Community
