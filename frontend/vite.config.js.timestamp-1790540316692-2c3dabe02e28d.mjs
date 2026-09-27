// vite.config.js
import { defineConfig } from "file:///C:/Users/DATASOFT/Desktop/scan-attendance/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/DATASOFT/Desktop/scan-attendance/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/DATASOFT/Desktop/scan-attendance/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "SWEP/SWIES Scanner",
        short_name: "SWEP Scanner",
        description: "Attendance scanning for SWEP/SWIES technologists",
        theme_color: "#14213D",
        background_color: "#14213D",
        display: "standalone",
        start_url: "/scanner",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        // Scanner assets are cached so the app shell loads with no network;
        // actual scan data goes through the IndexedDB queue in src/offline/*,
        // not through this cache.
        globPatterns: ["**/*.{js,css,html}"]
      }
    })
  ],
  server: { port: 5173 }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEQVRBU09GVFxcXFxEZXNrdG9wXFxcXHNjYW4tYXR0ZW5kYW5jZVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcREFUQVNPRlRcXFxcRGVza3RvcFxcXFxzY2FuLWF0dGVuZGFuY2VcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0RBVEFTT0ZUL0Rlc2t0b3Avc2Nhbi1hdHRlbmRhbmNlL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdTV0VQL1NXSUVTIFNjYW5uZXInLFxuICAgICAgICBzaG9ydF9uYW1lOiAnU1dFUCBTY2FubmVyJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBdHRlbmRhbmNlIHNjYW5uaW5nIGZvciBTV0VQL1NXSUVTIHRlY2hub2xvZ2lzdHMnLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyMxNDIxM0QnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzE0MjEzRCcsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgc3RhcnRfdXJsOiAnL3NjYW5uZXInLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHsgc3JjOiAnL2ljb24tMTkyLnBuZycsIHNpemVzOiAnMTkyeDE5MicsIHR5cGU6ICdpbWFnZS9wbmcnIH0sXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbi01MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIC8vIFNjYW5uZXIgYXNzZXRzIGFyZSBjYWNoZWQgc28gdGhlIGFwcCBzaGVsbCBsb2FkcyB3aXRoIG5vIG5ldHdvcms7XG4gICAgICAgIC8vIGFjdHVhbCBzY2FuIGRhdGEgZ29lcyB0aHJvdWdoIHRoZSBJbmRleGVkREIgcXVldWUgaW4gc3JjL29mZmxpbmUvKixcbiAgICAgICAgLy8gbm90IHRocm91Z2ggdGhpcyBjYWNoZS5cbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sfSddLFxuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcbiAgc2VydmVyOiB7IHBvcnQ6IDUxNzMgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9WLFNBQVMsb0JBQW9CO0FBQ2pYLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFFeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDO0FBQUEsTUFDaEIsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFVBQ0wsRUFBRSxLQUFLLGlCQUFpQixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsVUFDNUQsRUFBRSxLQUFLLGlCQUFpQixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsUUFDOUQ7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJUCxjQUFjLENBQUMsb0JBQW9CO0FBQUEsTUFDckM7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxRQUFRLEVBQUUsTUFBTSxLQUFLO0FBQ3ZCLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
