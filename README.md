# Cornucopium

Cornucopium combines Magic: The Gathering deck and commander management, life tracking, 3D dice rolling, and hiking route planning. The project was bootstrapped with Create T3 App.

## Technology overview

Major versions reflect declarations in `package.json`; exact resolved versions are in `package-lock.json`.

### Application and UI

| Technology | Use in the app |
| --- | --- |
| Next.js 16 and React 19 | App Router pages, server and client components, API route handlers, and interactive interfaces. Development runs with Turbopack. |
| TypeScript 5 | Static typing across the frontend and backend, with strict checking enabled. |
| Mantine 8 | UI components, hooks, application shell, and light/dark color schemes. |
| Tailwind CSS 4 and CSS Modules | Utility classes and feature-specific styles. PostCSS runs the Tailwind and Mantine plugins. |
| Tabler Icons | React icons throughout the UI. |
| i18next and react-i18next | English and Danish translation resources and React integration. |

### Backend and persistence

| Technology | Use in the app |
| --- | --- |
| tRPC 11 | Type-safe API procedures for decks, MTG selections, dice configuration, and hiking routes. |
| TanStack React Query 5 | Fetching, caching, and mutations through the tRPC integration. |
| Zod 3 | Runtime validation for API inputs and environment configuration. |
| SuperJSON | Serialization for tRPC and React Query hydration. |
| Auth.js / NextAuth.js 5 beta | Discord sign-in and session management with the Prisma authentication adapter. |
| Prisma 6 | Schema, generated database client, and migrations for users, authentication records, decks, hiking routes, and dice settings. |
| Turso / libSQL | Runtime database connection through `@prisma/adapter-libsql`, using a Turso URL and token. The Prisma schema uses the SQLite provider. |
| Upstash Redis and Ratelimit | Optional request rate limiting when the Upstash environment variables are configured. |
| `@t3-oss/env-nextjs` | Environment variable validation in `src/env.js`. |
| Browser localStorage | Persistence for client preferences and dice configuration. |

### Feature-specific libraries and services

| Feature | Technologies |
| --- | --- |
| 3D dice roller | `@3d-dice/dice-box` for dice simulation; Three.js, React Three Fiber, Drei, and React Spring for 3D rendering helpers and animation. Static dice assets live in `public/assets/dice-box`. |
| MTG decks and commander collection | Scryfall API for card search, details, and print images; Recharts for collection charts. |
| Hiking planner | Leaflet and React Leaflet for maps, OpenStreetMap tiles, BRouter for routing, Photon for place search, Overpass for points of interest, and Open-Meteo for elevation data. Supports GPX export. |

## Project structure

| Path | Contents |
| --- | --- |
| `src/app` | Pages, layouts, API handlers, and feature components, hooks, styles, and translations. |
| `src/server/api` | tRPC setup and feature routers. |
| `src/server/auth` | Discord authentication and session configuration. |
| `src/server/db.ts` | Prisma client and Turso/libSQL connection. |
| `src/server/ratelimit.ts` | Optional Upstash rate limiters. |
| `src/trpc` | React and server tRPC clients and React Query configuration. |
| `src/styles` | Global styles and Tailwind configuration. |
| `prisma` | Database schema and migrations. |
| `public` | Static assets. |

## Development tooling

The project declares `npm@11.5.1` as its package manager. Configure the environment variables defined in `src/env.js` before running the app or database commands.

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies and generate the Prisma client through the postinstall script. |
| `npm run dev` | Start the development server with Turbopack. |
| `npm run build` | Create a production build. |
| `npm start` | Serve an existing production build. |
| `npm run preview` | Build and serve the production app. |
| `npm run typecheck` | Run TypeScript checking without emitting files. |
| `npm run db:generate` | Create and apply development migrations with `prisma migrate dev`. |
| `npm run db:migrate` | Apply existing migrations with `prisma migrate deploy`. |
| `npm run db:push` | Push the Prisma schema to the configured database. |
| `npm run db:studio` | Open Prisma Studio. |
