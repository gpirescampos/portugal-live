import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [cesium()],
  server: {
    host: 'localhost',
    port: 4173,
  },
  preview: {
    host: 'localhost',
    port: 4173,
  },
});
