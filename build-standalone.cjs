const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.resolve(__dirname, "generated");

const langs = ["en-US", "ja-JP"];

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

const writeFile = (p, content) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
};

const toJs = (lang, messages, categories, games) => {
  const payload = JSON.stringify({ messages, categories, games });
  return `(function(){\n` +
    `  window.__GWAWOG_DATA__ = window.__GWAWOG_DATA__ || {};\n` +
    `  window.__GWAWOG_DATA__[${JSON.stringify(lang)}] = ${payload};\n` +
    `})();\n`;
};

const main = () => {
  ensureDir(outDir);

  for (const lang of langs) {
    const messagesPath = path.join(root, "messages", `${lang}.json`);
    const categoriesPath = path.join(root, "data", lang, "categories.json");
    const dataPath = path.join(root, "data", lang, "data.json");

    const messages = readJson(messagesPath);
    const categories = readJson(categoriesPath);
    const games = readJson(dataPath);

    const js = toJs(lang, messages, categories, games);
    writeFile(path.join(outDir, `${lang}.js`), js);
  }

  process.stdout.write(`generated: ${outDir}\n`);
};

main();
