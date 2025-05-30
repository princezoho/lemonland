# Vercel Deployment Rules for Vite Projects

## What I Did Correctly ✅

### 1. **Deployed from the Correct Directory**
- Always run `vercel` from inside the actual project directory (e.g., `landing-page/`)
- Don't deploy from parent directories that contain multiple projects

### 2. **Fixed the Base Path Configuration**
- Removed/commented out `base: '/subdirectory/'` in `vite.config.js`
- Vercel serves from root (`/`), unlike GitHub Pages which uses subdirectories
- This fixed broken asset paths like `/lemonland/assets/...` → `/assets/...`

### 3. **Let Vercel Auto-Detect Vite**
- Deleted custom `vercel.json` configurations that were causing issues
- Vercel automatically detects Vite and uses correct build settings
- Trust the auto-detection unless you have specific needs

### 4. **Clean Build Before Deployment**
- Ran `rm -rf dist node_modules/.vite` to clear cached builds
- Rebuilt with `npm run build` to ensure changes took effect
- Used `vercel --prod --force` to bypass any deployment cache

### 5. **Verified Build Output**
- Checked `dist/index.html` to confirm asset paths were correct
- Ensured all images from `public/` were copied to `dist/`
- Confirmed the build logs showed successful completion

## What to Avoid ❌

### 1. **Don't Mix GitHub Pages and Vercel Configs**
- GitHub Pages needs `base: '/repo-name/'`
- Vercel doesn't need a base path
- Keep separate configs or use environment variables

### 2. **Don't Deploy from Wrong Directory**
- Deploying from parent directory creates wrong project structure
- Always `cd` into the Vite project directory first

### 3. **Don't Use Invalid vercel.json Keys**
- `"outputDirectory"` is not a valid Vercel config key
- Stick to documented Vercel configuration options
- When in doubt, let auto-detection handle it

### 4. **Don't Assume Cached Builds Are Fresh**
- Vite and Vercel both cache aggressively
- If changes aren't appearing, clear caches and force rebuild
- Use `--force` flag when needed

### 5. **Don't Ignore Asset Loading Errors**
- If logo/images return 404, the deployment structure is wrong
- Check browser DevTools for asset loading errors
- Test direct asset URLs (e.g., `/lemon-logo.png`)

## Quick Deployment Checklist

```bash
# 1. Navigate to project directory
cd landing-page

# 2. Ensure vite.config.js has no base path for Vercel
# base: '/subdirectory/' should be commented out

# 3. Clean and rebuild
rm -rf dist node_modules/.vite
npm run build

# 4. Deploy to Vercel
vercel --prod

# 5. If issues persist, force deploy
vercel --prod --force
```

## Key Takeaways

1. **Vercel is Zero-Config for Vite** - Let it auto-detect settings
2. **Base Path Matters** - Remove it for Vercel, keep it for GitHub Pages
3. **Deploy from Project Root** - Not parent directories
4. **Clear Caches When Debugging** - Both build and deployment caches
5. **Check Browser Console** - Asset 404s reveal deployment structure issues

## Deployment URLs Pattern

- Vercel: `https://[project-name]-[hash]-[username].vercel.app`
- Assets: `/assets/...` (no subdirectory)
- Public files: `/filename.ext` (served from root) 