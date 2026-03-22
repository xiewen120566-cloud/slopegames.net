const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "..", "public");
const dest = path.resolve(__dirname, "public");

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  const entries = fs.readdirSync(from, { withFileTypes: true });
  for (const e of entries) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) {
      copyDir(a, b);
    } else if (e.isFile()) {
      fs.copyFileSync(a, b);
    }
  }
};

const main = () => {
  if (!fs.existsSync(src)) throw new Error(`missing: ${src}`);
  copyDir(src, dest);
  process.stdout.write(`copied: ${src} -> ${dest}\n`);
};

main();
