# Complete Deployment Guide - Alfa MCP Server

## Table of Contents

1. [Overview](#overview)
2. [Architecture Options](#architecture-options)
3. [Local Deployment](#local-deployment)
4. [AWS Deployment](#aws-deployment)
5. [Authentication](#authentication)
6. [External Agent Integration](#external-agent-integration)
7. [Security Best Practices](#security-best-practices)
8. [Production Checklist](#production-checklist)

---

## Overview

The Alfa MCP server can be deployed in two modes:

1. **Stdio Mode** (Current) - For local use with Claude Desktop
   - Uses standard input/output
   - Process-based communication
   - No network access needed

2. **HTTP Mode** (For External Access) - For external integrations
   - RESTful HTTP API
   - Network accessible
   - Requires authentication

This guide covers deploying the **HTTP server** for external agent access.

---

## Architecture Options

### Option 1: HTTP REST API (Recommended) ✅

**Implementation:** `src/http-server.ts`

**Features:**
- ✅ RESTful API endpoints
- ✅ API key authentication
- ✅ CORS support
- ✅ Error handling
- ✅ Health check endpoint

**Endpoints:**
- `GET /health` - Health check (no auth)
- `GET /tools` - List available tools (requires auth)
- `POST /tools/:toolName` - Call a tool (requires auth)

**Best for:**
- External integrations
- Server-to-server communication
- Simple HTTP clients

### Option 2: WebSocket

**Features:**
- Persistent connections
- Real-time bidirectional communication
- Better for streaming responses

**Best for:**
- Real-time applications
- Long-running operations
- Progress updates

### Option 3: Server-Sent Events (SSE)

**Features:**
- One-way streaming from server
- Simpler than WebSocket
- Good for progress updates

**Best for:**
- Progress reporting
- Event streaming

---

## Local Deployment

### Step 1: Install Dependencies

```bash
cd mcp-server
yarn install  # Installs express, cors, and all dependencies
```

### Step 2: Build the HTTP Server

```bash
yarn build
```

This compiles both `index.ts` (stdio) and `http-server.ts` (HTTP).

### Step 3: Generate API Key

Generate a secure API key:

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save this key securely!** You'll need it for client authentication.

### Step 4: Run the HTTP Server

```bash
# With API key authentication
API_KEY=your-generated-api-key-here node dist/http-server.js

# Or set as environment variable
export API_KEY=your-generated-api-key-here
node dist/http-server.js
```

The server will start on port 3000 (or PORT env var).

### Step 5: Expose to Internet with Ngrok (Optional)

If you have ngrok installed, expose your local server to the internet:

```bash
# Start ngrok tunnel
ngrok http 3001

# Or in background
ngrok http 3001 > /tmp/ngrok.log 2>&1 &
```

**Get your public URL:**
```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'])"
```

**Ngrok Dashboard:** http://localhost:4040

**Note:** Free ngrok URLs change on restart. For static URLs, use ngrok paid plan or deploy to AWS.

### Step 6: Test the Server

```bash
# Health check (no auth required)
curl http://localhost:3000/health

# List tools (requires auth)
curl -H "Authorization: Bearer your-api-key-here" \
     http://localhost:3000/tools

# Or with X-API-Key header
curl -H "X-API-Key: your-api-key-here" \
     http://localhost:3000/tools

# Call a tool
curl -X POST \
     -H "Authorization: Bearer your-api-key-here" \
     -H "Content-Type: application/json" \
     -d '{"html": "<html><body><div>Test</div></body></html>"}' \
     http://localhost:3000/tools/audit_html
```

---

## AWS Deployment

### Option A: AWS Lambda + API Gateway (Serverless)

**Best for:** Low to medium traffic, cost-effective

**Cost:** ~$0.20 per 1M requests

#### Setup Steps

1. **Install AWS SAM CLI**
   ```bash
   brew install aws-sam-cli  # macOS
   ```

2. **Create Lambda Handler**
   - Wrap Express app for Lambda
   - Use `@vendia/serverless-express` or similar

3. **Deploy**
   ```bash
   sam build
   sam deploy --guided
   ```

**Pros:**
- Auto-scaling
- Pay per request
- No server management

**Cons:**
- Cold starts
- 15-minute timeout limit
- More complex setup

### Option B: AWS EC2 (Traditional Server) ⭐ Recommended

**Best for:** High traffic, predictable costs, simplicity

**Cost:** ~$30/month for t3.medium

#### Step 1: Launch EC2 Instance

- **OS:** Amazon Linux 2 or Ubuntu 22.04
- **Instance Type:** t3.medium or larger
- **Storage:** 20GB minimum
- **Security Group:** 
  - SSH (22) - Your IP only
  - HTTP (80) - 0.0.0.0/0
  - HTTPS (443) - 0.0.0.0/0

#### Step 2: Install Dependencies

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Node.js 20+
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install Yarn
npm install -g yarn

# Clone repository
git clone https://github.com/your-org/alfa-test.git
cd alfa-test

# Install dependencies
yarn install
cd mcp-server
yarn install
yarn build
```

#### Step 3: Run with PM2

```bash
# Install PM2 (process manager)
npm install -g pm2

# Start server
API_KEY=your-secret-key-here PORT=3000 pm2 start dist/http-server.js --name alfa-mcp

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it prints
```

#### Step 4: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo yum install nginx  # Amazon Linux
# or
sudo apt install nginx  # Ubuntu

# Create configuration
sudo nano /etc/nginx/sites-available/alfa-mcp
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/alfa-mcp /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### Step 5: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx  # Amazon Linux
# or
sudo apt install certbot python3-certbot-nginx  # Ubuntu

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

**Pros:**
- Simple setup
- Full control
- Predictable costs

**Cons:**
- Manual scaling
- Server management required

### Option C: AWS ECS/Fargate (Containers)

**Best for:** Auto-scaling, production workloads, containerized deployments

**Cost:** ~$0.04/vCPU-hour + $0.004/GB-hour

#### Step 1: Create Dockerfile

```dockerfile
# mcp-server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY mcp-server/package.json ./mcp-server/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN yarn build

# Expose port
EXPOSE 3000

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Run HTTP server
CMD ["node", "mcp-server/dist/http-server.js"]
```

#### Step 2: Build and Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name alfa-mcp-server

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t alfa-mcp-server .

# Tag image
docker tag alfa-mcp-server:latest your-account.dkr.ecr.us-east-1.amazonaws.com/alfa-mcp-server:latest

# Push image
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/alfa-mcp-server:latest
```

#### Step 3: Create ECS Task Definition

```json
{
  "family": "alfa-mcp-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "alfa-mcp-server",
    "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/alfa-mcp-server:latest",
    "portMappings": [{
      "containerPort": 3000,
      "protocol": "tcp"
    }],
    "environment": [
      {
        "name": "API_KEY",
        "value": "your-secret-key-here"
      },
      {
        "name": "PORT",
        "value": "3000"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/alfa-mcp-server",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

#### Step 4: Create ECS Service

- Use Application Load Balancer
- Configure health checks
- Set up auto-scaling policies

**Pros:**
- Auto-scaling
- Container orchestration
- High availability

**Cons:**
- More complex setup
- Higher cost for small deployments

---

## Authentication

### Method 1: API Key (Current Implementation) ✅

**Status:** Implemented in `http-server.ts`

#### How It Works

1. **Server:** Set `API_KEY` environment variable
2. **Client:** Send key in request header
3. **Server:** Validates key before processing

#### Client Authentication

**Option 1: Authorization Header (Recommended)**
```bash
Authorization: Bearer your-api-key-here
```

**Option 2: X-API-Key Header**
```bash
X-API-Key: your-api-key-here
```

#### Server Setup

```bash
export API_KEY=your-secret-key-here
node dist/http-server.js
```

#### Security Notes

- ✅ Use strong, random keys (32+ characters)
- ✅ Store keys securely (environment variables, secrets manager)
- ✅ Rotate keys regularly
- ✅ Never commit keys to version control

**Pros:**
- Simple to implement
- Easy for clients
- No external dependencies

**Cons:**
- Key rotation requires coordination
- Less granular permissions

### Method 2: JWT Tokens (Recommended for Production)

See `AUTHENTICATION.md` for complete JWT implementation.

**Pros:**
- Token expiration
- Can include user/client info
- Industry standard
- Can revoke tokens

**Cons:**
- More complex setup
- Requires token storage

### Method 3: OAuth 2.0

See `AUTHENTICATION.md` for OAuth 2.0 implementation.

**Best for:** Enterprise deployments

### Method 4: AWS IAM

**Best for:** AWS-native deployments

See `AUTHENTICATION.md` for AWS IAM setup.

---

## External Agent Integration

### Python Client Example

```python
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
        """List all available tools"""
        response = requests.get(f"{self.base_url}/tools", headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def audit_html(self, html: str, url: str = None):
        """Audit HTML content for accessibility issues"""
        response = requests.post(
            f"{self.base_url}/tools/audit_html",
            headers=self.headers,
            json={"html": html, "url": url}
        )
        response.raise_for_status()
        return response.json()
    
    def get_rule_info(self, rule_id: str):
        """Get information about a specific rule"""
        response = requests.post(
            f"{self.base_url}/tools/get_rule_info",
            headers=self.headers,
            json={"ruleId": rule_id}
        )
        response.raise_for_status()
        return response.json()
    
    def list_rules(self):
        """List all available accessibility rules"""
        response = requests.post(
            f"{self.base_url}/tools/list_rules",
            headers=self.headers,
            json={}
        )
        response.raise_for_status()
        return response.json()

# Usage
client = AlfaMCPClient(
    base_url="http://localhost:3000",  # or your server URL
    api_key=os.getenv("ALFA_API_KEY")
)

# Audit HTML
result = client.audit_html("<html><body><div>Test</div></body></html>")
print(f"Found {result['summary']['counts']['failed']} failures")
```

### JavaScript/TypeScript Client Example

```typescript
class AlfaMCPClient {
  constructor(private baseUrl: string, private apiKey: string) {
    this.baseUrl = baseUrl.rstrip('/');
  }

  private getHeaders() {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async listTools() {
    const response = await fetch(`${this.baseUrl}/tools`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async auditHTML(html: string, url?: string) {
    const response = await fetch(`${this.baseUrl}/tools/audit_html`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ html, url }),
    });
    return response.json();
  }

  async getRuleInfo(ruleId: string) {
    const response = await fetch(`${this.baseUrl}/tools/get_rule_info`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ ruleId }),
    });
    return response.json();
  }
}

// Usage
const client = new AlfaMCPClient(
  "http://localhost:3000",
  process.env.ALFA_API_KEY!
);

const result = await client.auditHTML("<html><body>Test</body></html>");
console.log(result);
```

### cURL Examples

```bash
# Set variables
API_BASE="http://localhost:3000"
API_KEY="your-api-key-here"

# List tools
curl -H "Authorization: Bearer $API_KEY" \
     "$API_BASE/tools"

# Audit HTML
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"html":"<html><body><div>Test</div></body></html>","url":"https://example.com"}' \
     "$API_BASE/tools/audit_html"

# Get rule info
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"ruleId":"R1"}' \
     "$API_BASE/tools/get_rule_info"

# List all rules
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{}' \
     "$API_BASE/tools/list_rules"
```

---

## Security Best Practices

### 1. Use HTTPS

**Always use SSL/TLS in production:**

- Let's Encrypt (free certificates)
- AWS Certificate Manager (for AWS)
- Cloudflare (free SSL)

### 2. Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

app.use("/tools", limiter);
```

### 3. Input Validation

```typescript
import { z } from "zod";

const auditHTMLSchema = z.object({
  html: z.string().max(10 * 1024 * 1024), // 10MB max
  url: z.string().url().optional(),
});

app.post("/tools/audit_html", authenticate, async (req, res) => {
  try {
    const validated = auditHTMLSchema.parse(req.body);
    // ... process request
  } catch (error) {
    return res.status(400).json({ error: "Invalid input" });
  }
});
```

### 4. Logging and Monitoring

- Log all API requests (with IP, timestamp, endpoint)
- Monitor error rates
- Set up alerts for unusual activity
- Use AWS CloudWatch, Datadog, or similar

### 5. Environment Variables

**Never commit secrets:**

```bash
# .env file (add to .gitignore)
API_KEY=your-secret-key-here
PORT=3000
NODE_ENV=production
```

**Use secrets manager in production:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

### 6. Firewall Rules

- Only expose necessary ports
- Restrict SSH access to your IP
- Use security groups (AWS) or firewall rules

---

## Production Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Authentication configured (API key or JWT)
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] Error handling (don't leak secrets)
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Health checks
- [ ] Backup/restore plan
- [ ] Documentation for clients
- [ ] API versioning (if needed)
- [ ] CORS configured properly
- [ ] Environment variables secured
- [ ] Regular security updates

---

## Cost Considerations

### AWS Lambda
- **Cost:** ~$0.20 per 1M requests
- **Best for:** Low/medium traffic
- **Pros:** Auto-scaling, pay per use
- **Cons:** Cold starts, 15-min timeout

### AWS EC2
- **Cost:** ~$30/month for t3.medium
- **Best for:** High traffic, predictable costs
- **Pros:** Full control, simple
- **Cons:** Manual scaling

### AWS ECS/Fargate
- **Cost:** ~$0.04/vCPU-hour + $0.004/GB-hour
- **Best for:** Auto-scaling, production
- **Pros:** Container orchestration
- **Cons:** More complex, higher base cost

---

## Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
lsof -i :3000

# Check Node.js version
node --version  # Should be >= 20.0.0

# Check dependencies
yarn install
yarn build
```

### Authentication Failing

```bash
# Verify API key is set
echo $API_KEY

# Test with curl
curl -v -H "Authorization: Bearer $API_KEY" http://localhost:3000/tools
```

### Connection Refused

- Check firewall rules
- Verify server is running
- Check security groups (AWS)
- Verify port is correct

---

## Ngrok Deployment (Quick Internet Access)

**Best for:** Testing, demos, temporary access

### Setup

1. **Install ngrok** (if not already installed)
   ```bash
   brew install ngrok  # macOS
   # Or download from https://ngrok.com/download
   ```

2. **Start your local server**
   ```bash
   cd mcp-server
   API_KEY=your-api-key PORT=3001 node dist/http-server.js
   ```

3. **Start ngrok tunnel**
   ```bash
   ngrok http 3001
   ```

4. **Get your public URL**
   ```bash
   curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'])"
   ```

### Access Your Server

Your server is now accessible at the ngrok URL from anywhere on the internet!

**Example:**
```bash
# Use the ngrok URL instead of localhost
curl -H "Authorization: Bearer your-api-key" \
     https://your-ngrok-url.ngrok-free.app/tools
```

### Ngrok Dashboard

Access at: http://localhost:4040

- View all requests/responses
- Inspect traffic
- Monitor connections

### Limitations

- ⚠️ Free tier URLs change on restart
- ⚠️ Request limits may apply
- ⚠️ Warning page on first visit (ngrok-free.app)

**For production:** Use AWS deployment (see above)

See `NGROK_SETUP.md` for detailed ngrok instructions.

## Next Steps

1. **Choose deployment option** (Local, Ngrok, EC2, Lambda, or ECS)
2. **Set up authentication** (API key for now, JWT for production)
3. **Deploy** following the guide above
4. **Test** with external clients
5. **Monitor** and optimize

## Additional Resources

- `AUTHENTICATION.md` - Detailed authentication setup
- `QUICK_DEPLOY.md` - Quick reference guide
- `NGROK_SETUP.md` - Ngrok setup and usage
- `README.md` - General documentation

---

## API Endpoints Reference

### Health Check
```
GET /health
No authentication required
```

### List Tools
```
GET /tools
Requires: Authorization: Bearer <api-key>
Returns: Array of available tools
```

### Call Tool
```
POST /tools/:toolName
Requires: Authorization: Bearer <api-key>
Body: JSON with tool arguments
Returns: Tool execution result
```

**Available Tools:**
- `audit_html` - Audit HTML content
- `audit_page` - Audit pre-scraped page
- `filter_outcomes` - Filter audit results
- `get_rule_info` - Get rule information
- `list_rules` - List all rules

---

**Last Updated:** December 2024
