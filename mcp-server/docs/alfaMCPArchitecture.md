# Alfa MCP Server - AWS Architecture

## Overview

The Alfa MCP (Model Context Protocol) Server provides accessibility testing capabilities via a serverless AWS Lambda deployment. It enables AI assistants and external applications to perform WCAG accessibility audits on HTML content.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AWS CLOUD (us-east-1)                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Lambda Function URL                               │  │
│  │   https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws │  │
│  │                                                                        │  │
│  │   • Public HTTPS endpoint                                              │  │
│  │   • API Key authentication (custom header)                             │  │
│  │   • CORS enabled                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     AWS Lambda Function                                │  │
│  │                     "alfa-mcp-server"                                  │  │
│  │                                                                        │  │
│  │   Runtime:      Node.js 20.x                                           │  │
│  │   Memory:       512 MB                                                 │  │
│  │   Timeout:      60 seconds                                             │  │
│  │   Architecture: x86_64                                                 │  │
│  │                                                                        │  │
│  │   ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │   │                    Lambda Handler                                │ │  │
│  │   │                                                                  │ │  │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │ │  │
│  │   │  │ API Key     │  │ MCP Protocol│  │ Alfa Accessibility      │  │ │  │
│  │   │  │ Validation  │─▶│ Handler     │─▶│ Engine (93 WCAG rules)  │  │ │  │
│  │   │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │ │  │
│  │   │                                                                  │ │  │
│  │   │  ┌─────────────────────────────────────────────────────────────┐│ │  │
│  │   │  │ Bundled Dependencies:                                       ││ │  │
│  │   │  │ • @siteimprove/alfa-rules (93 accessibility rules)          ││ │  │
│  │   │  │ • @siteimprove/alfa-act (audit engine)                      ││ │  │
│  │   │  │ • @siteimprove/alfa-dom (DOM manipulation)                  ││ │  │
│  │   │  │ • linkedom (HTML parsing - Lambda compatible)               ││ │  │
│  │   │  └─────────────────────────────────────────────────────────────┘│ │  │
│  │   └─────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         IAM Role                                       │  │
│  │              "alfa-mcp-lambda-role"                                    │  │
│  │                                                                        │  │
│  │   Policies:                                                            │  │
│  │   • AWSLambdaBasicExecutionRole (CloudWatch Logs)                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      CloudWatch Logs                                   │  │
│  │              /aws/lambda/alfa-mcp-server                               │  │
│  │                                                                        │  │
│  │   • Request/response logging                                           │  │
│  │   • Error tracking                                                     │  │
│  │   • Performance metrics                                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## AWS Resources

### Lambda Function

| Property | Value |
|----------|-------|
| Function Name | `alfa-mcp-server` |
| ARN | `arn:aws:lambda:us-east-1:471112624334:function:alfa-mcp-server` |
| Runtime | Node.js 20.x |
| Handler | `index.handler` |
| Memory | 512 MB |
| Timeout | 60 seconds |
| Architecture | x86_64 |
| Package Size | ~1.4 MB (bundled with esbuild) |

### Lambda Function URL

| Property | Value |
|----------|-------|
| URL | `https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws/` |
| Auth Type | NONE (custom API key in code) |
| CORS | Enabled (all origins) |

### IAM Role

| Property | Value |
|----------|-------|
| Role Name | `alfa-mcp-lambda-role` |
| ARN | `arn:aws:iam::471112624334:role/alfa-mcp-lambda-role` |
| Attached Policies | `AWSLambdaBasicExecutionRole` |

### CloudWatch Logs

| Property | Value |
|----------|-------|
| Log Group | `/aws/lambda/alfa-mcp-server` |
| Retention | Default (Never expire) |

## Request Flow

```
1. Client Request
   ├── HTTPS POST to Lambda Function URL
   ├── Headers: Authorization: Bearer <API_KEY>
   └── Body: MCP JSON-RPC request

2. Lambda Function URL
   ├── Receives HTTPS request
   ├── Passes to Lambda handler
   └── Returns response to client

3. Lambda Handler
   ├── Validates API key from headers
   ├── Parses MCP JSON-RPC request
   ├── Routes to appropriate tool handler
   └── Returns MCP JSON-RPC response

4. Tool Execution (e.g., audit_html)
   ├── Parse HTML with linkedom
   ├── Convert to Alfa DOM structure
   ├── Run 93 WCAG accessibility rules
   └── Return audit results

5. Response
   ├── MCP-formatted JSON response
   ├── Summary: passed/failed/cantTell/inapplicable counts
   └── Detailed outcomes for each rule
```

## Security

### Authentication
- Custom API key validation in Lambda code
- API key passed via `Authorization: Bearer <key>` or `X-Api-Key: <key>` header
- Default key: `alfa-mcp-2024-secret-key-f8e9d7c6b5a4`
- Configurable via `API_KEY` environment variable

### Network Security
- HTTPS-only access via Lambda Function URL
- No VPC configuration (public Lambda)
- CORS enabled for browser-based clients

### IAM Permissions
- Lambda has minimal permissions (CloudWatch Logs only)
- Bedrock service has invoke permission for future Agent Core integration

## Scalability

| Aspect | Configuration |
|--------|---------------|
| Concurrency | Default (1000 concurrent executions) |
| Auto-scaling | Automatic (Lambda managed) |
| Cold Start | ~600-800ms (Node.js 20.x) |
| Warm Execution | ~100-500ms depending on HTML size |

## Cost Estimation

| Component | Pricing |
|-----------|---------|
| Lambda Invocations | $0.20 per 1M requests |
| Lambda Duration | $0.0000166667 per GB-second |
| Data Transfer | $0.09 per GB (after 1GB free) |
| CloudWatch Logs | $0.50 per GB ingested |

**Example:** 10,000 audits/month with average 2 second duration:
- Invocations: $0.002
- Duration: 10,000 × 2s × 0.5GB × $0.0000166667 = $0.17
- **Total: ~$0.20/month**

## Deployment Process

### Build
```bash
cd mcp-server
node build-lambda.mjs
```

This creates `lambda-deployment.zip` using esbuild to bundle all dependencies.

### Deploy
```bash
aws lambda update-function-code \
  --function-name alfa-mcp-server \
  --zip-file fileb://lambda-deployment.zip \
  --region us-east-1
```

### Update API Key
```bash
aws lambda update-function-configuration \
  --function-name alfa-mcp-server \
  --environment "Variables={API_KEY=your-new-key}" \
  --region us-east-1
```

## Monitoring

### CloudWatch Metrics
- Invocations
- Duration
- Errors
- Throttles
- ConcurrentExecutions

### CloudWatch Logs
- Request payloads (logged in handler)
- Error stack traces
- Performance timing

### Alarms (Recommended)
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "alfa-mcp-errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=alfa-mcp-server \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Future Enhancements

### Bedrock Agent Core Integration
The Lambda is configured with Bedrock invoke permissions for future Gateway integration:
- Requires JWT/OIDC authentication setup
- Would provide native MCP support in Bedrock Agents

### API Gateway Integration
For additional features:
- Rate limiting
- API key management via AWS
- Usage plans and quotas
- Custom domain names

### VPC Configuration
For enhanced security:
- Private subnet deployment
- NAT Gateway for outbound access
- Security groups for fine-grained control

