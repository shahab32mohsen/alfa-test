# Alfa MCP Server - Access Guide

## Quick Start

### Endpoint URL
```
https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws/
```

### API Key
```
alfa-mcp-2024-secret-key-f8e9d7c6b5a4
```

---

## Authentication

All requests must include the API key in one of these headers:

**Option 1: Authorization Header (Recommended)**
```
Authorization: Bearer alfa-mcp-2024-secret-key-f8e9d7c6b5a4
```

**Option 2: X-Api-Key Header**
```
X-Api-Key: alfa-mcp-2024-secret-key-f8e9d7c6b5a4
```

### Unauthorized Response
If the API key is missing or invalid:
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32001,
    "message": "Unauthorized: Invalid or missing API key. Use 'Authorization: Bearer <key>' or 'X-Api-Key: <key>' header."
  }
}
```

---

## MCP Protocol

The server implements the Model Context Protocol (MCP) using JSON-RPC 2.0.

### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "<method_name>",
  "params": { ... }
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

---

## Available Methods

### 1. `initialize`
Initialize the MCP connection and get server capabilities.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": {
      "name": "alfa-accessibility-server",
      "version": "0.1.0"
    }
  }
}
```

---

### 2. `tools/list`
List all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "audit_html",
        "description": "Run an accessibility audit on HTML content.",
        "inputSchema": { ... }
      },
      {
        "name": "audit_page",
        "description": "Run an accessibility audit on a Page object.",
        "inputSchema": { ... }
      },
      {
        "name": "get_rule_info",
        "description": "Get information about a specific accessibility rule.",
        "inputSchema": { ... }
      },
      {
        "name": "list_rules",
        "description": "List all available accessibility rules.",
        "inputSchema": { ... }
      }
    ]
  }
}
```

---

### 3. `tools/call`
Execute a specific tool.

**Request Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { ... }
  }
}
```

---

## Available Tools

### Tool: `audit_html`

Run a WCAG accessibility audit on HTML content.

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `html` | string | Yes | The HTML content to audit |
| `url` | string | No | URL for context (default: "about:blank") |

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "audit_html",
    "arguments": {
      "html": "<!DOCTYPE html><html lang='en'><head><title>Test</title></head><body><img src='photo.jpg'><a href='#'></a></body></html>",
      "url": "https://example.com"
    }
  }
}
```

**Example Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"summary\":{\"total\":93,\"counts\":{\"passed\":8,\"failed\":4,\"cantTell\":1,\"inapplicable\":80}},\"outcomes\":[...]}"
    }]
  }
}
```

**Audit Result Structure:**
```json
{
  "summary": {
    "total": 93,
    "counts": {
      "passed": 8,
      "failed": 4,
      "cantTell": 1,
      "inapplicable": 80
    }
  },
  "outcomes": [
    {
      "outcome": "failed",
      "rule": {
        "type": "atomic",
        "uri": "https://alfa.siteimprove.com/rules/sia-r2",
        "requirements": [...]
      },
      "target": { ... },
      "mode": "automatic"
    }
  ]
}
```

---

### Tool: `audit_page`

Run an audit on a pre-scraped page in JSON format.

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pageJson` | string | Yes | JSON string of a scraped page |

---

### Tool: `get_rule_info`

Get detailed information about a specific accessibility rule.

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ruleId` | string | Yes | Rule ID (e.g., "R1", "R2", "sia-r1") |

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_rule_info",
    "arguments": {
      "ruleId": "R2"
    }
  }
}
```

---

### Tool: `list_rules`

List all 93 available WCAG accessibility rules.

**Arguments:** None

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_rules",
    "arguments": {}
  }
}
```

---

## Usage Examples

### cURL

**Initialize Connection:**
```bash
curl -X POST "https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer alfa-mcp-2024-secret-key-f8e9d7c6b5a4" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

**Run Accessibility Audit:**
```bash
curl -X POST "https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer alfa-mcp-2024-secret-key-f8e9d7c6b5a4" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"audit_html",
      "arguments":{
        "html":"<!DOCTYPE html><html lang=\"en\"><head><title>Test</title></head><body><img src=\"test.jpg\"><a href=\"#\"></a><button></button></body></html>",
        "url":"https://example.com"
      }
    }
  }'
```

---

### Python

```python
import requests
import json

MCP_URL = "https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws/"
API_KEY = "alfa-mcp-2024-secret-key-f8e9d7c6b5a4"

def call_mcp(method: str, params: dict = None, request_id: int = 1):
    """Make an MCP request to the Alfa server."""
    response = requests.post(
        MCP_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        },
        json={
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params or {}
        }
    )
    return response.json()

def audit_html(html: str, url: str = "https://example.com"):
    """Run an accessibility audit on HTML content."""
    result = call_mcp("tools/call", {
        "name": "audit_html",
        "arguments": {"html": html, "url": url}
    })
    
    # Parse the nested result
    content = result["result"]["content"][0]["text"]
    return json.loads(content)

# Example usage
html = """
<!DOCTYPE html>
<html lang="en">
<head><title>My Page</title></head>
<body>
    <img src="photo.jpg">
    <a href="#"></a>
    <button></button>
</body>
</html>
"""

# Run audit
audit_result = audit_html(html)

# Print summary
print(f"Total Rules: {audit_result['summary']['total']}")
print(f"Passed: {audit_result['summary']['counts']['passed']}")
print(f"Failed: {audit_result['summary']['counts']['failed']}")
print(f"Can't Tell: {audit_result['summary']['counts']['cantTell']}")
print(f"Inapplicable: {audit_result['summary']['counts']['inapplicable']}")

# Print failed rules
for outcome in audit_result['outcomes']:
    if outcome['outcome'] == 'failed':
        print(f"\n❌ Failed: {outcome['rule']['uri']}")
```

---

### JavaScript/Node.js

```javascript
const MCP_URL = "https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws/";
const API_KEY = "alfa-mcp-2024-secret-key-f8e9d7c6b5a4";

async function callMCP(method, params = {}) {
  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });
  return response.json();
}

async function auditHTML(html, url = "https://example.com") {
  const result = await callMCP("tools/call", {
    name: "audit_html",
    arguments: { html, url }
  });
  
  const content = result.result.content[0].text;
  return JSON.parse(content);
}

// Example usage
const html = `
<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
  <img src="photo.jpg">
  <a href="#"></a>
</body>
</html>
`;

auditHTML(html).then(result => {
  console.log("Summary:", result.summary);
  
  // Find failed rules
  const failed = result.outcomes.filter(o => o.outcome === "failed");
  console.log(`\nFailed rules (${failed.length}):`);
  failed.forEach(f => console.log(`  - ${f.rule.uri}`));
});
```

---

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const (
    MCPURL = "https://xtkrntrqmtvbrbiiv2x6t6t5zy0yoauw.lambda-url.us-east-1.on.aws/"
    APIKey = "alfa-mcp-2024-secret-key-f8e9d7c6b5a4"
)

type MCPRequest struct {
    JSONRPC string      `json:"jsonrpc"`
    ID      int         `json:"id"`
    Method  string      `json:"method"`
    Params  interface{} `json:"params"`
}

func callMCP(method string, params interface{}) (map[string]interface{}, error) {
    reqBody, _ := json.Marshal(MCPRequest{
        JSONRPC: "2.0",
        ID:      1,
        Method:  method,
        Params:  params,
    })

    req, _ := http.NewRequest("POST", MCPURL, bytes.NewBuffer(reqBody))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+APIKey)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    var result map[string]interface{}
    json.Unmarshal(body, &result)
    return result, nil
}

func main() {
    html := `<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><img src="test.jpg"></body></html>`
    
    result, _ := callMCP("tools/call", map[string]interface{}{
        "name": "audit_html",
        "arguments": map[string]string{
            "html": html,
            "url":  "https://example.com",
        },
    })
    
    fmt.Printf("Result: %+v\n", result)
}
```

---

## Common Accessibility Issues Detected

| Rule | Description |
|------|-------------|
| sia-r2 | Images must have alternative text |
| sia-r10 | Links must have discernible text |
| sia-r12 | Buttons must have accessible names |
| sia-r1 | Pages must have a title |
| sia-r3 | HTML must have a lang attribute |
| sia-r13 | Form inputs must have labels |

For a complete list, use the `list_rules` tool.

---

## Error Handling

### Error Response Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Error description"
  }
}
```

### Common Error Codes
| Code | Meaning |
|------|---------|
| -32001 | Unauthorized (invalid API key) |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32700 | Parse error |
| -32000 | Server error |

---

## Rate Limits

The Lambda function has default AWS limits:
- **Concurrent Executions:** 1000
- **Burst Limit:** 500-3000 (varies by region)
- **Payload Size:** 6 MB (request/response)

For higher limits, contact AWS support or implement API Gateway with usage plans.

---

## Support

- **GitHub Repository:** https://github.com/shahab32mohsen/alfa-test
- **Alfa Documentation:** https://alfa.siteimprove.com
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

