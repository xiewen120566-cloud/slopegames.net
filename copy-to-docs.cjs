const fs = require("fs");
const path = require("path");

const src = __dirname;
const dest = path.join(__dirname, "docs");

const items = ["index.html", "detail.html", "play.html", "ads.txt", "assets", "generated", "public"];

const copyRecursive = (from, to) => {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const child of fs.readdirSync(from)) {
      copyRecursive(path.join(from, child), path.join(to, child));
    }
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
};

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.mkdirSync(dest, { recursive: true });

for (const item of items) {
  const from = path.join(src, item);
  if (fs.existsSync(from)) {
    copyRecursive(from, path.join(dest, item));
    console.log(`copied: ${item}`);
  }
}

console.log("done! docs folder is ready.");
