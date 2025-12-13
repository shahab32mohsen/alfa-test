# Authentication Guide for Alfa MCP Server

## Overview

This guide covers different authentication methods for securing your Alfa MCP server when deployed for external access.

## Authentication Methods

### 1. API Key (Simple)

**Best for:** Server-to-server communication, simple integrations

#### Setup

```bash
# Set environment variable
export API_KEY=your-secret-key-here

# Or in .env file
API_KEY=your-secret-key-here
```

#### Client Usage

```bash
# Using Authorization header
curl -H "Authorization: Bearer your-secret-key-here" \
     http://your-server.com/tools

# Using X-API-Key header
curl -H "X-API-Key: your-secret-key-here" \
     http://your-server.com/tools
```

#### Implementation

The HTTP server (`http-server.ts`) already includes API key authentication. Just set the `API_KEY` environment variable.

**Pros:**
- Simple to implement
- Easy for clients
- No external dependencies

**Cons:**
- Key rotation requires coordination
- Less granular permissions
- Keys can be leaked

### 2. JWT Tokens (Recommended)

**Best for:** Production deployments, multiple clients, token expiration

#### Setup

```bash
yarn add jsonwebtoken
yarn add -D @types/jsonwebtoken
```

#### Server Implementation

```typescript
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Generate token endpoint (for token issuance)
app.post("/auth/token", async (req, res) => {
  const { clientId, clientSecret } = req.body;
  
  // Validate client credentials (check against database)
  if (!validateClient(clientId, clientSecret)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  const token = jwt.sign(
    { clientId, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  res.json({ token, expiresIn: JWT_EXPIRES_IN });
});

// Authentication middleware
function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { clientId: string };
    req.user = decoded; // Attach to request
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Use middleware
app.use("/tools", authenticateJWT);
```

#### Client Usage

```typescript
// 1. Get token
const tokenResponse = await fetch("https://your-server.com/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clientId: "your-client-id",
    clientSecret: "your-client-secret",
  }),
});

const { token } = await tokenResponse.json();

// 2. Use token for API calls
const apiResponse = await fetch("https://your-server.com/tools", {
  headers: {
    "Authorization": `Bearer ${token}`,
  },
});
```

**Pros:**
- Token expiration
- Can include user/client info
- Industry standard
- Can revoke tokens

**Cons:**
- More complex setup
- Requires token storage
- Need token refresh logic

### 3. OAuth 2.0 Client Credentials Flow

**Best for:** Enterprise deployments, multiple services

#### Setup

```bash
yarn add oauth2-server
```

#### Implementation

```typescript
import { Request as OAuthRequest, Response as OAuthResponse } from "oauth2-server";
import OAuth2Server from "oauth2-server";

const oauth = new OAuth2Server({
  model: {
    // Implement these methods
    getClient: async (clientId, clientSecret) => {
      // Look up client in database
      return { clientId, clientSecret, grants: ["client_credentials"] };
    },
    saveToken: async (token, client, user) => {
      // Save token to database
      return token;
    },
    getAccessToken: async (accessToken) => {
      // Retrieve token from database
      return { accessToken, client: {}, user: {} };
    },
  },
});

// Token endpoint
app.post("/oauth/token", async (req, res) => {
  const request = new OAuthRequest(req);
  const response = new OAuthResponse(res);
  
  try {
    const token = await oauth.token(request, response);
    res.json(token);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authenticate middleware
async function authenticateOAuth(req: Request, res: Response, next: NextFunction) {
  const request = new OAuthRequest(req);
  const response = new OAuthResponse(res);
  
  try {
    const token = await oauth.authenticate(request, response);
    req.user = token;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}
```

**Pros:**
- Industry standard
- Flexible scopes
- Well-documented
- Supports refresh tokens

**Cons:**
- Complex implementation
- Requires database
- More overhead

### 4. AWS IAM (AWS Deployments Only)

**Best for:** AWS-native deployments, integration with AWS services

#### API Gateway with IAM

```typescript
// Lambda authorizer
export const authorizer = async (event: any) => {
  // Verify IAM signature
  // Check permissions
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Action: "execute-api:Invoke",
        Resource: event.methodArn,
      }],
    },
  };
};
```

#### Client Usage (AWS SDK)

```typescript
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";

const signer = new SignatureV4({
  credentials: {
    accessKeyId: "AKIA...",
    secretAccessKey: "...",
  },
  region: "us-east-1",
  service: "execute-api",
  sha256: Sha256,
});

const signedRequest = await signer.sign({
  method: "GET",
  hostname: "api-id.execute-api.us-east-1.amazonaws.com",
  path: "/tools",
  headers: {},
});
```

**Pros:**
- Native AWS integration
- Fine-grained permissions
- No custom auth code

**Cons:**
- AWS-specific
- Complex client setup
- Requires AWS credentials

## Comparison Table

| Method | Complexity | Security | Scalability | Best For |
|--------|-----------|----------|-------------|----------|
| API Key | Low | Medium | High | Simple integrations |
| JWT | Medium | High | High | Production, multiple clients |
| OAuth 2.0 | High | Very High | Very High | Enterprise |
| AWS IAM | Medium | Very High | Very High | AWS deployments |

## Recommendations

### For Development
- Use API key (simple, quick setup)

### For Production (Small Scale)
- Use JWT tokens (good balance of security and simplicity)

### For Production (Enterprise)
- Use OAuth 2.0 (most flexible, industry standard)

### For AWS Deployments
- Use AWS IAM with API Gateway (native integration)

## Security Best Practices

1. **Never commit secrets** - Use environment variables or secrets manager
2. **Use HTTPS** - Always encrypt in transit
3. **Rotate keys/tokens** - Regular rotation schedule
4. **Rate limiting** - Prevent abuse
5. **Logging** - Audit all authentication attempts
6. **Token expiration** - Set reasonable expiration times
7. **Scope permissions** - Limit what each client can do

## Environment Variables

```bash
# API Key method
API_KEY=your-secret-key

# JWT method
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=24h

# OAuth method
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_ACCESS_TOKEN_LIFETIME=3600

# AWS IAM (handled by AWS)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Example: Complete JWT Implementation

See `src/http-server-jwt.ts` for a complete JWT-based implementation example.

## Next Steps

1. Choose authentication method based on your needs
2. Implement authentication middleware
3. Set up token/key management
4. Test with external clients
5. Monitor authentication failures
6. Document for API consumers

