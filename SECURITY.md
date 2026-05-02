# Security Vulnerability Audit

The following vulnerabilities were found during the dependency audit, which cannot be automatically fixed without introducing breaking changes. These will need to be addressed through manual library upgrades and potentially significant refactoring.

## 1. @hono/node-server (Moderate)

- **Description**: Middleware bypass via repeated slashes in serveStatic
- **CVE**: GHSA-92pp-h63x-v22m
- **Planned Resolution**: Wait for an update to `@prisma/dev` that bumps the `@hono/node-server` dependency, or upgrade Prisma to >=6.20.0 (breaking change).

## 2. Vercel AI SDK (Moderate)

- **Description**: Filetype whitelists can be bypassed when uploading files.
- **CVE**: GHSA-rwvc-j5jr-mgvh
- **Planned Resolution**: Upgrade to AI SDK v6.0.173. This is currently avoided because v6 has breaking changes to the Language Model Specification and we are pinned to v4.3.x for stability.

## 3. glob CLI (High)

- **Description**: Command injection via `-c/--cmd` executes matches with `shell:true`.
- **CVE**: GHSA-5j98-mcp5-4vw2
- **Planned Resolution**: Wait for `eslint-config-next` v14 to bump its `@next/eslint-plugin-next` dependency, or upgrade Next.js to v16.2.4 (breaking change).

## 4. jsondiffpatch (Moderate)

- **Description**: Cross-site Scripting (XSS) via `HtmlFormatter::nodeBegin`.
- **CVE**: GHSA-33vc-wfww-vjfv
- **Planned Resolution**: Upgrade to AI SDK v6 (breaking change).

## 5. minimatch (High)

- **Description**: Multiple ReDoS vulnerabilities.
- **CVE**: GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74
- **Planned Resolution**: Can be fixed via `npm audit fix` but it failed due to peer dependency conflicts (`ERESOLVE`). Resolution is to use `--legacy-peer-deps` or bump `nodemailer` peer requirements.

## 6. nanoid (Moderate)

- **Description**: Predictable results in nanoid generation.
- **CVE**: GHSA-mwcw-c2x4-8c55
- **Planned Resolution**: Upgrade `@ai-sdk/mistral`, etc., to v3+ which requires bumping the main `ai` SDK to v6 (breaking change).

## 7. Next.js (Critical & High)

- **Description**: Next.js Cache Poisoning, SSRF, DoS, etc.
- **CVE**: GHSA-gp8f-8m3g-qvj9 and others.
- **Planned Resolution**: Next.js must be updated outside the current v14.2.3 range (requires a major upgrade or patching to `14.2.35`).

## 8. postcss (Moderate)

- **Description**: PostCSS has XSS via Unescaped `</style>`.
- **CVE**: GHSA-qx2v-qp2m-jg93
- **Planned Resolution**: Upgrade Next.js.

## 9. uuid (Moderate)

- **Description**: Missing buffer bounds check in v3/v5/v6 when buf is provided.
- **CVE**: GHSA-w5hq-g745-h8pq
- **Planned Resolution**: Requires upgrading `mermaid` (breaking change).
