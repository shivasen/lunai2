import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // This is the key change for cPanel/shared hosting deployment.
  // It ensures that all asset paths in the built files are relative 
  // to the index.html file. This makes the project portable.
  base: './',
});
