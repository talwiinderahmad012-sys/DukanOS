<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Build & Deployment Commands

### Production Build Pipeline (CI)
```bash
npm ci                    # install dependencies (lockfile-locked)
npx prisma generate        # generate Prisma Client
npx prisma validate        # validate schema
npx tsc --noEmit           # typecheck
npm test                   # run reliability tests (test_step34_reliability.ts)
npm run build              # next build
npx prisma migrate deploy  # apply database migrations
npm start                  # next start (production server)
```

### Quick CI Script
```bash
npm run ci  # = prisma generate && prisma validate && tsc --noEmit && test && next build
```

### Linting
```bash
npm run lint       # next lint
npm run lint:fix   # next lint --fix
```

### Database Operations
```bash
npx prisma generate          # generate client
npx prisma validate          # validate schema
npx prisma migrate deploy    # apply migrations (production)
npx prisma migrate dev       # create + apply migration (dev)
npx prisma migrate status    # check migration status
npx prisma studio            # GUI for database
```

### Docker Deployment
```bash
docker build -t dukaanos:1.0.0 .
docker run -d -p 3000:3000 --env-file .env dukaanos:1.0.0
# Or: docker compose up -d --build
```

### Environment
- Node.js: `>=20.18.0` (see `.nvmrc`)
- Package manager: `npm ci` (do not use `npm install` in production)
- The generated Prisma client at `src/generated/prisma/` is NOT committed — always run `prisma generate` before build.
- See `docs/deployment.md` and `RELEASE.md` for full deployment and release procedures.
- Release versioning: `npm run release:patch | release:minor | release:major`
