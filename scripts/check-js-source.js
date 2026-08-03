const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "versions/src/js");
const files = fs
  .readdirSync(sourceDir)
  .filter((file) => file.endsWith(".js"))
  .sort()
  .map((file) => path.join(sourceDir, file));

let failed = false;

files.forEach((file) => {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
});

if (failed) process.exit(1);
console.log(`Source JavaScript syntax passed for ${files.length} partial(s).`);
