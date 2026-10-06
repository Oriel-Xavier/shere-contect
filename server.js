require("dotenv").config();

const path = require("path");
const express = require("express");
const {
  createClient
} = require("@supabase/supabase-js");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL"
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[CONFIG] Missing ${key} in .env`);
    process.exit(1);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();

const authClient = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const db = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

function cleanContent(input = {}) {
  return {
    title: String(input.title || "").trim(),
    description: String(input.description || "").trim(),
    category: String(input.category || "Umum").trim() || "Umum",
    thumbnail_url: String(input.thumbnail_url || "").trim(),
    url: String(input.url || "").trim(),
    published: input.published !== false
  };
}

function validHttpUrl(value) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function bearer(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

async function requireAdmin(req, res, next) {
  try {
    const token = bearer(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await authClient.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Session tidak valid" });
    }

    const email = String(data.user.email || "").toLowerCase();

    if (email !== adminEmail) {
      return res.status(403).json({ error: "Akun bukan admin" });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("[AUTH]", error);
    res.status(500).json({ error: "Auth verification failed" });
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: "X525V Share Hub API",
    time: new Date().toISOString()
  });
});

app.get("/api/contents", async (req, res) => {
  const { data, error } = await db
    .from("contents")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[PUBLIC CONTENTS]", error);
    return res.status(500).json({ error: "Gagal mengambil konten" });
  }

  res.json({ data: data || [] });
});

app.get("/api/categories", async (req, res) => {
  const { data, error } = await db
    .from("contents")
    .select("category")
    .eq("published", true);

  if (error) {
    return res.status(500).json({ error: "Gagal mengambil kategori" });
  }

  const categories = [
    ...new Set((data || []).map(x => x.category).filter(Boolean))
  ];

  res.json({ data: categories });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi" });
  }

  if (email !== adminEmail) {
    return res.status(403).json({ error: "Akun ini bukan akun admin" });
  }

  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data?.session) {
    return res.status(401).json({ error: "Email atau password salah" });
  }

  res.json({
    session: data.session,
    user: data.user
  });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

app.get("/api/admin/contents", requireAdmin, async (req, res) => {
  const { data, error } = await db
    .from("contents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ADMIN LIST]", error);
    return res.status(500).json({ error: "Gagal mengambil data admin" });
  }

  res.json({ data: data || [] });
});

app.post("/api/admin/contents", requireAdmin, async (req, res) => {
  const content = cleanContent(req.body);

  if (!content.title || !content.url) {
    return res.status(400).json({ error: "Judul dan link wajib diisi" });
  }

  if (!validHttpUrl(content.url)) {
    return res.status(400).json({ error: "Link tujuan harus berupa URL HTTP/HTTPS" });
  }

  if (content.thumbnail_url && !validHttpUrl(content.thumbnail_url)) {
    return res.status(400).json({ error: "Thumbnail URL tidak valid" });
  }

  const { data, error } = await db
    .from("contents")
    .insert(content)
    .select("*")
    .single();

  if (error) {
    console.error("[ADMIN CREATE]", error);
    return res.status(500).json({ error: "Gagal membuat konten" });
  }

  res.status(201).json({ data });
});

app.put("/api/admin/contents/:id", requireAdmin, async (req, res) => {
  const content = cleanContent(req.body);

  if (!content.title || !content.url) {
    return res.status(400).json({ error: "Judul dan link wajib diisi" });
  }

  if (!validHttpUrl(content.url)) {
    return res.status(400).json({ error: "Link tujuan harus berupa URL HTTP/HTTPS" });
  }

  if (content.thumbnail_url && !validHttpUrl(content.thumbnail_url)) {
    return res.status(400).json({ error: "Thumbnail URL tidak valid" });
  }

  const { data, error } = await db
    .from("contents")
    .update(content)
    .eq("id", req.params.id)
    .select("*")
    .single();

  if (error) {
    console.error("[ADMIN UPDATE]", error);
    return res.status(500).json({ error: "Gagal memperbarui konten" });
  }

  res.json({ data });
});

app.delete("/api/admin/contents/:id", requireAdmin, async (req, res) => {
  const { error } = await db
    .from("contents")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("[ADMIN DELETE]", error);
    return res.status(500).json({ error: "Gagal menghapus konten" });
  }

  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route tidak ditemukan" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║              X525V SHARE HUB                 ║
║              FULL-STACK SERVER               ║
╠══════════════════════════════════════════════╣
║ API      : ONLINE                            ║
║ DATABASE : SUPABASE                          ║
║ PORT     : ${String(PORT).padEnd(32)}║
╚══════════════════════════════════════════════╝
`);
});
