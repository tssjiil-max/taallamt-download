import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Two pages: index.html is the new teacher/student app, legacy.html keeps the existing teacher tools.
export default defineConfig({ plugins: [react()], build: { rollupOptions: { input: { index: 'index.html', legacy: 'legacy.html' } } } });
