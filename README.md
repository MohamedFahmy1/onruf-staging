# Under Construction

## Environment variables (important for Vercel deploy)

- **`NEXT_PUBLIC_API_URL`**: Base URL for the backend API (used by axios). If missing in Vercel, calls like `/InitiateSession` may hit your Vercel domain instead of your API.
- **`NEXT_PUBLIC_MYFATOORAH_ENV`**: Must match the environment your backend uses to generate MyFatoorah sessions:
  - **`test`**: backend uses demo/test MyFatoorah credentials (embedded script loads from `demo.myfatoorah.com`)
  - **`live`**: backend uses live MyFatoorah credentials (embedded script loads from `portal.myfatoorah.com`)

If these are mismatched (e.g., live script with a test SessionId), MyFatoorah will log **“SessionId is not valid or expired!”** and the embedded card fields will not render.