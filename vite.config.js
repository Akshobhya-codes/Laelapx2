import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const ROUTE_REWRITES = {
  '/founders': '/laelapx.html',
  '/founders/': '/laelapx.html',
  '/investors': '/laelapx-investors.html',
  '/investors/': '/laelapx-investors.html',
};

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  plugins: [
    {
      name: 'laelapx-vercel-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? '/';
          const [path, query = ''] = url.split('?');
          const rewrite = ROUTE_REWRITES[path];
          if (rewrite) req.url = query ? `${rewrite}?${query}` : rewrite;
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        founders: resolve(__dirname, 'laelapx.html'),
        investors: resolve(__dirname, 'laelapx-investors.html'),
      },
    },
  },
});
