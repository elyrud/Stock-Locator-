# BEC TECH Stock Locator

A staff-only prototype for locating engineering and computing components, with a shared inventory, component suggestions and clickable shelf photographs.

## Run locally

Use Node.js 24 or later. No package installation is needed.

```powershell
npm start
```

On this Windows computer you can also run the launcher. It uses Node.js if installed, otherwise VS Code's bundled runtime:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

Open http://localhost:3000/login.html. On the first visit, create your own administrator account with a password of at least 12 characters. There are no default accounts or passwords. Initial setup is restricted to the local computer and closes after the administrator is created.

Use this server instead of the IDE's static preview. A static preview, GitHub Pages or directly opening HTML files does not enforce staff authentication.

Stop the launcher-managed server with `powershell -ExecutionPolicy Bypass -File .\stop-local.ps1`. If started with `npm start`, press Ctrl+C in that terminal.

## Invite colleagues

After signing in, select **Staff accounts**. Enter a colleague's email and create an invitation. Share the private link directly with that colleague; the app does not send email. Links expire after 24 hours and can be used once. Creating another link for the same email invalidates the previous one.

Colleagues choose their own passwords. Administrators can create password reset links and disable accounts. Resetting a password or disabling an account revokes its existing sessions. There is no public registration. Administrator setup should be completed before hosting the app.

Localhost links work only on this computer. Hosting is still needed before remote colleagues can use these links.

## Shared stock

The server seeds the shared database with 104 entries (C001-C104) from `inventory.js`. Blank quantities stay unrecorded; the initial Known units total is 106 across seven counted entries. New products, edits and deletions are saved for all staff. A version check rejects stale saves when another colleague has edited the list, so changes are not silently overwritten. Refresh or return to the page to retrieve current stock.

Previous browser-only inventory changes are not automatically copied into the database. Existing localStorage data is left untouched. Preserve any browser-only edits before retiring the old preview. Shelf photos and labels remain in the source files.

The database is `data/stock.sqlite`, with SQLite journal files alongside it. The `data` directory is ignored by Git. For a simple backup, stop the server and back up the entire directory. Keep it private: it contains inventory, password hashes, invitations and sessions. Never delete it to reset a running shared site.

## Pages and map

- `index.html`: Find stock.
- `product-inventory.html`: full editable inventory.
- `describe-component.html`: keyword and synonym suggestions from current shared stock.
- `shop-floor-map.html`: shelf images and numbered hoverable pins.
- `staff.html`: administrator-only account management.

`component-finder.js` contains matching rules; no AI service or subscription is needed. Suggestions do not verify electrical compatibility.

`shop-map.js` holds the map positions, photo paths, optional rack assignments and pin contents. Shelf 2 is arranged as 2A/2B on top and 2C/2D below. Shelf 3 has 3A-3C above 3D-3F. Shelf 4 has 4A/4B. Sections without photos show placeholders. Map area names are not assumed to correspond to the inventory rack names until confirmed.

## Hosting later

This implementation is prepared for a single Node.js server with a persistent SQLite disk. It has not been deployed. GitHub Pages cannot run this server.

1. Create the first administrator locally.
2. Choose a Node.js host with HTTPS and persistent storage.
3. Transfer the private database securely to the persistent disk; keep a backup.
4. Configure `APP_ORIGIN` to the exact HTTPS origin (without a trailing slash), `HOST=0.0.0.0`, `PORT` as required by the host, and `DATA_DIR` to the persistent directory. `.env.example` documents these values; the server reads actual environment variables, not `.env` files automatically.
5. Route HTTPS traffic to this server and use a single server process. Do not expose the source directory through a separate static web server.
6. Create new invitation links using the hosted address.

Authentication is enforced before serving pages, scripts and stock photos. Only the login files, shared CSS and university logo are public. Sessions use HttpOnly, SameSite cookies (Secure on HTTPS), expire after eight hours, and have CSRF protection. Passwords use salted scrypt hashes; invitation and session tokens are hashed in the database. Login and account acceptance attempts are rate-limited.

If source files or photographs are in a public GitHub repository, a website login cannot make those public copies private. Use a private repository when the source inventory/photos must be staff-only. Access controls protect new server requests; they cannot revoke files someone already downloaded.

## Checks

```powershell
npm test
```

`server.test.cjs` tests protected pages/photos, first-admin setup, login, invitation reuse, password resets, account disabling, session expiry, CSRF and origin rejection, rate limiting, shared inventory persistence, stale-save conflicts, validation and the four frontend pages against the actual API. Tests use a temporary database and do not alter staff accounts or live stock. `run-server-tests.cjs` provides a result-file runner for Windows runtimes without console output.