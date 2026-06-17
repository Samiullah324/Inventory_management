import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function buildCsp(isDev) {
  const devOrigins = 'http://localhost:5173 http://127.0.0.1:5173';
  const devWs = 'ws://localhost:5173 ws://127.0.0.1:5173';
  const styleSrc = isDev ? `'self' ${devOrigins}` : "'self'";
  const connectSrc = isDev ? `'self' ${devOrigins} ${devWs}` : "'self'";

  return [
    "default-src 'self'",
    "script-src 'self'",
    `style-src ${styleSrc}`,
    "img-src 'self'",
    `connect-src ${connectSrc}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ') + ';';
}

function cspPlugin() {
  return {
    name: 'inject-csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const isDev = Boolean(ctx.server);
        const csp = buildCsp(isDev);
        const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;

        if (html.includes('content-security-policy')) {
          return html.replace(
            /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/i,
            meta,
          );
        }

        return html.replace('<head>', `<head>\n    ${meta}`);
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
});
