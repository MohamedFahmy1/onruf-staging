# Under Construction

## Run locally with an environment file

| Command        | Configuration file |
| -------------- | ------------------ |
| `npm run dev`  | `.env.dev`         |
| `npm run uat`  | `.env.uat`         |
| `npm run prod` | `.env.production`  |

Each command starts the Next.js development server with hot reload at
`http://localhost:3040`. Stop the running server before switching environments.
Restart the server after editing an environment file.
The selected configuration is loaded for that process without modifying `.env`
or any of the environment files. Next.js's other `.env` files are skipped.

You can use another port, for example `npm run uat -- --port 3041`.
`npm run prod` selects the production configuration for local development;
use `npm run build` followed by `npm start` for an optimized production build.

## Environment variables (important for Vercel deploy)

- **`NEXT_PUBLIC_API_URL`**: Base URL for the backend API (used by axios). If missing in Vercel, calls like `/InitiateSession` may hit your Vercel domain instead of your API.
- **`NEXT_PUBLIC_MYFATOORAH_ENV`**: Must match the environment your backend uses to generate MyFatoorah sessions:
  - **`test`**: backend uses demo/test MyFatoorah credentials (embedded script loads from `demo.myfatoorah.com`)
  - **`live`**: backend uses live MyFatoorah credentials (embedded script loads from `portal.myfatoorah.com`)

If these are mismatched (e.g., live script with a test SessionId), MyFatoorah will log **“SessionId is not valid or expired!”** and the embedded card fields will not render.
