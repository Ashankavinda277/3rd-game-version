# Setup Guide: Connect Vercel Frontend to Local Backend

## Step 1: Start Your Local Backend
1. Open a terminal in your backend directory
2. Run: `npm start`
3. Your backend should start on http://localhost:5000

## Step 2: Expose Backend with ngrok (restart PowerShell first)
1. Restart your PowerShell/Command Prompt
2. Run: `ngrok http 5000`
3. Copy the HTTPS URL (something like: https://abc123.ngrok.io)

## Step 3: Update Vercel Environment Variables
Go to your Vercel project dashboard → Settings → Environment Variables:

```
REACT_APP_API_BASE_URL = https://your-ngrok-url.ngrok.io/api
REACT_APP_WS_URL = wss://your-ngrok-url.ngrok.io
```

## Step 4: Update Backend CORS
Add your ngrok URL to the .env file:

```
FRONTEND_URL=http://localhost:3000,https://smart-shooting-gallery-xxx.vercel.app,https://your-ngrok-url.ngrok.io
```

## Step 5: Redeploy Frontend
After updating environment variables in Vercel, trigger a new deployment.

## Alternative: Use a Fixed ngrok Domain
1. Sign up for free ngrok account at https://ngrok.com
2. Get your auth token
3. Run: `ngrok config add-authtoken YOUR_TOKEN`
4. Use: `ngrok http 5000 --domain=your-custom-domain.ngrok-free.app`

This way you get a consistent URL that doesn't change every time.
