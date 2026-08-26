# Sealsela
React + Vite + Tailwind CSS project for Sealsela (Customer Loyalty & Merchant Rewards Platform).


A Vite development server runs on port 3000 (`0.0.0.0:3000`).

## Project Structure

- `src/main.tsx` - React entrypoint; mounts `src/App.tsx` into `#root`
- `src/App.tsx` - Main view switcher (Landing, Customer App, Merchant Dashboard/Onboarding, Ops Console)
- `src/index.css` - Tailwind CSS v4 and typography configuration
- `index.html` - HTML shell
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration with React and Tailwind CSS v4 plugins
- `src/views/` - Application views (customer, merchant, ops, landing)
- `src/components/` - Shared UI components (Icons, StampGrid)
- `src/data/mockData.ts` - Mock data for cards, merchants, and campaigns

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with `@tailwindcss/vite`
- Build tooling: Vite 8, TypeScript 5.7
