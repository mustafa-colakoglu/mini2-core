# Changelog

## 2.0.1-beta.13 — 2026-03-22

### Security

- **Dependencies:** Removed unused runtime dependency `postman-collection` (transitively pulled vulnerable `@faker-js/faker` and outdated `uuid`). Postman collections are still generated as plain JSON without that package.
- **API documentation:** Swagger UI, OpenAPI JSON, and Postman JSON endpoints are **disabled by default**. Set `docs: { enabled: true }` in `IConfig` (or legacy `swaggerDocsPath` / `swaggerJsonPath` / `postmanJsonPath` / `swaggerBasicAuth`) to expose them. Legacy path/auth fields still enable docs but log a one-time deprecation warning.
- **Basic auth:** Documentation endpoints use constant-time credential comparison (SHA-256 + `timingSafeEqual`). Failed auth returns generic `401 Unauthorized` without echoing credentials.

### Added

- `IDocsConfig` on `IConfig` (`docs.enabled`, `swaggerEnabled`, `postmanEnabled`).
- `IMiddlewareConfig` on `IConfig` (`middleware.cors`, `middleware.morgan`, `middleware.morganFormat`).

### Changed

- `ts-node` moved to `devDependencies` (only used by the `npm run dev` script).

### Migration

**Before (docs always on):**

```typescript
await app.init({
  host: 'localhost',
  port: 3000,
  applicationName: 'My API',
});
```

**After (explicit opt-in):**

```typescript
await app.init({
  host: 'localhost',
  port: 3000,
  applicationName: 'My API',
  docs: { enabled: true },
});
```

Mini2App: add `docs: { enabled: true }` inside `resolveConfig()`.

To harden production apps without changing HTTP behavior, keep defaults; to disable open CORS or request logging:

```typescript
middleware: { cors: false, morgan: false },
```
