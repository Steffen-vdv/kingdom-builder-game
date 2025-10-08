# Server Authentication Stub

The server package exposes a lightweight authentication stub that parses
bearer tokens or a development header and attaches an auth context to request
handlers. Real identity providers can replace the stub later, but the current
implementation makes it easy to test role checks locally.

## Configuration

1. Create a JSON object that maps tokens to user metadata and store it in the
   `KB_SERVER_AUTH_TOKENS` environment variable. Each entry must provide a
   `userId` and may provide a `roles` array.
2. Restart the server process (or your tests) after changing the environment
   variable so the registry reloads.

```bash
export KB_SERVER_AUTH_TOKENS='{
  "dev-token": {
    "userId": "local-dev",
    "roles": [
      "session:create",
      "session:advance",
      "session:devmode"
    ]
  }
}'
```

The stub reads the header `x-kb-dev-auth` as a shortcut for local tools. Any
standard HTTP `Authorization: Bearer <token>` header is also accepted.

## Usage in Handlers

The `validateAuth` helper returns an `AuthContext` when the provided headers
match a configured token. Middleware can attach that context to the
`RequestContext` passed into transport methods. The `SessionTransport`
currently requires the following roles:

- `session:create` for creating sessions.
- `session:advance` for advancing a phase.
- `session:devmode` for toggling developer mode.

Missing tokens raise `UNAUTHORIZED` errors and insufficient roles raise
`FORBIDDEN` errors.

## Development Tips

- Use short, unique tokens during development to simplify manual testing.
- Commit sample values to a `.env.local` file instead of source control.
- Update integration tests with explicit `RequestContext` objects so unit tests
  continue to pass without relying on process environment.
