const state = {
  contents: [],
  activeCategory: "Semua",
  token: localStorage.getItem("x525v_admin_token") || null,
  user: null
};

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const e = $("toast");
  e.textContent = msg;
  e.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => e.classList.remove("show"), 2400);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function escAttr(s) { return esc(s); }

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  let body = {};
  try { body = await response.json(); } catch {}

  if (!response.ok) {
    const error = new Error(body.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return body;
}

/* Background particles */
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
let particles = [];
const mouse = { x: -1000, y: -1000 };

function resizeCanvas() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function makeParticles() {
  particles = Array.from({
    length: Math.min(90, Math.floor(innerWidth / 15))
  }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - .5) * .25,
    vy: (Math.random() - .5) * .25,
    r: Math.random() * 1.5 + .3,
    a: Math.random() * .55 + .12
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = innerWidth;
    if (p.x > innerWidth) p.x = 0;
    if (p.y < 0) p.y = innerHeight;
    if (p.y > innerHeight) p.y = 0;

    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const d = Math.hypot(dx, dy);

    if (d < 130 && d > 0) {
      p.x += dx / d * .18;
      p.y += dy / d * .18;
    }

    ctx.globalAlpha = p.a;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  ctx.globalAlpha = .09;

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);

      if (d < 100) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawParticles);
}

resizeCanvas();
makeParticles();
drawParticles();

addEventListener("resize", () => {
  resizeCanvas();
  makeParticles();
});

addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  $("cursor").style.left = e.clientX + "px";
  $("cursor").style.top = e.clientY + "px";
  $("cursor2").style.left = e.clientX + "px";
  $("cursor2").style.top = e.clientY + "px";
});

document.addEventListener("mouseover", e => {
  if (e.target.closest("a,button,input,textarea")) {
    document.body.classList.add("hovering");
  }
});

document.addEventListener("mouseout", e => {
  if (e.target.closest("a,button,input,textarea")) {
    document.body.classList.remove("hovering");
  }
});

addEventListener("scroll", () => {
  $("header").classList.toggle("scrolled", scrollY > 20);
});

/* Public content */
async function loadContents() {
  const grid = $("contentGrid");
  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const result = await api("/api/contents");
    state.contents = result.data || [];
    renderFilters();
    renderContents();
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty">Gagal memuat konten.<br>${esc(error.message)}</div>`;
  }
}

function renderFilters() {
  const categories = [
    "Semua",
    ...new Set(state.contents.map(x => x.category).filter(Boolean))
  ];

  $("filters").innerHTML = categories.map(c => `
    <button class="filter ${c === state.activeCategory ? "active" : ""}"
      data-category="${escAttr(c)}">${esc(c)}</button>
  `).join("");

  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeCategory = btn.dataset.category;
      renderFilters();
      renderContents();
    });
  });
}

function renderContents() {
  const q = $("search").value.trim().toLowerCase();

  const list = state.contents.filter(x => {
    const categoryMatch =
      state.activeCategory === "Semua" || x.category === state.activeCategory;

    const textMatch =
      String(x.title || "").toLowerCase().includes(q) ||
      String(x.description || "").toLowerCase().includes(q) ||
      String(x.category || "").toLowerCase().includes(q);

    return categoryMatch && textMatch;
  });

  const grid = $("contentGrid");

  if (!list.length) {
    grid.innerHTML = '<div class="empty">Belum ada konten yang cocok.</div>';
    return;
  }

  grid.innerHTML = list.map((x, i) => `
    <article class="card" style="animation-delay:${i * 65}ms">
      <div class="thumbwrap">
        ${x.thumbnail_url
          ? `<img class="thumb" src="${escAttr(x.thumbnail_url)}" alt="" loading="lazy">`
          : ""}
        <div class="thumbshade"></div>
        <div class="scan"></div>
      </div>
      <div class="cardbody">
        <span class="badge">${esc(x.category || "Umum")}</span>
        <h3>${esc(x.title)}</h3>
        <p class="desc">${esc(x.description || "")}</p>
        <div class="actions">
          <a class="btn primary" href="${escAttr(x.url)}" target="_blank" rel="noopener noreferrer">Buka</a>
          <button class="btn copy-btn" data-url="${escAttr(x.url)}">Salin</button>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => copyLink(btn.dataset.url));
  });

  enableTilt();
}

function enableTilt() {
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const rx = ((y / r.height) - .5) * -5;
      const ry = ((x / r.width) - .5) * 5;

      card.style.transform =
        `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;

      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast("Link disalin");
  } catch {
    toast("Tidak bisa menyalin link");
  }
}

$("search").addEventListener("input", renderContents);

/* Admin */
function openAdmin() {
  $("adminPanel").style.display = "block";
  if (state.token) {
    checkAdminSession();
  } else {
    showLogin();
  }
}

function closeAdmin() {
  $("adminPanel").style.display = "none";
}

function showLogin() {
  $("loginView").style.display = "block";
  $("dashboard").style.display = "none";
}

async function checkAdminSession() {
  try {
    const result = await api("/api/admin/me");
    state.user = result.user;
    showDashboard();
  } catch {
    state.token = null;
    localStorage.removeItem("x525v_admin_token");
    showLogin();
  }
}

function showDashboard() {
  $("loginView").style.display = "none";
  $("dashboard").style.display = "block";
  loadAdmin();
}

async function login() {
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    toast("Email dan password wajib diisi.");
    return;
  }

  const btn = $("loginBtn");
  btn.disabled = true;
  btn.textContent = "Memverifikasi...";

  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    state.token = result.session.access_token;
    state.user = result.user;
    localStorage.setItem("x525v_admin_token", state.token);

    toast("Login berhasil");
    showDashboard();
  } catch (error) {
    toast(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Masuk";
  }
}

async function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("x525v_admin_token");
  showLogin();
  toast("Logout berhasil");
}

async function loadAdmin() {
  try {
    const result = await api("/api/admin/contents");
    const data = result.data || [];

    $("statTotal").textContent = data.length;
    $("statPublished").textContent = data.filter(x => x.published).length;
    $("statCategories").textContent =
      new Set(data.map(x => x.category).filter(Boolean)).size;

    $("adminList").innerHTML = data.map(x => `
      <div class="adminItem">
        <div>
          <b>${esc(x.title)}</b>
          <div class="adminMeta">
            ${esc(x.category || "Umum")} ·
            ${x.published ? "Published" : "Draft"}
          </div>
        </div>
        <div class="adminActions">
          <button class="btn edit-btn" data-id="${escAttr(x.id)}">Edit</button>
          <button class="btn danger delete-btn" data-id="${escAttr(x.id)}">Hapus</button>
        </div>
      </div>
    `).join("") || '<div class="empty">Belum ada data.</div>';

    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = data.find(x => x.id === btn.dataset.id);
        if (item) editContent(item);
      });
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteContent(btn.dataset.id));
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      await logout();
      return;
    }
    toast(error.message);
  }
}

function editContent(x) {
  $("formTitle").textContent = "Edit Konten";
  $("editId").value = x.id;
  $("title").value = x.title || "";
  $("description").value = x.description || "";
  $("category").value = x.category || "";
  $("thumbnail").value = x.thumbnail_url || "";
  $("url").value = x.url || "";
  $("published").checked = !!x.published;

  $("adminPanel").scrollTo({ top: 0, behavior: "smooth" });
}

async function saveContent() {
  const id = $("editId").value;

  const payload = {
    title: $("title").value.trim(),
    description: $("description").value.trim(),
    category: $("category").value.trim() || "Umum",
    thumbnail_url: $("thumbnail").value.trim(),
    url: $("url").value.trim(),
    published: $("published").checked
  };

  if (!payload.title || !payload.url) {
    toast("Judul dan link wajib diisi.");
    return;
  }

  const btn = $("saveBtn");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    await api(id ? `/api/admin/contents/${encodeURIComponent(id)}` : "/api/admin/contents", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });

    toast("Konten berhasil disimpan.");
    resetForm();
    await Promise.all([loadContents(), loadAdmin()]);
  } catch (error) {
    toast(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
}

async function deleteContent(id) {
  if (!confirm("Hapus konten ini?")) return;

  try {
    await api(`/api/admin/contents/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    toast("Konten dihapus.");
    await Promise.all([loadContents(), loadAdmin()]);
  } catch (error) {
    toast(error.message);
  }
}

function resetForm() {
  ["editId","title","description","category","thumbnail","url"]
    .forEach(id => $(id).value = "");

  $("published").checked = true;
  $("formTitle").textContent = "Tambah Konten";
}

$("loginBtn").addEventListener("click", login);
$("logoutBtn").addEventListener("click", logout);
$("closeAdminBtn").addEventListener("click", closeAdmin);
$("closeLoginBtn").addEventListener("click", closeAdmin);
$("saveBtn").addEventListener("click", saveContent);
$("resetBtn").addEventListener("click", resetForm);
$("refreshAdminBtn").addEventListener("click", loadAdmin);

$("password").addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
    e.preventDefault();
    openAdmin();
  }

  if (e.key === "Escape" && $("adminPanel").style.display === "block") {
    closeAdmin();
  }
});

addEventListener("load", () => {
  setTimeout(() => $("loader").classList.add("hide"), 950);
  loadContents();
});
