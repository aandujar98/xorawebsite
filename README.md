# XOrA Network account website

This is the initial account website for [XOrA Network](https://account.xoranetwork.com), the online account system for the XOrA Android launcher and Libretro emulator frontend.

It is a Next.js App Router site that talks to the existing Nakama 3.x server at `api.xoranetwork.com`.

## Architecture

Authentication is handled on the server, not in React state and not in `localStorage`.

- Browser forms post to Next.js route handlers.
- Route handlers use the official `@heroiclabs/nakama-js` client against Nakama.
- Session and refresh tokens are stored in HTTP-only `SameSite=Lax` cookies.
- Browser JavaScript never receives those tokens in JSON responses.
- CSRF uses a readable double-submit cookie plus an `X-CSRF-Token` header, with an Origin check on mutating requests.

This is possible because the Nakama JavaScript client uses `fetch` and can run in Node.js. If that ever becomes impractical, do not silently fall back to `localStorage`; keep tokens on the server.

The Nakama server key is a client API key. It is not the Nakama console password and it is not a PostgreSQL credential. Never put console or database credentials in this project.

## Local setup

1. Install Node.js 20 or later.
2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Set `NAKAMA_SERVER_KEY` to the Nakama **client server key** for this application. Leave the public host values as they are unless you are pointing at a different Nakama instance.

```
NEXT_PUBLIC_NAKAMA_HOST=api.xoranetwork.com
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_SSL=true
NAKAMA_SERVER_KEY=your_nakama_server_key
```

4. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Routes

- `/` introduction and feature previews
- `/register` create an account
- `/login` sign in without creating an account
- `/forgot-password` recovery UI (backend email workflow is not implemented)
- `/dashboard` protected account home
- `/profile` edit display name, username, and avatar URL
- `/security` connected methods, sign out, delete account, password-change placeholder

Registration calls `authenticateEmail(..., create = true, username)` and rejects the result if Nakama returns an existing account (`session.created === false`). Login calls `authenticateEmail(..., create = false)` so the login form cannot create accounts.

## Production deployment

This site is meant to run on the same Ubuntu host as Nakama (`api.xoranetwork.com`, currently `147.224.245.77`) at **https://account.xoranetwork.com**.

DNS for `account.xoranetwork.com` is not created yet. Add this record where you already manage `api.xoranetwork.com` (Network Solutions / worldnic):

```
Type: A
Name: account
Value: 147.224.245.77
TTL: 300
```

Then, on the Ubuntu server:

```bash
cd ~
git clone https://github.com/aandujar98/xorawebsite.git
cd xorawebsite
grep '^SERVER_KEY=' ~/xora-nakama/.env
# put that value into .env as NAKAMA_SERVER_KEY, for example:
# NAKAMA_SERVER_KEY=the_same_client_key_nakama_uses
printf 'NAKAMA_SERVER_KEY=%s\n' "$(grep '^SERVER_KEY=' ~/xora-nakama/.env | cut -d= -f2-)" > .env
docker compose up -d --build
```

Point the reverse proxy at `127.0.0.1:3000`. If the host uses Caddy, append `deploy/Caddyfile` and reload Caddy. If it uses nginx, install `deploy/nginx-account.xoranetwork.com.conf`, issue a certificate, then reload nginx:

```bash
sudo certbot --nginx -d account.xoranetwork.com
# or, for Caddy, reload after adding the site block — Caddy issues the certificate itself
```

Required production environment variables:

- `SITE_URL=https://account.xoranetwork.com`
- `NEXT_PUBLIC_NAKAMA_HOST`
- `NEXT_PUBLIC_NAKAMA_PORT`
- `NEXT_PUBLIC_NAKAMA_SSL`
- `NAKAMA_SERVER_KEY`

Production cookies are marked `Secure` automatically when `NODE_ENV=production`. TLS certificate verification stays enabled; do not disable it.

In-memory rate limiting is a first layer for a single Node process. Use an external store such as Redis before running multiple instances.

Friends, messaging, netplay invites, cloud saves, sharing, and device linking are preview-only. Password recovery and website password changes are labeled coming soon until an email workflow exists. Email ownership is not claimed as verified.
