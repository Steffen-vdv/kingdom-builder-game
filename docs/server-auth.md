# Server Authentication Stub

The server package includes a lightweight authentication middleware that maps
incoming bearer tokens to an `AuthContext`. Requests use this context to decide
whether the caller may create new sessions or advance existing games.

## Configuring tokens

Tokens can be supplied through configuration files or via the
`KB_SERVER_AUTH_TOKENS` environment variable. The repository ships with
`config/server-auth.tokens.default.json`, which `npm run dev` loads through
`scripts/run-with-auth.mjs` to provide a local admin token automatically.

Create `config/server-auth.tokens.local.json` when you need to override the
default map. The wrapper script resolves tokens in this order:

1. `KB_SERVER_AUTH_TOKENS` (useful for CI and deployment environments).
2. `config/server-auth.tokens.local.json` (ignored by git).
3. `config/server-auth.tokens.default.json` (checked into the repo for
   development; ignored when `--require-tokens` is passed).

When neither the environment variable nor the local override is present, the
default file keeps the development server accessible with admin privileges. For
production, call `npm run start` so `NODE_ENV=production` is set. The wrapper
skips the default dev file (and the built-in fallback) when `--require-tokens`
is present, forcing you to supply real credentials.

Both the environment variable and the JSON files share the same structure. Set
the `KB_SERVER_AUTH_TOKENS` variable (or populate the config files) with a JSON
object where each property key is a token string and the value describes the
user and their roles. For example:

```
export KB_SERVER_AUTH_TOKENS='{"local-dev": {"userId": "dev", "roles": ["session:create", "session:advance"]}}'
```

Each entry requires a `userId` and accepts a list of `roles`. Tokens are matched
exactly. The middleware accepts either a standard `Authorization: Bearer <token>`
header or `X-KB-Dev-Token: <token>` for tooling that cannot set bearer headers.

Roles gate access to specific transport actions:

- `session:create` — create new game sessions.
- `session:advance` — advance a session through its phases.
- `admin` — grants all permissions.

## Development workflow

1. Define one or more tokens before starting the server or running tests. Use
   `config/server-auth.tokens.local.json` for persistent local overrides or set
   `KB_SERVER_AUTH_TOKENS` for ad-hoc shells and CI.
2. Use the token in API clients by sending an `Authorization` header or the
   `X-KB-Dev-Token` header.
3. Tests can inject custom token tables by creating a middleware via
   `createTokenAuthMiddleware({ tokens })` and passing it to `SessionTransport`.

Tokens without required roles trigger `403 Forbidden`. Missing tokens return
`401 Unauthorized`.

## Player name validation

Session creation and player name updates trim whitespace and accept names up to
40 visible characters. Any request that submits a longer name is rejected with a
`400 Bad Request` response carrying the `INVALID_REQUEST` code and the message
"Player names must be 40 characters or fewer." Blank names are ignored during
session creation and remain disallowed when updating an existing player.
