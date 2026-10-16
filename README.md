# Ìrántí

_Leave your family clarity, not chaos._ A zero-knowledge "if I die tomorrow" vault with a
designed release protocol, by Cotek App FZ-LLC.

- **Build plan:** [`docs/BUILD.md`](docs/BUILD.md) · **progress:** [`docs/PROGRESS.md`](docs/PROGRESS.md)
- **Security:** [`docs/CRYPTO.md`](docs/CRYPTO.md) · [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)
- **Privacy policy (draft):** [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md)
- **Concept screens:** [`docs/design/iranti-preview.html`](docs/design/iranti-preview.html)

## Layout

```
apps/web        static client (Next.js output: 'export'): PWA + Capacitor bundle → iranti.cotek.app
apps/api        route handlers, Prisma, jobs                                    → api.iranti.cotek.app
packages/crypto ALL cryptography (nothing else may import a crypto library)
packages/core   Zod schemas, shared types, typed API client
packages/ui     design tokens and components
packages/playbooks  playbook schema and (draft) content
```

## Develop

Node 22, pnpm 10.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # add Neon URLs to talk to a database
cp apps/web/.env.example apps/web/.env.local
pnpm dev                                    # web :3000, api :3001
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm --filter @iranti/web e2e               # after a build (see Tests)
```

## Deploy (Vercel)

Two projects from this one repository:

| Project      | Root directory | Domain                 | Env vars                         |
| ------------ | -------------- | ---------------------- | -------------------------------- |
| `iranti-web` | `apps/web`     | `iranti.cotek.app`     | none (public values committed)   |
| `iranti-api` | `apps/api`     | `api.iranti.cotek.app` | secrets only, see `.env.example` |

Each app's `vercel.json` sets the install and build commands. Domains are scoped per project
(no wildcard). Production API builds apply pending database migrations first
(`apps/api/scripts/migrate.mjs`, needs `DIRECT_URL`).

### R2 bucket CORS

Browsers upload and download encrypted chunks straight to R2. In Cloudflare → R2 → your bucket
→ Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://iranti.cotek.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Tests

- `pnpm test` runs unit tests everywhere. API integration tests run when `TEST_DATABASE_URL`
  points at a Postgres database (they reset it): e.g.
  `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5433/iranti_test pnpm test`.
- e2e (`pnpm --filter @iranti/web e2e`) starts the API, the static site and a fake S3 itself.
  Build first with `NEXT_PUBLIC_API_URL=http://localhost:3001 NEXT_PUBLIC_SITE_URL=http://localhost:4173 NEXT_PUBLIC_STORAGE_ORIGIN=http://localhost:9000 pnpm build`,
  and point `E2E_DATABASE_URL` at a migrated database.
