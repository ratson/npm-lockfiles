#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { $, write } from "bun";

const pkgNames = [
  "@angular/language-server",
  "@astrojs/ts-plugin",
  "@frat/markdown-toc",
  "@vtsls/language-server",
  "vitepress",
];

const rootDir = dirname(import.meta.dir);

async function main() {
  let updated = false;

  $.env({ ...process.env, NODE_ENV: "production" });

  await $`
    git config --global user.email 'github-actions[bot]@users.noreply.github.com'
    git config --global user.name 'github-actions[bot]'
  `.cwd(rootDir);

  for (const name of pkgNames) {
    const pkgUrl = `https://unpkg.com/${name}/package.json`;
    const pkgText = await fetch(pkgUrl).then((x) => x.text());
    const pkg = JSON.parse(pkgText);
    console.log(name, pkg.version);

    const pkgDir = join(rootDir, name, pkg.version);
    await mkdir(pkgDir, { recursive: true });

    const pkgLock = Bun.file(join(pkgDir, "package-lock.json"));
    if (await pkgLock.exists()) continue;

    const pkgFile = Bun.file(join(pkgDir, "package.json"));
    if (!(await pkgFile.exists())) {
      await write(pkgFile, pkgText);
      console.log(pkgFile.name);
    }

    await $`bunx clean-pkg-json`.cwd(pkgDir);

    await $`npm i --package-lock-only --omit dev --omit optional`
      .cwd(pkgDir);

    await $`git add .`.cwd(pkgDir);
    const msg = `feat: add ${name}@${pkg.version} lock file`;
    await $`git commit -m ${msg}`.cwd(pkgDir);

    updated = true;
  }

  if (updated) await $`git push`.cwd(rootDir);
}

if (import.meta.main) await main();
