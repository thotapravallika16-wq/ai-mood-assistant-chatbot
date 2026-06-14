# Deploy to Railway

This guide will help you deploy the MindEase Mental Health Companion app to Railway for free.

## Prerequisites
- GitHub account (or sign in with email)
- No credit card required for free tier

## Step 1: Push Code to GitHub

1. **Create a GitHub repository:**
   - Go to [github.com/new](https://github.com/new)
   - Create a new repository named `ai-mood-assistant`
   - Choose "Public" so Railway can access it
   - Click "Create repository"

2. **Push your code:**
   ```bash
   cd "c:\Users\thota\OneDrive\Desktop\ai mood assent"
   git init
   git add .
   git commit -m "Initial commit: MindEase mental health companion app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ai-mood-assistant.git
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 2: Deploy on Railway

1. **Go to Railway:**
   - Visit [railway.app](https://railway.app)
   - Click "Login" and sign in with GitHub

2. **Create a New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Find and select your `ai-mood-assistant` repository
   - Click "Deploy"

3. **Configure Environment:**
   - Railway will automatically detect `Procfile` and deploy
   - Wait for the deployment to complete (usually 2-3 minutes)

4. **Get Your Public URL:**
   - Once deployed, go to the "Settings" tab
   - Look for "Domains"
   - Copy the Railway-provided URL (e.g., `https://ai-mood-assistant.up.railway.app`)

## Step 3: Set Up Environment Variables (if using Anthropic API)

1. In Railway project dashboard:
   - Click on the service
   - Go to "Variables"
   - Add `ANTHROPIC_API_KEY` with your Anthropic API key
   - (Optional - app works without it, uses fallback responses)

2. Redeploy after adding variables:
   - Make any small change to your repo or manually trigger redeploy
   - Railway will automatically rebuild and deploy

## Your App is Live! 🎉

Your app is now accessible at the Railway domain from **any location worldwide** - all states/countries can access it.

### Access Points:
- **Main App:** `https://your-railway-url/`
- **Chat API:** `https://your-railway-url/api/chat` (POST requests)

### Example Request:
```bash
curl -X POST https://your-railway-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I am feeling stressed", "history": []}'
```

## Troubleshooting

**App not loading?**
- Check Railway logs: Click service → "Logs" tab
- Ensure all dependencies in `requirements.txt` are correct

**Port errors?**
- Railway automatically sets the PORT variable
- The app.py file is configured to use it

**Cold starts?**
- Free tier may take 30-60 seconds to wake up
- This is normal

## Next Steps

1. Visit your app URL from any device, anywhere
2. Share the link - it's publicly accessible
3. Monitor usage in Railway dashboard
4. Scale up when needed (paid plans start at $5/month)

---

For more help, visit [Railway Docs](https://docs.railway.app)
