import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

const cssSrc = resolve(__dirname, 'styles/flute-select.css');
const cssDest = resolve(__dirname, 'dist/flute-select.css');
const docsDir = resolve(__dirname, 'docs');

const cssPlugin = {
  name: 'css-and-docs',
  setup(build) {
    build.onEnd(async () => {
      // Ensure dirs
      for (const dir of [dirname(cssDest), docsDir]) {
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      }
      if (!existsSync(cssSrc)) return;

      if (watch) {
        writeFileSync(cssDest, readFileSync(cssSrc));
      } else {
        const css = readFileSync(cssSrc, 'utf8');
        const result = await esbuild.transform(css, { loader: 'css', minify: true });
        writeFileSync(cssDest, result.code);
      }

      // Copy dist to docs/ for GitHub Pages
      const jsDist = resolve(__dirname, 'dist/flute-select.js');
      if (existsSync(jsDist)) copyFileSync(jsDist, resolve(docsDir, 'flute-select.js'));
      if (existsSync(cssDest)) copyFileSync(cssDest, resolve(docsDir, 'flute-select.css'));
    });
  },
};

const config = {
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'FluteSelectLib',
  outfile: resolve(__dirname, 'dist/flute-select.js'),
  sourcemap: watch,
  minify: !watch,
  treeShaking: true,
  drop: watch ? [] : ['console'],
  pure: ['console.log', 'console.warn'],
  target: 'es2020',
  plugins: [cssPlugin],
  logLevel: 'info',
  footer: {
    js: `// FluteSelect v${JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version} | MIT License`,
  },
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
}
