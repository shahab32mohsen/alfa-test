# Deployment Summary - External Integration

## Answer to Your Questions

### 1. What Should You Do?

#### Option A: Local Server Deployment

**Steps:**
1. Install HTTP dependencies: `yarn add express cors`
2. Build: `yarn build`
3. Run: `API_KEY=your-key node dist/http-server.js`
4. Access: `http://localhost:3000`

**Pros:**
- Quick setup
- Good for development/testing
- No cloud costs

**Cons:**
- Requires your machine to be running
- Need to handle port forwarding for external access
- No automatic scaling

#### Option B: AWS Deployment (Recommended)

**Three AWS Options:**

1. **AWS Lambda + API Gateway** (Serverless)
   - Best for: Low/medium traffic, cost-effective
   - Cost: ~$0.20 per 1M requests
   - Setup: Use SAM or Serverless Framework

2. **AWS EC2** (Traditional Server)
   - Best for: High traffic, predictable costs
   - Cost: ~$30/month for t3.medium
   - Setup: Install Node.js, run with PM2, use Nginx

3. **AWS ECS/Fargate** (Containers)
   - Best for: Auto-scaling, production workloads
   - Cost: ~$0.04/vCPU-hour
   - Setup: Docker container, ECS service

**Recommended:** Start with EC2 for simplicity, move to ECS if you need scaling.

### 2. How Does Authentication Work?

#### Current Implementation: API Key

**How it works:**
1. Set `API_KEY` environment variable on server
2. Clients send key in request header
3. Server validates key before processing

**Client sends:**
```bash
Authorization: Bearer your-api-key-here
# OR
X-API-Key: your-api-key-here
```

**Server validates:**
- Checks if API_KEY env var is set
- Compares client's key with server's key
- Allows/denies request

#### Authentication Methods Available

1. **API Key** (Current - Simple)
   - ✅ Implemented in `http-server.ts`
   - ✅ Set `API_KEY` env var
   - ✅ Clients use `Authorization: Bearer <key>`

2. **JWT Tokens** (Recommended for Production)
   - More secure
   - Token expiration
   - See `AUTHENTICATION.md` for implementation

3. **OAuth 2.0** (Enterprise)
   - Industry standard
   - Most flexible
   - See `AUTHENTICATION.md`

4. **AWS IAM** (AWS Only)
   - Native AWS integration
   - For AWS deployments

## Quick Start: Deploy to AWS EC2

### Step 1: Launch EC2 Instance

```bash
# Use Amazon Linux 2 or Ubuntu
# Instance: t3.medium or larger
# Security Group: Allow HTTP (80), HTTPS (443), SSH (22)
```

### Step 2: Setup on EC2

```bash
# SSH into instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Clone repo
git clone https://github.com/your-org/alfa-test.git
cd alfa-test

# Install dependencies
yarn install
cd mcp-server
yarn install
yarn build
```

### Step 3: Run Server

```bash
# Install PM2
npm install -g pm2

# Start server with API key
API_KEY=your-secret-key-here PORT=3000 pm2 start dist/http-server.js --name alfa-mcp

# Make it start on boot
pm2 save
pm2 startup
```

### Step 4: Setup Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo yum install nginx  # Amazon Linux
# or
sudo apt install nginx  # Ubuntu

# Configure
sudo nano /etc/nginx/sites-available/alfa-mcp
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable and start
sudo ln -s /etc/nginx/sites-available/alfa-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Setup SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com
```

## External Agent Authentication

### How External Agents Authenticate

**Method 1: API Key (Current)**

```python
import requests

API_BASE = "https://your-server.com"
API_KEY = "your-api-key-here"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Make request
response = requests.post(
    f"{API_BASE}/tools/audit_html",
    headers=headers,
    json={"html": "<html><body>Test</body></html>"}
)
```

**Method 2: JWT Token (Production)**

```python
# 1. Get token
token_response = requests.post(
    "https://your-server.com/auth/token",
    json={
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret"
    }
)
token = token_response.json()["token"]

# 2. Use token
headers = {"Authorization": f"Bearer {token}"}
response = requests.post(
    f"{API_BASE}/tools/audit_html",
    headers=headers,
    json={"html": "<html><body>Test</body></html>"}
)
```

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] API key set via environment variable
- [ ] API key is strong (32+ characters, random)
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] Error handling (don't leak secrets)
- [ ] Logging (audit trail)
- [ ] Firewall rules (only necessary ports)
- [ ] Regular security updates

## Files Created

1. **`src/http-server.ts`** - HTTP REST API server with API key auth
2. **`DEPLOYMENT.md`** - Complete deployment guide
3. **`AUTHENTICATION.md`** - Authentication methods guide
4. **`QUICK_DEPLOY.md`** - Quick reference

## Next Steps

1. **Choose deployment option** (Local, EC2, Lambda, ECS)
2. **Set up authentication** (API key for now, JWT for production)
3. **Deploy** following the guide
4. **Test** with external clients
5. **Monitor** and optimize

## Example: Complete External Integration

```python
# client.py
import requests
import os

class AlfaMCPClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def list_tools(self):
        response = requests.get(f"{self.base_url}/tools", headers=self.headers)
        return response.json()
    
    def audit_html(self, html: str, url: str = None):
        response = requests.post(
            f"{self.base_url}/tools/audit_html",
            headers=self.headers,
            json={"html": html, "url": url}
        )
        return response.json()
    
    def get_rule_info(self, rule_id: str):
        response = requests.post(
            f"{self.base_url}/tools/get_rule_info",
            headers=self.headers,
            json={"ruleId": rule_id}
        )
        return response.json()

# Usage
client = AlfaMCPClient(
    base_url="https://your-server.com",
    api_key=os.getenv("ALFA_API_KEY")
)

# Audit HTML
result = client.audit_html("<html><body><div>Test</div></body></html>")
print(f"Found {result['summary']['counts']['failed']} failures")
```

## Summary

**To deploy for external access:**
1. Use `http-server.ts` (HTTP REST API)
2. Set `API_KEY` environment variable
3. Deploy to AWS EC2 (easiest) or Lambda/ECS
4. External agents authenticate with `Authorization: Bearer <key>`
5. Use HTTPS in production

**For production:**
- Upgrade to JWT tokens (see AUTHENTICATION.md)
- Add rate limiting
- Enable monitoring
- Use AWS Secrets Manager for keys

See `DEPLOYMENT.md` and `AUTHENTICATION.md` for detailed guides!

