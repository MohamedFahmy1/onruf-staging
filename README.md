![OnRuf logo](public/images/Logo2x.png)

# OnRuf Business

OnRuf Business is the merchant dashboard for managing products, orders, customers, and business settings. It supports Arabic with right-to-left layouts by default and English under `/en`.

- Manage product listings, inventory, negotiations, and order fulfillment.
- Browse customers, review ratings and questions, and track sales reports.
- Create coupons, join marketing campaigns, configure shipping, and manage payout accounts.
- Read notifications and open support tickets.

## Run locally

Use Node.js 22 and npm. From the repository root, install the locked dependencies and start the development server.

```sh
npm ci
npm run dev
```

Open [http://localhost:3040](http://localhost:3040). Dashboard features require an OnRuf Business session for the selected environment.

| Command       | Configuration file |
| ------------- | ------------------ |
| `npm run dev` | `.env.dev`         |
| `npm run uat` | `.env.uat`         |

All three commands start the Next.js development server with hot reload on port 3040. The selected file supplies the configuration for that process. Restart the server to switch environments or apply file edits.

Pass a port to the development server with `npm run uat -- --port 3041`.

| Command         | Purpose                               |
| --------------- | ------------------------------------- |
| `npm run lint`  | Run the Next.js lint checks.          |
| `npm run build` | Create an optimized production build. |
| `npm start`     | Serve the production build.           |

## Deployment configuration

Set these variables in the Vercel environment that serves the app.

| Variable                     | Purpose                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`        | Backend API base URL. Axios can send relative requests to the Vercel origin when unset. |
| `NEXT_PUBLIC_MYFATOORAH_ENV` | Payment environment. Use `test` for demo sessions and `live` for production sessions.   |

The MyFatoorah value must match the backend that creates the payment session. A mismatch can prevent the embedded card fields from loading and show “SessionId is not valid or expired!”

## Project structure

The app uses Next.js 12 with the Pages Router, React 18, Redux Toolkit, Material UI, and Bootstrap.

| Path                                           | Contents                                      |
| ---------------------------------------------- | --------------------------------------------- |
| [src/pages](src/pages)                         | Page routes and the shared application shell. |
| [src/modules](src/modules)                     | Feature screens and their components.         |
| [src/appState](src/appState)                   | Redux store and state slices.                 |
| [src/translations.json](src/translations.json) | Arabic and English interface text.            |
| [public](public)                               | Static assets, including images and fonts.    |

## Documentation

- [App routes](documents/app-routes.md) lists routes, titles, and purposes.
- [Edit business account](documents/edit-account.md) covers profile edits and contact verification.
- [Bank accounts and payouts](documents/bank-accounts.md) covers payout account management and verification.
- [API documentation](https://onruf.shop/swagger/index.html) provides service definitions and schemas.
- [Repository instructions](AGENTS.md) covers contribution and publishing conventions.
