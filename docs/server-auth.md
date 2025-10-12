# Server Authentication Stub

The server package includes a lightweight authentication middleware that maps
incoming bearer tokens to an `AuthContext`. Requests use this context to decide
whether the caller may create new sessions or advance existing games.

## Configuring tokens

Set the `KB_SERVER_AUTH_TOKENS` environment variable to a JSON object where each
property key is a token string and the value describes the user and their roles.
For example:

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

1. Define one or more tokens in `KB_SERVER_AUTH_TOKENS` before starting the
   server or running tests.
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
