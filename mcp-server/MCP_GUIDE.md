# MCP Server Guide for External Agents

## Overview

This document provides complete documentation for external agents to access and use the Alfa MCP (Model Context Protocol) server for accessibility testing.

## Table of Contents

1. [Introduction](#introduction)
2. [MCP Protocol Overview](#mcp-protocol-overview)
3. [Server Access](#server-access)
4. [Authentication](#authentication)
5. [API Endpoints](#api-endpoints)
6. [Available Tools](#available-tools)
7. [Request/Response Formats](#requestresponse-formats)
8. [Code Examples](#code-examples)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Introduction

The Alfa MCP server provides accessibility testing capabilities through a RESTful HTTP API. It implements the Model Context Protocol (MCP) specification, allowing AI assistants and external agents to test web content for accessibility issues.

### What is MCP?

Model Context Protocol (MCP) is a standardized protocol for AI assistants to interact with external tools and services. It uses JSON-RPC 2.0 for communication and supports:

- **Tools** - Executable functions that agents can call
- **Resources** - Data that agents can access
- **Prompts** - Template-based interactions

Our implementation focuses on **Tools** - accessibility testing functions.

---

## MCP Protocol Overview

### Protocol Specification

MCP is built on **JSON-RPC 2.0** protocol with the following characteristics:

- **Transport:** HTTP/HTTPS (our implementation) or stdio (local)
- **Message Format:** JSON
- **Request/Response:** JSON-RPC 2.0 format

### JSON-RPC 2.0 Format

All requests follow JSON-RPC 2.0 specification:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": {}
}
```

**Response format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```

**Error format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

### MCP-Specific Methods

Our HTTP server implements MCP methods as REST endpoints:

- `tools/list` → `GET /tools`
- `tools/call` → `POST /tools/:toolName`

---

## Server Access

### Current Deployment

**Public URL (via Ngrok):**
```
https://7cd71695b854.ngrok-free.app
```

**Local URL:**
```
http://localhost:3001
```

**Note:** The ngrok URL may change on restart. Check ngrok dashboard at http://localhost:4040 for current URL.

### Base URL

Use the appropriate base URL based on your access:

```bash
# For internet access (via ngrok)
BASE_URL="https://7cd71695b854.ngrok-free.app"

# For local access
BASE_URL="http://localhost:3001"
```

---

## Authentication

### API Key Authentication

All tool endpoints require authentication via API key.

**Current API Key:**
```
c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69
```

### Authentication Methods

**Method 1: Authorization Header (Recommended)**
```http
Authorization: Bearer c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69
```

**Method 2: X-API-Key Header**
```http
X-API-Key: c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69
```

### Endpoints Requiring Authentication

- ✅ `GET /tools` - List tools
- ✅ `POST /tools/:toolName` - Call a tool

### Endpoints Without Authentication

- ✅ `GET /health` - Health check

---

## API Endpoints

### 1. Health Check

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "service": "alfa-mcp-server",
  "version": "0.1.0"
}
```

**Example:**
```bash
curl https://7cd71695b854.ngrok-free.app/health
```

### 2. List Tools

**Endpoint:** `GET /tools`

**Authentication:** Required

**Response:**
```json
{
  "tools": [
    {
      "name": "audit_html",
      "description": "Run an accessibility audit on HTML content...",
      "inputSchema": {
        "type": "object",
        "properties": {
          "html": {
            "type": "string",
            "description": "The HTML content to audit"
          },
          "url": {
            "type": "string",
            "description": "Optional URL for context"
          }
        },
        "required": ["html"]
      }
    },
    // ... more tools
  ]
}
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://7cd71695b854.ngrok-free.app/tools
```

### 3. Call Tool

**Endpoint:** `POST /tools/:toolName`

**Authentication:** Required

**Path Parameters:**
- `toolName` - Name of the tool to call (e.g., `audit_html`, `list_rules`)

**Request Body:**
```json
{
  "html": "<html>...</html>",
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "summary": {
    "total": 150,
    "counts": {
      "passed": 120,
      "failed": 20,
      "cantTell": 5,
      "inapplicable": 5
    }
  },
  "outcomes": [
    {
      "outcome": "failed",
      "test": {
        "@id": "https://alfa.siteimprove.com/rules/sia-r1"
      },
      "target": {
        // ... target information
      }
    }
    // ... more outcomes
  ]
}
```

**Example:**
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"html": "<html><body>Test</body></html>"}' \
     https://7cd71695b854.ngrok-free.app/tools/audit_html
```

---

## Available Tools

### 1. audit_html

**Description:** Run an accessibility audit on HTML content.

**Input Schema:**
```json
{
  "html": "string (required) - The HTML content to audit",
  "url": "string (optional) - URL for context, defaults to 'about:blank'"
}
```

**Example Request:**
```json
{
  "html": "<html><head><title>Test Page</title></head><body><img src='photo.jpg'><button>Click me</button></body></html>",
  "url": "https://example.com"
}
```

**Example Response:**
```json
{
  "summary": {
    "total": 45,
    "counts": {
      "passed": 30,
      "failed": 10,
      "cantTell": 3,
      "inapplicable": 2
    }
  },
  "outcomes": [
    {
      "outcome": "failed",
      "test": {
        "@id": "https://alfa.siteimprove.com/rules/sia-r2"
      },
      "target": {
        "type": "element",
        "name": "img"
      },
      "diagnostic": {
        "message": "Image missing alt text"
      }
    }
  ]
}
```

### 2. audit_page

**Description:** Run an accessibility audit on a pre-scraped page (JSON format from alfa-scraper).

**Input Schema:**
```json
{
  "pageJson": "string (required) - JSON string of a scraped page"
}
```

**Example Request:**
```json
{
  "pageJson": "{\"request\": {...}, \"response\": {...}, \"document\": {...}, \"device\": {...}}"
}
```

**Note:** This requires a page scraped using `@siteimprove/alfa-scraper`. See INTEGRATION.md for details.

### 3. filter_outcomes

**Description:** Filter audit outcomes by type or rule ID.

**Input Schema:**
```json
{
  "outcomes": "array (required) - Array of outcome objects to filter",
  "outcomeType": "string (optional) - Filter by type: 'passed', 'failed', 'cantTell', 'inapplicable'",
  "ruleId": "string (optional) - Filter by rule ID (e.g., 'R1', 'sia-r2')"
}
```

**Example Request:**
```json
{
  "outcomes": [...],
  "outcomeType": "failed",
  "ruleId": "sia-r1"
}
```

**Example Response:**
```json
{
  "filtered": [
    {
      "outcome": "failed",
      "test": {
        "@id": "https://alfa.siteimprove.com/rules/sia-r1"
      }
    }
  ],
  "count": 1
}
```

### 4. get_rule_info

**Description:** Get information about a specific accessibility rule.

**Input Schema:**
```json
{
  "ruleId": "string (required) - Rule ID (e.g., 'R1', 'sia-r2', 'sia-r1')"
}
```

**Example Request:**
```json
{
  "ruleId": "sia-r1"
}
```

**Example Response:**
```json
{
  "type": "atomic",
  "uri": "https://alfa.siteimprove.com/rules/sia-r1",
  "requirements": [
    {
      "type": "criterion",
      "uri": "https://www.w3.org/TR/WCAG2/#page-titled",
      "chapter": "2.4.2",
      "title": "Page Titled"
    }
  ],
  "tags": [
    {
      "type": "scope",
      "scope": "page"
    },
    {
      "type": "stability",
      "stability": "stable"
    }
  ]
}
```

### 5. list_rules

**Description:** List all available accessibility rules.

**Input Schema:**
```json
{}
```

**Example Request:**
```json
{}
```

**Example Response:**
```json
{
  "count": 91,
  "rules": [
    {
      "type": "atomic",
      "uri": "https://alfa.siteimprove.com/rules/sia-r1",
      "requirements": [...],
      "tags": [...]
    }
    // ... 90 more rules
  ]
}
```

---

## Request/Response Formats

### Standard Request Format

```http
POST /tools/:toolName HTTP/1.1
Host: your-server.com
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "param1": "value1",
  "param2": "value2"
}
```

### Standard Response Format

**Success:**
```json
{
  "summary": {...},
  "outcomes": [...]
}
```

**Error:**
```json
{
  "error": "Error message",
  "code": 400
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid API key
- `404 Not Found` - Tool not found
- `500 Internal Server Error` - Server error

---

## Code Examples

### Python Client

```python
import requests
import json
from typing import Dict, Any, Optional

class AlfaMCPClient:
    """Client for Alfa MCP Server"""
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Check server health (no auth required)"""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def list_tools(self) -> Dict[str, Any]:
        """List all available tools"""
        response = requests.get(f"{self.base_url}/tools", headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def audit_html(self, html: str, url: Optional[str] = None) -> Dict[str, Any]:
        """Audit HTML content for accessibility issues"""
        response = requests.post(
            f"{self.base_url}/tools/audit_html",
            headers=self.headers,
            json={"html": html, "url": url}
        )
        response.raise_for_status()
        return response.json()
    
    def audit_page(self, page_json: str) -> Dict[str, Any]:
        """Audit a pre-scraped page"""
        response = requests.post(
            f"{self.base_url}/tools/audit_page",
            headers=self.headers,
            json={"pageJson": page_json}
        )
        response.raise_for_status()
        return response.json()
    
    def filter_outcomes(
        self,
        outcomes: list,
        outcome_type: Optional[str] = None,
        rule_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Filter audit outcomes"""
        payload = {"outcomes": outcomes}
        if outcome_type:
            payload["outcomeType"] = outcome_type
        if rule_id:
            payload["ruleId"] = rule_id
        
        response = requests.post(
            f"{self.base_url}/tools/filter_outcomes",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def get_rule_info(self, rule_id: str) -> Dict[str, Any]:
        """Get information about a specific rule"""
        response = requests.post(
            f"{self.base_url}/tools/get_rule_info",
            headers=self.headers,
            json={"ruleId": rule_id}
        )
        response.raise_for_status()
        return response.json()
    
    def list_rules(self) -> Dict[str, Any]:
        """List all available accessibility rules"""
        response = requests.post(
            f"{self.base_url}/tools/list_rules",
            headers=self.headers,
            json={}
        )
        response.raise_for_status()
        return response.json()


# Usage Example
if __name__ == "__main__":
    # Initialize client
    client = AlfaMCPClient(
        base_url="https://7cd71695b854.ngrok-free.app",
        api_key="c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69"
    )
    
    # Health check
    health = client.health_check()
    print(f"Server status: {health['status']}")
    
    # List tools
    tools = client.list_tools()
    print(f"Available tools: {len(tools['tools'])}")
    
    # Audit HTML
    html = "<html><head><title>Test</title></head><body><img src='test.jpg'><button>Click</button></body></html>"
    result = client.audit_html(html, url="https://example.com")
    
    print(f"\nAudit Results:")
    print(f"Total: {result['summary']['total']}")
    print(f"Passed: {result['summary']['counts']['passed']}")
    print(f"Failed: {result['summary']['counts']['failed']}")
    
    # Get failed outcomes
    failed = client.filter_outcomes(
        result['outcomes'],
        outcome_type="failed"
    )
    print(f"\nFailed checks: {failed['count']}")
    
    # Get rule information
    rule_info = client.get_rule_info("sia-r1")
    print(f"\nRule R1: {rule_info.get('requirements', [{}])[0].get('title', 'N/A')}")
```

### JavaScript/TypeScript Client

```typescript
class AlfaMCPClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {
    this.baseUrl = baseUrl.rstrip('/');
  }

  private getHeaders(): HeadersInit {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async listTools(): Promise<{ tools: Array<any> }> {
    const response = await fetch(`${this.baseUrl}/tools`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async auditHTML(html: string, url?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tools/audit_html`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ html, url }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async auditPage(pageJson: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tools/audit_page`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ pageJson }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async filterOutcomes(
    outcomes: any[],
    outcomeType?: string,
    ruleId?: string
  ): Promise<any> {
    const payload: any = { outcomes };
    if (outcomeType) payload.outcomeType = outcomeType;
    if (ruleId) payload.ruleId = ruleId;

    const response = await fetch(`${this.baseUrl}/tools/filter_outcomes`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getRuleInfo(ruleId: string): Promise<any> {
    const response = await fetch(`${this.base_url}/tools/get_rule_info`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ ruleId }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async listRules(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tools/list_rules`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

// Usage
const client = new AlfaMCPClient(
  "https://7cd71695b854.ngrok-free.app",
  "c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69"
);

// Audit HTML
const result = await client.auditHTML(
  "<html><body><div>Test</div></body></html>"
);
console.log(result);
```

### cURL Examples

```bash
#!/bin/bash

# Configuration
BASE_URL="https://7cd71695b854.ngrok-free.app"
API_KEY="c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69"

# Health check
echo "=== Health Check ==="
curl -s "$BASE_URL/health" | jq .

# List tools
echo -e "\n=== List Tools ==="
curl -s -H "Authorization: Bearer $API_KEY" \
     "$BASE_URL/tools" | jq '.tools[] | {name, description}'

# Audit HTML
echo -e "\n=== Audit HTML ==="
curl -s -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "html": "<html><head><title>Test</title></head><body><img src=\"test.jpg\"><button>Click</button></body></html>",
       "url": "https://example.com"
     }' \
     "$BASE_URL/tools/audit_html" | jq '.summary'

# Get rule info
echo -e "\n=== Get Rule Info ==="
curl -s -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"ruleId": "sia-r1"}' \
     "$BASE_URL/tools/get_rule_info" | jq '.requirements[0]'

# List all rules
echo -e "\n=== List All Rules ==="
curl -s -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{}' \
     "$BASE_URL/tools/list_rules" | jq '.count'
```

### Go Client Example

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

type AlfaMCPClient struct {
    BaseURL string
    APIKey  string
}

func NewClient(baseURL, apiKey string) *AlfaMCPClient {
    return &AlfaMCPClient{
        BaseURL: baseURL,
        APIKey:  apiKey,
    }
}

func (c *AlfaMCPClient) makeRequest(method, endpoint string, body interface{}) ([]byte, error) {
    var reqBody io.Reader
    if body != nil {
        jsonData, err := json.Marshal(body)
        if err != nil {
            return nil, err
        }
        reqBody = bytes.NewBuffer(jsonData)
    }

    req, err := http.NewRequest(method, c.BaseURL+endpoint, reqBody)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+c.APIKey)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}

func (c *AlfaMCPClient) AuditHTML(html, url string) (map[string]interface{}, error) {
    body := map[string]interface{}{
        "html": html,
    }
    if url != "" {
        body["url"] = url
    }

    data, err := c.makeRequest("POST", "/tools/audit_html", body)
    if err != nil {
        return nil, err
    }

    var result map[string]interface{}
    json.Unmarshal(data, &result)
    return result, nil
}

// Usage
func main() {
    client := NewClient(
        "https://7cd71695b854.ngrok-free.app",
        "c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69",
    )

    result, err := client.AuditHTML(
        "<html><body><div>Test</div></body></html>",
        "https://example.com",
    )
    if err != nil {
        panic(err)
    }

    fmt.Printf("Result: %+v\n", result)
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message describing what went wrong",
  "code": 400
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify API key is correct |
| 404 | Not Found | Check tool name or endpoint |
| 500 | Internal Server Error | Server issue, retry later |

### Error Handling Example

```python
try:
    result = client.audit_html(html)
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 401:
        print("Authentication failed. Check your API key.")
    elif e.response.status_code == 400:
        print(f"Invalid request: {e.response.json()}")
    else:
        print(f"Error: {e}")
except requests.exceptions.RequestException as e:
    print(f"Network error: {e}")
```

---

## Best Practices

### 1. API Key Security

- ✅ Store API keys in environment variables
- ✅ Never commit keys to version control
- ✅ Rotate keys regularly
- ✅ Use different keys for development/production

```python
import os

api_key = os.getenv("ALFA_API_KEY")
if not api_key:
    raise ValueError("ALFA_API_KEY environment variable not set")
```

### 2. Error Handling

Always handle errors gracefully:

```python
try:
    result = client.audit_html(html)
    # Process result
except Exception as e:
    # Log error
    logger.error(f"Audit failed: {e}")
    # Fallback behavior
    return default_result
```

### 3. Rate Limiting

Respect rate limits (if implemented):

```python
import time

def audit_with_retry(client, html, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.audit_html(html)
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:  # Too Many Requests
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise
    raise Exception("Max retries exceeded")
```

### 4. Caching

Cache results when appropriate:

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_rule_info_cached(client, rule_id):
    return client.get_rule_info(rule_id)
```

### 5. Batch Processing

For multiple audits, process in batches:

```python
def audit_multiple_pages(client, html_pages):
    results = []
    for html in html_pages:
        try:
            result = client.audit_html(html)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})
    return results
```

### 6. Response Validation

Validate responses before processing:

```python
def validate_audit_result(result):
    required_keys = ["summary", "outcomes"]
    for key in required_keys:
        if key not in result:
            raise ValueError(f"Missing key in result: {key}")
    return result
```

---

## MCP Protocol Specification

### JSON-RPC 2.0 Base

MCP uses JSON-RPC 2.0 as its base protocol:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

### MCP Methods

#### tools/list

Lists all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "tool_name",
        "description": "Tool description",
        "inputSchema": {
          "type": "object",
          "properties": {...},
          "required": [...]
        }
      }
    ]
  }
}
```

#### tools/call

Calls a specific tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "audit_html",
    "arguments": {
      "html": "<html>...</html>",
      "url": "https://example.com"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"summary\": {...}, \"outcomes\": [...]}"
      }
    ]
  }
}
```

### HTTP Implementation

Our server implements MCP over HTTP REST:

| MCP Method | HTTP Method | Endpoint |
|------------|-------------|----------|
| `tools/list` | GET | `/tools` |
| `tools/call` | POST | `/tools/:toolName` |

**Note:** The HTTP implementation simplifies the protocol by:
- Using REST endpoints instead of JSON-RPC methods
- Returning JSON directly instead of wrapped in `content` arrays
- Using HTTP status codes for errors

### Full MCP Protocol (Stdio)

For stdio transport (Claude Desktop), the full JSON-RPC format is used:

```json
// Request
{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}

// Response
{"jsonrpc": "2.0", "id": 1, "result": {"tools": [...]}}
```

---

## Outcome Format

### Outcome Structure

Each outcome from an audit contains:

```json
{
  "outcome": "failed" | "passed" | "cantTell" | "inapplicable",
  "test": {
    "@id": "https://alfa.siteimprove.com/rules/sia-r1",
    "@type": ["earl:TestCriterion", "earl:TestCase"]
  },
  "target": {
    "type": "element" | "document" | "text",
    "name": "img",
    "path": "/html[1]/body[1]/img[1]"
  },
  "diagnostic": {
    "message": "Image missing alt text",
    "relatedNodes": [...]
  },
  "mode": "automatic" | "semi-automatic" | "manual"
}
```

### Outcome Types

- **passed** - The rule passed (no issues found)
- **failed** - The rule failed (accessibility issue found)
- **cantTell** - Cannot determine (requires human judgment)
- **inapplicable** - Rule doesn't apply to this target

### Filtering Outcomes

```python
# Get only failed outcomes
failed = [o for o in outcomes if o["outcome"] == "failed"]

# Get outcomes for specific rule
rule_r1 = [o for o in outcomes if "sia-r1" in o["test"]["@id"]]

# Or use the filter_outcomes tool
filtered = client.filter_outcomes(outcomes, outcome_type="failed", rule_id="sia-r1")
```

---

## Rate Limits

Currently, no rate limits are enforced. However, for production:

- Implement client-side rate limiting
- Use exponential backoff on errors
- Cache results when possible
- Batch requests when appropriate

---

## Support and Resources

### Documentation

- `DEPLOYMENT.md` - Deployment guide
- `AUTHENTICATION.md` - Authentication methods
- `README.md` - General documentation

### MCP Specification

- **Official MCP Spec:** https://modelcontextprotocol.io
- **JSON-RPC 2.0:** https://www.jsonrpc.org/specification

### Alfa Resources

- **Alfa Hub:** https://alfa.siteimprove.com
- **Alfa Examples:** https://github.com/Siteimprove/alfa-examples
- **Alfa Rules:** See `list_rules` tool for all available rules

---

## Quick Reference

### Base URL
```
https://7cd71695b854.ngrok-free.app
```

### API Key
```
c236cb5f4d302e6fa929b4d3152508c1ff2e611b1219ab2004a1e884548fdd69
```

### Common Endpoints

```bash
# Health
GET /health

# List tools
GET /tools
Authorization: Bearer <api-key>

# Call tool
POST /tools/:toolName
Authorization: Bearer <api-key>
Content-Type: application/json
Body: {tool arguments}
```

### Available Tools

1. `audit_html` - Audit HTML content
2. `audit_page` - Audit pre-scraped page
3. `filter_outcomes` - Filter results
4. `get_rule_info` - Get rule information
5. `list_rules` - List all rules

---

**Last Updated:** December 2024

