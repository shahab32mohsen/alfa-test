# Ngrok Setup - Expose Local Server to Internet

## Status

✅ **Ngrok is running and exposing your local server to the internet!**

## Your Public URL

**HTTPS URL:** `https://7cd71695b854.ngrok-free.app`

This URL is accessible from anywhere on the internet and forwards to your local server on port 3001.

## API Key

```
c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69
```

## Quick Test

```bash
# Set variables
NGROK_URL="https://7cd71695b854.ngrok-free.app"
API_KEY="c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69"

# Health check (no auth)
curl "$NGROK_URL/health"

# List tools (requires auth)
curl -H "Authorization: Bearer $API_KEY" "$NGROK_URL/tools"

# Audit HTML
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"html": "<html><body><div>Test</div></body></html>"}' \
     "$NGROK_URL/tools/audit_html"
```

## Python Client Example

```python
import requests

# Use the ngrok URL
API_BASE = "https://7cd71695b854.ngrok-free.app"
API_KEY = "c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# List tools
response = requests.get(f"{API_BASE}/tools", headers=headers)
print(response.json())

# Audit HTML
response = requests.post(
    f"{API_BASE}/tools/audit_html",
    headers=headers,
    json={"html": "<html><body><div>Test</div></body></html>"}
)
print(response.json())
```

## Ngrok Management

### Check Ngrok Status

```bash
# View ngrok web interface
open http://localhost:4040

# Or check via API
curl http://localhost:4040/api/tunnels
```

### Stop Ngrok

```bash
pkill ngrok
```

### Restart Ngrok

```bash
# Make sure server is running on port 3001 first
cd /Users/shahabmohsen/Desktop/alfa/alfa-test/mcp-server
ngrok http 3001
```

### Get Current URL

```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'])"
```

## Important Notes

### Ngrok Free Tier Limitations

- **URL changes** on each restart (unless you have a paid plan with static domain)
- **Request limits** may apply
- **Warning page** on first visit (ngrok-free.app domains show a warning)

### For Production

Ngrok is great for:
- ✅ Development and testing
- ✅ Demos
- ✅ Temporary access

For production, use:
- AWS EC2 with public IP
- AWS ECS with load balancer
- AWS Lambda + API Gateway
- Other cloud providers

### Security

⚠️ **Important:** Your local server is now accessible from the internet!

- ✅ API key authentication is enabled (required for all requests)
- ⚠️ Make sure your API key is strong and secret
- ⚠️ Consider rate limiting for additional security
- ⚠️ Monitor access logs

## Ngrok Dashboard

Access the ngrok web interface at:
```
http://localhost:4040
```

This shows:
- Request/response logs
- Traffic inspection
- Connection status
- Public URL

## Troubleshooting

### Ngrok Not Starting

```bash
# Check if port 3001 is in use
lsof -i :3001

# Check if ngrok is already running
ps aux | grep ngrok
```

### Can't Access Public URL

1. Check if local server is running: `curl http://localhost:3001/health`
2. Check ngrok status: `curl http://localhost:4040/api/tunnels`
3. Check ngrok logs: `cat /tmp/ngrok.log`

### URL Changed

Ngrok free tier URLs change on restart. To get the new URL:
```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'])"
```

## Next Steps

1. **Test with external client** using the ngrok URL
2. **Share URL** with team members for testing
3. **Monitor traffic** via ngrok dashboard
4. **Deploy to AWS** for permanent solution (see DEPLOYMENT.md)

## Example: External Integration

Now you can use the ngrok URL from anywhere:

```bash
# From any machine on the internet
curl -H "Authorization: Bearer c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69" \
     https://7cd71695b854.ngrok-free.app/tools
```

Your server is now accessible from the internet! 🌐

