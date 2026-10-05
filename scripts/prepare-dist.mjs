// Activepieces loads a piece from <package root>/src/index.js (it imports that path directly),
// exactly like the official pieces, which are published from their build folder.
// This script turns dist/ into that publishable package: dist/package.json with main ./src/index.js.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const out = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  keywords: pkg.keywords,
  homepage: pkg.homepage,
  author: pkg.author,
  license: pkg.license,
  main: './src/index.js',
  types: './src/index.d.ts',
  type: 'commonjs',
  dependencies: pkg.dependencies,
};
writeFileSync('dist/package.json', JSON.stringify(out, null, 2) + '\n');
for (const f of ['README.md', 'LICENSE']) if (existsSync(f)) copyFileSync(f, `dist/${f}`);
console.log(`dist/package.json written for ${out.name}@${out.version}`);
