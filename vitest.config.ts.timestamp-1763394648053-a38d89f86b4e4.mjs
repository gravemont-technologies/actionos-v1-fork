// vitest.config.ts
import { defineConfig } from "file:///C:/Users/muzam/OneDrive/Desktop/PROJECTS/Unicorns/Unibase/Elevate/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/muzam/OneDrive/Desktop/PROJECTS/Unicorns/Unibase/Elevate/node_modules/@vitejs/plugin-react/dist/index.js";
var vitest_config_default = defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.ts", "src/**/*.test.tsx", "src/ui/vite-env.d.ts"]
    },
    testTimeout: 3e4,
    // 30 seconds for API tests
    hookTimeout: 3e4
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXG11emFtXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcUFJPSkVDVFNcXFxcVW5pY29ybnNcXFxcVW5pYmFzZVxcXFxFbGV2YXRlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtdXphbVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXFBST0pFQ1RTXFxcXFVuaWNvcm5zXFxcXFVuaWJhc2VcXFxcRWxldmF0ZVxcXFx2aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9tdXphbS9PbmVEcml2ZS9EZXNrdG9wL1BST0pFQ1RTL1VuaWNvcm5zL1VuaWJhc2UvRWxldmF0ZS92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVzdC9jb25maWdcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGVudmlyb25tZW50OiBcIm5vZGVcIixcclxuICAgIGVudmlyb25tZW50TWF0Y2hHbG9iczogW1tcIioqLyoudGVzdC50c3hcIiwgXCJqc2RvbVwiXV0sXHJcbiAgICBzZXR1cEZpbGVzOiBbXCJ0ZXN0cy9zZXR1cC50c1wiXSxcclxuICAgIGluY2x1ZGU6IFtcInRlc3RzLyoqLyoudGVzdC50c1wiLCBcInRlc3RzLyoqLyoudGVzdC50c3hcIl0sXHJcbiAgICBjb3ZlcmFnZTogeyBcclxuICAgICAgcmVwb3J0ZXI6IFtcInRleHRcIiwgXCJodG1sXCJdLFxyXG4gICAgICBpbmNsdWRlOiBbXCJzcmMvKiovKi50c1wiLCBcInNyYy8qKi8qLnRzeFwiXSxcclxuICAgICAgZXhjbHVkZTogW1wic3JjLyoqLyouZC50c1wiLCBcInNyYy8qKi8qLnRlc3QudHNcIiwgXCJzcmMvKiovKi50ZXN0LnRzeFwiLCBcInNyYy91aS92aXRlLWVudi5kLnRzXCJdLFxyXG4gICAgfSxcclxuICAgIHRlc3RUaW1lb3V0OiAzMDAwMCwgLy8gMzAgc2Vjb25kcyBmb3IgQVBJIHRlc3RzXHJcbiAgICBob29rVGltZW91dDogMzAwMDAsXHJcbiAgfSxcclxufSk7XHJcblxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTJZLFNBQVMsb0JBQW9CO0FBQ3hhLE9BQU8sV0FBVztBQUVsQixJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsdUJBQXVCLENBQUMsQ0FBQyxpQkFBaUIsT0FBTyxDQUFDO0FBQUEsSUFDbEQsWUFBWSxDQUFDLGdCQUFnQjtBQUFBLElBQzdCLFNBQVMsQ0FBQyxzQkFBc0IscUJBQXFCO0FBQUEsSUFDckQsVUFBVTtBQUFBLE1BQ1IsVUFBVSxDQUFDLFFBQVEsTUFBTTtBQUFBLE1BQ3pCLFNBQVMsQ0FBQyxlQUFlLGNBQWM7QUFBQSxNQUN2QyxTQUFTLENBQUMsaUJBQWlCLG9CQUFvQixxQkFBcUIsc0JBQXNCO0FBQUEsSUFDNUY7QUFBQSxJQUNBLGFBQWE7QUFBQTtBQUFBLElBQ2IsYUFBYTtBQUFBLEVBQ2Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
