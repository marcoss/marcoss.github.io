import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string };

function getBuildRevision(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

const buildRevision =
  process.env.BUILD_REVISION || process.env.GITHUB_SHA?.slice(0, 7) || getBuildRevision();
const buildTag = `${packageJson.version}+${buildRevision}`;

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  base: '/',
  define: {
    __BUILD_TAG__: JSON.stringify(buildTag),
  },
});
