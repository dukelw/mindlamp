(function () {
  const DATA = window.KINH_PHAP_CU;
  const app = document.getElementById("app");
  const root = document.documentElement;

  const ALL = [];
  DATA.forEach((p) => p.verses.forEach((v) => { v.pham = p; ALL.push(v); }));
  const BY_NUM = new Map(ALL.map((v) => [v.n, v]));

  // ---- storage (tolerates blocked storage) ----
  const store = {
    get(k, d) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const legacy = (k, d) => store.get("tamdang." + k, store.get("phapcu." + k, d));
  const learned = new Set(store.get("mindlamp.learned", legacy("learned", [])));
  const saveLearned = () => store.set("mindlamp.learned", [...learned]);
  const prefs = Object.assign({ font: 1, theme: "", mode: "read" }, store.get("mindlamp.prefs", legacy("prefs", {})));
  const savePrefs = () => store.set("mindlamp.prefs", prefs);

  const FONTS = [1, 1.15, 1.35];
  function applyPrefs() {
    root.style.setProperty("--fs", FONTS[prefs.font] + "rem");
    const dark = prefs.theme ? prefs.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "dark" : "light";
  }
  prefs.font = Math.min(prefs.font, FONTS.length - 1);
  applyPrefs();

  // ---- helpers ----
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const text = (v) => v.l.join(" ");
  const range = (p) => `${p.verses[0].n}–${p.verses[p.verses.length - 1].n}`;
  const progress = (p) => p.verses.filter((v) => learned.has(v.n)).length;
  const hint = (line) => line.split(/\s+/).map((w) => (w ? [...w][0] + "…" : w)).join(" ");

  function highlight(line, q) {
    if (!q) return esc(line);
    const nl = norm(line), nq = norm(q);
    // norm() keeps length for precomposed Vietnamese; fall back to plain text otherwise
    if (nl.length !== line.length) return esc(line);
    const i = nl.indexOf(nq);
    if (i < 0) return esc(line);
    return esc(line.slice(0, i)) + "<mark>" + esc(line.slice(i, i + q.length)) + "</mark>" + esc(line.slice(i + q.length));
  }

  // ---- views ----
  function home(query = "") {
    const total = learned.size;
    const pct = Math.round((total / ALL.length) * 100);
    app.innerHTML = `
      <h1>Kinh Pháp Cú</h1>
      <p class="sub">${DATA.length} phẩm · ${ALL.length} câu kệ</p>
      <form class="search" role="search" id="search-form">
        <input id="q" type="search" placeholder="Gõ số câu (vd: 183) hoặc từ khóa (vd: phong dat)…" value="${esc(query)}" autocomplete="off" aria-label="Tìm kiếm">
      </form>
      <div class="overall"><span>Đã thuộc ${total}/${ALL.length}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>
      <div id="out"></div>`;
    const q = document.getElementById("q");
    const out = document.getElementById("out");
    const render = () => {
      const val = q.value.trim();
      if (!val) return (out.innerHTML = phamGrid());
      out.innerHTML = searchResults(val);
    };
    q.addEventListener("input", render);
    document.getElementById("search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const val = q.value.trim();
      if (/^\d+$/.test(val) && BY_NUM.has(+val)) location.hash = `#/cau/${val}`;
    });
    render();
    if (query) q.focus();
  }

  function phamGrid() {
    return `<div class="pham-grid">${DATA.map((p, i) => {
      const done = progress(p), pct = Math.round((done / p.verses.length) * 100);
      return `<a class="pham" href="#/pham/${i + 1}">
        <div class="roman">${p.id}.</div>
        <div class="name">${esc(p.name)}</div>
        <div class="meta"><span>Câu ${range(p)}</span><span>${done}/${p.verses.length}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      </a>`;
    }).join("")}</div>`;
  }

  function searchResults(val) {
    let hits;
    if (/^\d+$/.test(val)) {
      const exact = BY_NUM.get(+val);
      hits = exact ? [exact] : [];
      if (!hits.length) return `<p class="empty">Không có câu số ${esc(val)} (1–${ALL.length}).</p>`;
    } else {
      const nq = norm(val);
      hits = ALL.filter((v) => norm(text(v)).includes(nq));
      if (!hits.length) return `<p class="empty">Không tìm thấy “${esc(val)}”.</p>`;
    }
    const shown = hits.slice(0, 60);
    return `<p class="sub">${hits.length} kết quả${hits.length > shown.length ? " (hiện 60 đầu)" : ""}</p>
      <div class="results">${shown.map((v) => `
        <a class="verse ${learned.has(v.n) ? "done" : ""}" href="#/cau/${v.n}" style="display:grid">
          <div class="vnum">${v.n}</div>
          <div class="lines">${v.l.map((l) => `<div>${highlight(l, /^\d+$/.test(val) ? "" : val)}</div>`).join("")}
            <div class="pham-tag">${v.pham.id}. ${esc(v.pham.name)}</div></div>
        </a>`).join("")}</div>`;
  }

  function phamView(idx) {
    const p = DATA[idx - 1];
    if (!p) return notFound();
    const prev = DATA[idx - 2], next = DATA[idx];
    app.innerHTML = `
      <div class="crumbs"><a href="#/">Tất cả phẩm</a> › <span>${p.id}. ${esc(p.name)}</span></div>
      <h1>${p.id}. ${esc(p.name)}</h1>
      <p class="sub">Câu ${range(p)} · đã thuộc ${progress(p)}/${p.verses.length}</p>
      <div class="nav">
        ${prev ? `<a href="#/pham/${idx - 1}"><button>← ${prev.id}. ${esc(prev.name)}</button></a>` : "<span></span>"}
        ${next ? `<a href="#/pham/${idx + 1}"><button>${next.id}. ${esc(next.name)} →</button></a>` : "<span></span>"}
      </div>
      ${p.verses.map((v) => `
        <article class="verse ${learned.has(v.n) ? "done" : ""}" id="v${v.n}">
          <div class="vnum">${v.n}.</div>
          <div class="lines">${v.l.map((l) => `<div>${esc(l)}</div>`).join("")}</div>
          <div class="acts">
            <a class="icon-btn" href="#/cau/${v.n}">Học thuộc</a>
            <button class="icon-btn" data-toggle="${v.n}">${learned.has(v.n) ? "✓ Đã thuộc" : "Đánh dấu"}</button>
          </div>
        </article>`).join("")}`;
    app.querySelectorAll("[data-toggle]").forEach((b) =>
      b.addEventListener("click", () => {
        const n = +b.dataset.toggle;
        learned.has(n) ? learned.delete(n) : learned.add(n);
        saveLearned();
        const y = scrollY;
        phamView(idx);
        scrollTo(0, y);
      })
    );
    scrollTo(0, 0);
  }

  function learnView(n) {
    const v = BY_NUM.get(n);
    if (!v) return notFound();
    const p = v.pham, pi = DATA.indexOf(p) + 1;
    const revealed = new Set();
    const modes = [["read", "Đọc"], ["hint", "Chữ đầu"], ["hide", "Ẩn hết"]];

    function render() {
      const hiding = prefs.mode !== "read";
      app.innerHTML = `
        <div class="crumbs"><a href="#/">Tất cả phẩm</a> › <a href="#/pham/${pi}">${p.id}. ${esc(p.name)}</a> › <span>Câu ${v.n}</span></div>
        <article class="verse learn-card ${learned.has(v.n) ? "done" : ""}">
          <div class="vnum">Câu ${v.n}</div>
          <div class="lines">${v.l.map((l, i) => {
            const show = !hiding || revealed.has(i);
            const cls = show ? "line" : prefs.mode === "hint" ? "line hint-line" : "line hidden-line";
            return `<div class="${cls}" data-i="${i}" role="button" tabindex="0">${esc(show ? l : prefs.mode === "hint" ? hint(l) : l)}</div>`;
          }).join("")}</div>
          <div class="modes">
            ${modes.map(([m, label]) => `<button data-mode="${m}" class="${prefs.mode === m ? "on" : ""}">${label}</button>`).join("")}
            <span class="spacer"></span>
            ${hiding ? `<button id="reveal-all">${revealed.size === v.l.length ? "Ẩn lại" : "Hiện hết"}</button>` : ""}
          </div>
          <p class="hint-text">${hiding ? "Chạm vào từng dòng (hoặc phím Space) để hiện dòng tiếp theo." : "Đọc to vài lần rồi chuyển sang “Chữ đầu” hoặc “Ẩn hết” để thử đọc thuộc."} Phím ← → để chuyển câu.</p>
        </article>
        <div class="nav">
          ${BY_NUM.has(n - 1) ? `<a href="#/cau/${n - 1}"><button>← Câu ${n - 1}</button></a>` : "<span></span>"}
          <button id="toggle-done" class="btn-done ${learned.has(v.n) ? "on" : ""}">${learned.has(v.n) ? "✓ Đã thuộc" : "Đánh dấu đã thuộc"}</button>
          ${BY_NUM.has(n + 1) ? `<a href="#/cau/${n + 1}"><button>Câu ${n + 1} →</button></a>` : "<span></span>"}
        </div>`;
      app.querySelectorAll("[data-mode]").forEach((b) =>
        b.addEventListener("click", () => { prefs.mode = b.dataset.mode; savePrefs(); revealed.clear(); render(); })
      );
      app.querySelectorAll(".line").forEach((el) => {
        const toggle = () => { const i = +el.dataset.i; revealed.has(i) ? revealed.delete(i) : revealed.add(i); render(); };
        el.addEventListener("click", toggle);
        el.addEventListener("keydown", (e) => { if (e.key === "Enter") toggle(); });
      });
      const ra = document.getElementById("reveal-all");
      if (ra) ra.addEventListener("click", () => {
        if (revealed.size === v.l.length) revealed.clear(); else v.l.forEach((_, i) => revealed.add(i));
        render();
      });
      document.getElementById("toggle-done").addEventListener("click", () => {
        learned.has(v.n) ? learned.delete(v.n) : learned.add(v.n);
        saveLearned();
        render();
      });
    }

    currentKeys = (e) => {
      if (e.key === "ArrowLeft" && BY_NUM.has(n - 1)) location.hash = `#/cau/${n - 1}`;
      else if (e.key === "ArrowRight" && BY_NUM.has(n + 1)) location.hash = `#/cau/${n + 1}`;
      else if (e.key === " " && prefs.mode !== "read") {
        e.preventDefault();
        const next = v.l.findIndex((_, i) => !revealed.has(i));
        if (next >= 0) { revealed.add(next); render(); }
      }
    };
    render();
    scrollTo(0, 0);
  }

  function notFound() {
    app.innerHTML = `<p class="empty">Không tìm thấy nội dung. <a href="#/" style="color:var(--accent)">Về trang chủ</a></p>`;
  }

  // ---- router ----
  let currentKeys = null;
  addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (currentKeys) currentKeys(e);
  });

  function route() {
    currentKeys = null;
    const [, kind, arg] = location.hash.split("/");
    if (kind === "pham") phamView(+arg);
    else if (kind === "cau") learnView(+arg);
    else home();
  }
  addEventListener("hashchange", route);

  // ---- toolbar ----
  document.getElementById("btn-font").addEventListener("click", () => {
    prefs.font = (prefs.font + 1) % FONTS.length; savePrefs(); applyPrefs();
  });
  document.getElementById("btn-theme").addEventListener("click", () => {
    prefs.theme = root.dataset.theme === "dark" ? "light" : "dark"; savePrefs(); applyPrefs();
  });
  document.getElementById("btn-random").addEventListener("click", () => {
    const pool = ALL.filter((v) => !learned.has(v.n));
    const list = pool.length ? pool : ALL;
    location.hash = `#/cau/${list[Math.floor(Math.random() * list.length)].n}`;
  });

  route();
})();
