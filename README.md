# X525V Share Hub — Full Stack

Versi full-stack dari X525V Share Hub.

## Stack

- Frontend: HTML + CSS + Vanilla JavaScript
- Backend: Node.js + Express
- Database/Auth: Supabase
- API: REST
- Security: secrets di `.env`, admin authorization di server
- UI: dark glassmorphism, particles, cursor, tilt cards, search, category filter

## Struktur

```text
x525v-fullstack/
├─ public/
│  ├─ index.html
│  ├─ style.css
│  └─ app.js
├─ sql/
│  └─ schema.sql
├─ .env.example
├─ .gitignore
├─ package.json
├─ server.js
└─ README.md
```

## 1. Buat database Supabase

Buka SQL Editor Supabase lalu jalankan isi `sql/schema.sql`.

## 2. Konfigurasi

Salin `.env.example` menjadi `.env` lalu isi:

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=...
PORT=3000
```

`SUPABASE_SERVICE_ROLE_KEY` adalah secret. Jangan upload ke GitHub dan jangan pernah memasukkannya ke `public/`.

## 3. Install

```bash
npm install
```

## 4. Jalankan

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Buka:

```text
http://localhost:3000
```

## Admin

Tekan `Ctrl + Shift + X` pada halaman utama untuk membuka Admin Access.

Login memakai akun Supabase Auth yang emailnya sama dengan `ADMIN_EMAIL`.

Backend akan memeriksa token Supabase dan email admin sebelum mengizinkan:

- melihat semua konten
- tambah konten
- edit konten
- hapus konten
- publish/unpublish

## API

Public:

- `GET /api/contents`
- `GET /api/categories`

Admin:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/admin/me`
- `GET /api/admin/contents`
- `POST /api/admin/contents`
- `PUT /api/admin/contents/:id`
- `DELETE /api/admin/contents/:id`

## Catatan keamanan

Jangan mengandalkan hidden URL/query parameter untuk keamanan. Versi ini memindahkan pemeriksaan admin ke backend.

Jangan gunakan service-role key di browser.

Untuk production, tambahkan HTTPS dan batasi CORS bila frontend/backend dipisahkan domain.
