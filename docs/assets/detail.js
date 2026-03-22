const DEFAULT_LANG = "en-US";
const SUPPORTED_LANGS = new Set(["en-US", "ja-JP"]);

const pickLang = () => {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") || DEFAULT_LANG;
  return SUPPORTED_LANGS.has(lang) ? lang : DEFAULT_LANG;
};

const fetchJson = async (url) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return await res.json();
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

const sample = (arr, n) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

const main = async () => {
  const lang = pickLang();
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) throw new Error("Missing id");

  const { t } = await loadLocalePack(lang);
  const { categories, games } = await loadData(lang);

  const game = games.find((g) => String(g.id) === String(id));
  if (!game) throw new Error("Not Found");

  const category = categories.find((c) => String(c.id) === String(game.categoryId));
  const related = sample(
    games.filter((g) => String(g.categoryId) === String(game.categoryId) && String(g.id) !== String(game.id)),
    12
  );

  document.getElementById("logo-link") && (document.getElementById("logo-link").href = `./index.html?lang=${encodeURIComponent(lang)}`);
  const homeLink = document.getElementById("home-link");
  if (homeLink) homeLink.href = `./index.html?lang=${encodeURIComponent(lang)}`;

  // 渲染分类导航
  const navLinks = document.getElementById("nav-links");
  if (navLinks) {
    navLinks.innerHTML = "";
    for (const c of categories) {
      const a = el("a", {
        class: "nav-pill",
        href: `./index.html?lang=${encodeURIComponent(lang)}&category=${encodeURIComponent(c.alias)}`
      });
      a.textContent = c.name;
      navLinks.appendChild(a);
    }
  }

  const langBtn = document.getElementById("lang-btn");
  const langDropdown = document.getElementById("lang-dropdown");
  if (langBtn && langDropdown) {
    langDropdown.querySelectorAll(".lang-option").forEach((btn) => {
      if (btn.dataset.lang === lang) btn.classList.add("active");
      btn.addEventListener("click", () => {
        const p = new URLSearchParams(location.search);
        p.set("lang", btn.dataset.lang);
        location.search = p.toString();
      });
    });
    langBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle("open");
    });
    document.addEventListener("click", () => langDropdown.classList.remove("open"));
  }

  document.getElementById("game-title").textContent = game.name;
  document.getElementById("hero-img").setAttribute("src", game.image);
  document.getElementById("hero-img").setAttribute("alt", game.name);
  const avatarImg = document.getElementById("avatar-img");
  if (avatarImg) { avatarImg.setAttribute("src", game.image); avatarImg.setAttribute("alt", game.name); }
  document.getElementById("desc").textContent = game.description || "";
  document.getElementById("inst").textContent = game.instructions || "";

  const play = document.getElementById("play-btn");
  play.textContent = t("Common.Play");
  play.href = `./play.html?lang=${encodeURIComponent(lang)}&id=${encodeURIComponent(game.id)}`;

  const crumb = document.getElementById("crumb");
  crumb.textContent = category ? `${t("Common.Category")}: ${category.name}` : "";

  const recTitle = document.getElementById("recommend-title");
  recTitle.textContent = t("Common.Recommend");

  const grid = document.getElementById("recommend-grid");
  grid.innerHTML = "";
  for (const g of related) {
    const titleOverlay = el("div", { class: "game-title-overlay" });
    titleOverlay.textContent = g.name;
    const card = el("a", { class: "game", href: `./detail.html?lang=${encodeURIComponent(lang)}&id=${encodeURIComponent(g.id)}` }, [
      el("div", { class: "game-thumb" }, [el("img", { src: g.image, alt: g.name, loading: "lazy" })]),
      titleOverlay
    ]);
    grid.appendChild(card);
  }

  document.getElementById("year").textContent = String(new Date().getFullYear());
};

main().catch((e) => {
  const mount = document.getElementById("app-error");
  if (mount) mount.textContent = String(e && e.message ? e.message : e);
});

(function () {
  const observer = new MutationObserver(() => {
    document.querySelectorAll(".ad-wrap ins[data-ad-status]").forEach((ins) => {
      const wrap = ins.closest(".ad-wrap");
      if (!wrap) return;
      if (ins.getAttribute("data-ad-status") === "unfilled") {
        wrap.style.display = "none";
      } else {
        wrap.style.display = "";
        wrap.style.minHeight = "";
      }
    });
  });
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-ad-status"] });
})();
