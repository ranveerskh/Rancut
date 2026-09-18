import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {createApi} from './server.mjs';
export default defineConfig({plugins:[react(),{name:'rancut-local',async configureServer(s){const api=await createApi();s.middlewares.use(api.middleware);s.httpServer?.once('close',()=>api.cleanup());},async configurePreviewServer(s){const api=await createApi();s.middlewares.use(api.middleware);s.httpServer?.once('close',()=>api.cleanup());}}],server:{host:'127.0.0.1',port:5173,strictPort:true},preview:{host:'127.0.0.1',port:5173,strictPort:true}});
