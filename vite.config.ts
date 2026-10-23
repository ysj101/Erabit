import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/Erabit/',
  // assets/ also holds design boards and mockups that must never ship; images are imported instead.
  publicDir: false,
  plugins: [react(), tailwindcss()],
});
