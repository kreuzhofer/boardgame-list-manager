import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import * as dotenv from 'dotenv';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from root directory using dotenv directly
  const rootEnvPath = path.resolve(__dirname, '..', '.env');
  const rootEnv = dotenv.config({ path: rootEnvPath }).parsed || {};
  
  // Also load Vite env for any VITE_ prefixed vars
  const viteEnv = loadEnv(mode, path.resolve(__dirname, '..'), 'VITE_');
  
  const eventName = rootEnv.EVENT_NAME || viteEnv.VITE_EVENT_NAME || 'Brettspiel-Event';
  const apiPort = rootEnv.API_PORT || '3006';
  
  return {
    plugins: [react()],
    define: {
      // Map root env vars to VITE_ prefixed vars for client access
      'import.meta.env.VITE_EVENT_NAME': JSON.stringify(eventName),
      'import.meta.env.VITE_API_URL': JSON.stringify(`http://localhost:${apiPort}`),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 8086,
      host: true,
    },
    preview: {
      port: 8086,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
