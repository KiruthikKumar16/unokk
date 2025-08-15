# 🚀 UNO Game Deployment Guide

## ⚠️ Important: Vercel Limitation

**Vercel does NOT support Socket.IO** because it's a serverless platform that doesn't support persistent WebSocket connections. Your UNO game needs a real server for multiplayer functionality.

## ✅ Recommended Deployment Options

### 1. **Heroku (Recommended - Free Tier Available)**

#### Step 1: Install Heroku CLI
```bash
# Download from: https://devcenter.heroku.com/articles/heroku-cli
```

#### Step 2: Login to Heroku
```bash
heroku login
```

#### Step 3: Create Heroku App
```bash
heroku create your-uno-game-name
```

#### Step 4: Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### Step 5: Open Your App
```bash
heroku open
```

### 2. **Railway (Alternative - Free Tier Available)**

#### Step 1: Go to Railway
Visit [railway.app](https://railway.app) and sign up with GitHub

#### Step 2: Connect Repository
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your UNO repository

#### Step 3: Deploy
Railway will automatically detect your Node.js app and deploy it

#### Step 4: Get Your URL
Railway will provide you with a URL like: `https://your-app-name.railway.app`

### 3. **Render (Alternative - Free Tier Available)**

#### Step 1: Go to Render
Visit [render.com](https://render.com) and sign up

#### Step 2: Create Web Service
- Click "New +"
- Select "Web Service"
- Connect your GitHub repository

#### Step 3: Configure
- **Name**: `uno-game`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

#### Step 4: Deploy
Click "Create Web Service" and wait for deployment

## 🔧 Configuration for Deployment

### Update Client-Side Server URL

After deploying, you need to update the server URL in `public/script.js`:

```javascript
// In connectSocket() method, update this line:
serverUrl = 'https://your-actual-server-url.herokuapp.com';
```

Replace `your-actual-server-url.herokuapp.com` with your actual deployed URL.

### Environment Variables

For production, you might want to set environment variables:

```bash
# Heroku
heroku config:set NODE_ENV=production

# Railway/Render
# Set in their dashboard
```

## 🧪 Testing Your Deployment

1. **Open your deployed URL**
2. **Create a room** and note the room code
3. **Open another browser tab/window** and join the room
4. **Test the full game flow**

## 🐛 Troubleshooting

### "Socket.IO not loaded" Error
- **Cause**: Server not running or wrong URL
- **Solution**: Check your server URL in `public/script.js`

### Connection Timeout
- **Cause**: Server not responding
- **Solution**: Check if your server is running and accessible

### CORS Errors
- **Cause**: Cross-origin requests blocked
- **Solution**: The server is already configured for CORS

## 📱 Mobile Testing

Test your deployed game on mobile devices:
- iOS Safari
- Android Chrome
- Mobile responsiveness should work automatically

## 🔄 Continuous Deployment

Once deployed, every push to your main branch will automatically redeploy:

```bash
git add .
git commit -m "Update game"
git push origin main
# Your server will automatically update
```

## 💰 Cost Considerations

- **Heroku**: Free tier available (sleeps after 30 minutes of inactivity)
- **Railway**: Free tier available (limited hours per month)
- **Render**: Free tier available (sleeps after 15 minutes of inactivity)

For 24/7 availability, consider paid plans or other providers like:
- DigitalOcean
- AWS EC2
- Google Cloud Platform
