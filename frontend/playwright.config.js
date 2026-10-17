import { defineConfig } from '@playwright/test'

// Keep benchmark runs serial on one browser channel; automated launches stay offscreen
// unless DRAFT2_HEADLESS_NEW=false is explicitly requested for visual debugging.
const useOffscreenEdge = process.env.DRAFT2_HEADLESS_NEW !== 'false'

export default defineConfig( {
  testDir: './tests/browser',
  outputDir: 'output/playwright/draft2-benchmark',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    [ 'list' ],
    [ 'json', { outputFile: 'output/playwright/draft2-benchmark/report.json' } ],
  ],
  use: {
    baseURL: process.env.DRAFT2_BASE_URL || 'http://127.0.0.1:4173',
    channel: process.env.DRAFT2_BENCHMARK_BROWSER || 'msedge',
    // Draft 2 needs a real WebGL context; Edge's new offscreen mode keeps that path.
    headless: process.env.DRAFT2_HEADLESS === 'true',
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
  launchOptions: {
    // Request software ANGLE and explicitly select new offscreen mode for WebGL.
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      ...(useOffscreenEdge ? [ '--headless=new' ] : []),
    ],
  },
  webServer: process.env.DRAFT2_BASE_URL
    ? undefined
    : {
      // Preview the built app so Vite dependency compilation never enters the
      // measured browser window or depends on dev-server-only Node APIs.
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
} )
