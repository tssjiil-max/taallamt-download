import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Two pages: index.html is the new teacher/student app, legacy.html keeps the existing teacher tools.
export default defineConfig({ plugins: [react()], define: {'import.meta.env.VITE_DAILY_LEARNING': JSON.stringify(process.env.VERCEL_ENV!=='production'&&(!process.env.VERCEL_ENV||process.env.VERCEL_GIT_COMMIT_REF==='feature/daily-learning-20261020')?'1':'0')}, build: { rollupOptions: { input: { index: 'index.html', legacy: 'legacy.html' } } } });
