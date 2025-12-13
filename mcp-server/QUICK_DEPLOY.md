# Quick Deployment Guide

## TL;DR - Deploy for External Access

### 1. Install HTTP Server Dependencies

```bash
cd mcp-server
yarn install
yarn build
```

### 2. Run HTTP Server Locally

```bash
# Development (no auth)
node dist/http-server.js

# Production (with API key)
API_KEY=your-secret-key-here node dist/http-server.js
```

### 3. Test It

```bash
# Health check
curl http://localhost:3000/health

# List tools (with auth)
curl -H "Authorization: Bearer your-secret-key-here" \
     http://localhost:3000/tools
```

### 4. Deploy to AWS EC2

```bash
# On EC2 instance
git clone your-repo
cd alfa-test
yarn install
cd mcp-server
yarn install
yarn build

# Run with PM2
npm install -g pm2
API_KEY=your-secret-key PORT=3000 pm2 start dist/http-server.js --name alfa-mcp
pm2 save
pm2 startup
```

### 5. External Agent Usage

```python
import requests

API_BASE = "https://your-server.com"
API_KEY = "your-api-key"

headers = {"Authorization": f"Bearer {API_KEY}"}

# Audit HTML
response = requests.post(
    f"{API_BASE}/tools/audit_html",
    headers=headers,
    json={"html": "<html><body>Test</body></html>"}
)
print(response.json())
```

## Authentication

**Current Implementation:** API Key via `Authorization: Bearer <key>` or `X-API-Key: <key>`

**Set via environment variable:**
```bash
export API_KEY=your-secret-key-here
```

**For production:** Use JWT tokens (see AUTHENTICATION.md)

## Full Documentation

- `DEPLOYMENT.md` - Complete deployment guide (AWS, local, etc.)
- `AUTHENTICATION.md` - Authentication methods and setup

