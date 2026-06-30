import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

function getBuildRevision(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

const buildRevision =
  process.env.BUILD_REVISION || process.env.GITHUB_SHA?.slice(0, 7) || getBuildRevision();

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  base: '/',
  define: {
    __BUILD_TAG__: JSON.stringify(buildRevision),
  },
});
