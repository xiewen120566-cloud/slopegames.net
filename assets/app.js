const DEFAULT_LANG = "en-US";
const SUPPORTED_LANGS = new Set(["en-US", "ja-JP"]);

const pickLang = () => {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") || DEFAULT_LANG;
  return SUPPORTED_LANGS.has(lang) ? lang : DEFAULT_LANG;
};

const setLang = (lang) => {
  const params = new URLSearchParams(location.search);
  params.set("lang", lang);
  location.search = params.toString();
};

const fetchJson = async (url) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return await res.json();
};

const fetchText = async (url) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return await res.text();
};

const getEmbedded = (lang) => {
  const store = window.__GWAWOG_DATA__;
  if (store && store[lang]) return store[lang];
  if (store && store[DEFAULT_LANG]) return store[DEFAULT_LANG];
  return null;
};

const template = (text, vars) => {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
};

const normalizeHost = (hostname) => {
  const h = String(hostname || "").trim();
   return "slopegames.net";
};

const richHostname = (text, hostname) => {
  const safeHost = normalizeHost(hostname);
  const linkOpen = `<a class="host-link" href="https://${safeHost}/">`;
  return String(text)
    .replaceAll("{hostname}", safeHost)
    .replaceAll("<tagname>", linkOpen)
    .replaceAll("</tagname>", "</a>");
};

const sample = (arr, n) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) node.appendChild(child);
  return node;
};

const gameCard = (game, t, lang) => {
  const thumb = el("div", { class: "game-thumb" }, [
    el("img", { src: game.image, alt: game.name, loading: "lazy" }),
  ]);
  const titleOverlay = el("div", { class: "game-title-overlay" });
  titleOverlay.textContent = game.name;
  const card = el("a", { class: "game", href: `./detail.html?lang=${encodeURIComponent(lang)}&id=${encodeURIComponent(game.id)}` }, [thumb, titleOverlay]);
  return card;
};

const createTranslator = (messages) => {
  return (key, vars) => {
    const parts = String(key).split(".");
    let cur = messages;
    for (const p of parts) {
      cur = cur && typeof cur === "object" ? cur[p] : undefined;
    }
    const v = cur == null ? key : cur;
    return vars ? template(v, vars) : String(v);
  };
};

const loadLocalePack = async (lang) => {
  const embedded = getEmbedded(lang);
  if (embedded && embedded.messages) {
    const t = createTranslator(embedded.messages);
    return { messages: embedded.messages, t };
  }

  let messages;
  try {
    messages = await fetchJson(`../messages/${lang}.json`);
  } catch {
    messages = await fetchJson(`../messages/${DEFAULT_LANG}.json`);
  }
  const t = createTranslator(messages);
  return { messages, t };
};

const loadData = async (lang) => {
  const embedded = getEmbedded(lang);
  if (embedded && embedded.categories && embedded.games) {
    return { categories: embedded.categories, games: embedded.games };
  }

  let categories;
  let games;
  try {
    categories = await fetchJson(`../data/${lang}/categories.json`);
    games = await fetchJson(`../data/${lang}/data.json`);
  } catch {
    categories = await fetchJson(`../data/${DEFAULT_LANG}/categories.json`);
    games = await fetchJson(`../data/${DEFAULT_LANG}/data.json`);
  }
  return { categories, games };
};

const renderHeader = (categories, lang, t) => {
  const navLinks = document.getElementById("nav-links");
  if (navLinks) {
    navLinks.innerHTML = "";
    const params = new URLSearchParams(location.search);
    const active = params.get("category") || "";
    for (const c of categories) {
      const a = el("a", {
        class: `nav-pill${active === c.alias ? " active" : ""}`,
        href: `./index.html?lang=${encodeURIComponent(lang)}&category=${encodeURIComponent(c.alias)}`
      });
      a.textContent = c.name;
      navLinks.appendChild(a);
    }
  }

  // 地球图标下拉菜单
  const langBtn = document.getElementById("lang-btn");
  const langDropdown = document.getElementById("lang-dropdown");
  if (langBtn && langDropdown) {
    // 标记当前语言
    langDropdown.querySelectorAll(".lang-option").forEach((btn) => {
      if (btn.dataset.lang === lang) btn.classList.add("active");
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
    langBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle("open");
    });
    document.addEventListener("click", () => langDropdown.classList.remove("open"));
  }

  const logo = document.getElementById("logo-link");
  if (logo) logo.href = `./index.html?lang=${encodeURIComponent(lang)}`;

  document.getElementById("page-title") && (document.getElementById("page-title").textContent = t("Common.Games", { category: t("Common.New") }));
};

const renderHero = (games, lang) => {
  const hero = document.getElementById("hero-track");
  hero.innerHTML = "";
  const slides = sample(games, Math.min(8, games.length));
  for (const g of slides) {
    const slide = el("a", { class: "hero-slide", href: `./detail.html?lang=${encodeURIComponent(lang)}&id=${encodeURIComponent(g.id)}` }, [
      el("img", { src: g.image, alt: g.name, loading: "eager" }),
      el("div", { class: "hero-overlay" }, [
        el("p", { class: "hero-title" }),
        el("p", { class: "hero-desc" }),
      ])
    ]);
    slide.querySelector(".hero-title").textContent = g.name;
    slide.querySelector(".hero-desc").textContent = g.description || "";
    hero.appendChild(slide);
  }

  let idx = 0;
  const rotate = () => {
    idx = (idx + 1) % slides.length;
    hero.style.transform = `translateX(-${idx * 100}%)`;
  };
  if (slides.length > 1) {
    setInterval(rotate, 4500);
  }
};

const renderSection = (mountId, title, games, lang, t) => {
  const mount = document.getElementById(mountId);
  mount.innerHTML = "";
  // next 风格：横线-标题-横线
  const head = el("div", { class: "section-head" });
  const lineLeft = el("div", { class: "section-line-left" });
  const titleEl = el("h2", { class: "section-title" });
  titleEl.textContent = title;
  const lineRight = el("div", { class: "section-line" });
  head.appendChild(lineLeft);
  head.appendChild(titleEl);
  head.appendChild(lineRight);
  mount.appendChild(head);
  const grid = el("div", { class: "grid" });
  for (const g of games) grid.appendChild(gameCard(g, t, lang));
  mount.appendChild(grid);
};

const renderCategorySections = (categories, games, lang, t, hostname) => {
  const wrap = document.getElementById("category-sections");
  wrap.innerHTML = "";

  const params = new URLSearchParams(location.search);
  const active = params.get("category");
  const list = active ? categories.filter((c) => c.alias === active) : categories;

  for (const c of list) {
    const cg = games.filter((g) => String(g.categoryId) === String(c.id));
    const pick = sample(cg, Math.min(18, cg.length));
    const section = el("section", { class: "card section" });
    const titleText = template(t("Common.Games", { category: c.name }), { category: c.name });

    // next 风格标题：横线-标题-横线 + More 链接
    const head = el("div", { class: "section-head" });
    const lineLeft = el("div", { class: "section-line-left" });
    const titleEl = el("h2", { class: "section-title" });
    titleEl.textContent = titleText;
    const lineRight = el("div", { class: "section-line" });
    const moreLink = el("a", {
      class: "nav-pill",
      href: `./index.html?lang=${encodeURIComponent(lang)}&category=${encodeURIComponent(c.alias)}`,
      style: "font-size:12px;opacity:0.75;font-weight:700;margin-left:12px;flex-shrink:0;"
    });
    moreLink.textContent = t("Common.More");
    head.appendChild(lineLeft);
    head.appendChild(titleEl);
    head.appendChild(lineRight);
    head.appendChild(moreLink);
    section.appendChild(head);

    const grid = el("div", { class: "grid" });
    for (const g of pick) grid.appendChild(gameCard(g, t, lang));
    section.appendChild(grid);
    wrap.appendChild(section);
  }

  const info = document.getElementById("info");
  info.innerHTML = "";
  for (const key of ["section1", "section2", "section3"]) {
    const title =
      lang === "en-US" && key === "section2"
        ? "欢迎来到slopegames.net"
        : richHostname(t(`Info.${key}.title`), hostname);
    info.appendChild(el("h3", { html: title }));
    for (let i = 1; i <= 12; i++) {
      const k = `Info.${key}.paragraph${i}`;
      const v = t(k);
      if (v === k) break;
      info.appendChild(el("p", { html: richHostname(v, hostname) }));
    }
  }
};

const main = async () => {
  const lang = pickLang();
  const hostname = "slopegames.net";

  const { t } = await loadLocalePack(lang);
  const { categories, games } = await loadData(lang);

  renderHeader(categories, lang, t);
  renderHero(games, lang);

  const newGames = sample(games, Math.min(6, games.length));
  const topGames = sample(games, Math.min(12, games.length));

  renderSection("new-section", t("Common.Games", { category: t("Common.New") }), newGames, lang, t);
  renderSection("top-section", t("Common.Games", { category: t("Common.Top") }), topGames, lang, t);
  renderCategorySections(categories, games, lang, t, hostname);

  document.getElementById("year").textContent = String(new Date().getFullYear());
};

main().catch((e) => {
  const mount = document.getElementById("app-error");
  if (mount) mount.textContent = String(e && e.message ? e.message : e);
});
