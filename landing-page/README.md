# ActionEngine - Get Exact Actions in 60s

Performance-first React landing page with Tailwind CSS and Clerk authentication.

## Quick Start

```bash
# Install dependencies (includes @tailwindcss/typography)
npm install

# Add environment variables
cp .env.example .env
# Add your Clerk publishable key to .env

# Start dev server
npm run dev
```

## Tech Stack

- React 19.2.0 + TypeScript 5.9.3
- Vite 7.2.2
- Tailwind CSS 3.x with `@tailwindcss/typography`
- Clerk for authentication
- Inter font (preconnected, preloaded)

## Features

- 🎨 Minimalist design with tight color palette
- 🔐 Clerk authentication with sign in/log in
- 🌙 Light/dark mode toggle
- ♿ Fully accessible (WCAG compliant)
- ⚡ Performance-optimized (inline SVGs, code-split modal)
- 📱 Responsive (mobile-first)

## Configuration

The design system is configured in:
- `tailwind.config.ts` - Tailwind theme extension
- `src/index.css` - CSS variables and design tokens

### Tailwind Config Addition

```js
extend: {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  },
}
```

## Deployment

Built with Vite - optimized for production with:
- Tree-shaking for minimal bundle size
- Inline optimized SVGs
- Preloaded critical fonts
- Hardware-accelerated transitions
