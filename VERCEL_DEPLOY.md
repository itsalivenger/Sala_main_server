# Deploying Sala_main_server to Vercel

Vercel is primarily for frontend/serverless functions. To host your Express server on Vercel, satisfy the following:

## 1. Project Configuration
Ensure you have a `vercel.json` file in the `Sala_main_server` directory (or the root if you deploy from there) with the following content:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/app.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/app.ts"
    }
  ]
}
```

## 2. Environment Variables
Add these to your Vercel project dashboard:

| Variable | Description |
| :--- | :--- |
| `ALLOWED_ORIGINS` | Comma-separated list of your app URLs (e.g., `https://sala.vercel.app,https://admin-sala.vercel.app`) |
| `MONGODB_URI` | Your production database connection string |
| `JWT_SECRET` | A secure random string for authentication |
| `NODE_ENV` | Set to `production` |

## 3. Deployment Tip
If you are deploying from a monorepo, set the **Root Directory** in Vercel settings to `Sala_main_server`.

## 4. CORS Support
The server is already configured to read from `ALLOWED_ORIGINS`. Remember to include both the production URL AND any staging/preview URLs you want to support.
