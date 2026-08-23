# DukaanOS — Release Management Guide (Step 35)

## 1. Versioning Policy

DukaanOS uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

| Segment  | Meaning                        | Example       |
|----------|--------------------------------|---------------|
| MAJOR    | Breaking changes / API changes | `1.0.0 → 2.0.0` |
| MINOR    | New features (backward-compatible) | `1.0.0 → 1.1.0` |
| PATCH    | Bug fixes, patches (backward-compatible) | `1.0.0 → 1.0.1` |

The version is tracked in:
- `package.json` (`"version"` field)
- `package-lock.json` (must match `package.json`)
- `CHANGELOG.md` (human-readable release notes)
- Git tags (`v1.0.0`)

**Critical:** `package.json` and `package-lock.json` versions MUST always match. `npm ci` will fail if they diverge.

## 2. Release Process

### Prerequisites
- All CI checks must pass on `main`.
- The changelog for the next version must be finalized in `CHANGELOG.md` under `[Unreleased]`.

### Steps

```bash
# 1. Ensure main is up to date and clean
git checkout main
git pull origin main

# 2. Bump version (npm handles sync between package.json and package-lock.json)
npm run release:patch   # for bug fixes (1.0.0 → 1.0.1)
npm run release:minor   # for new features (1.0.0 → 1.1.0)
npm run release:major   # for breaking changes (1.0.0 → 2.0.0)

#    This runs:
#    - npm version <type> (updates package.json + package-lock.json)
#    - Creates a git commit with the version bump
#    - Creates a git tag (v1.x.x)
#    - Pushes commit and tag to origin

# 3. CI/CD pipeline triggers on the tag
#    - GitHub Actions CD workflow builds and pushes the Docker image
#    - GitHub Release is created automatically

# 4. Deploy (manual step — provider-agnostic)
#    See docs/deployment.md
```

### Manual Release (without bumpp)

If `bumpp` is unavailable, perform the release manually:

```bash
# 1. Edit package.json version
# 2. Sync version in package-lock.json
# 3. Update CHANGELOG.md
# 4. Commit: git commit -am "chore(release): v1.0.0"
# 5. Tag:     git tag -a v1.0.0 -m "Release v1.0.0"
# 6. Push:    git push origin main --tags
```

## 3. Release Checklist

Before every release, verify:

- [ ] `npm run ci` passes end-to-end (or all CI checks pass)
- [ ] `package.json` version matches `package-lock.json` version
- [ ] `CHANGELOG.md` has an entry for this version under `[Unreleased]`
- [ ] No secrets, credentials, or `.env` files are staged
- [ ] Database migrations are included and tested (`prisma migrate deploy`)
- [ ] Health check endpoints return 200
- [ ] Rollback plan is documented (see below)

## 4. Rollback Procedure

### Application Rollback
```bash
# 1. Identify the last known-good tag
git tag -l          # list available tags

# 2. Checkout the previous release
git checkout v0.19.0

# 3. Rebuild and restart
npm ci
npx prisma generate
npx prisma validate
npm run build
npm start

# Or for Docker:
docker pull ghcr.io/<owner>/<repo>:v0.19.0
docker compose down && docker compose up -d
```

### Database Rollback
- All schema changes in v1.0.0 are additive and non-destructive.
- Prisma migrations are forward-only (`prisma migrate deploy`).
- For critical recovery, restore the latest point-in-time PostgreSQL snapshot.
- The initial migration (`001_init`) is the baseline — never modify or re-run.

### Zero-downtime Deployment Pattern
1. Build new image with version tag.
2. Run database migrations (`prisma migrate deploy`) — additive migrations are safe.
3. Deploy new application version (swap containers or restart process).
4. Monitor `/api/health` and `/api/health/ready`.
5. Verify `/api/cron` maintenance endpoint.

## 5. Git Tagging Convention

```
v1.0.0    # release tags
v1.0.1    # patch releases
v1.1.0    # feature releases
```

Tags are created automatically by `npm run release` (bumpp). They trigger the CD workflow.

## 6. Docker Image Tagging

| Tag           | Description                           |
|---------------|---------------------------------------|
| `:latest`     | Most recent successful build of `main`|
| `:v1.0.0`     | Specific release version              |

Images are stored in the GitHub Container Registry (`ghcr.io`).
