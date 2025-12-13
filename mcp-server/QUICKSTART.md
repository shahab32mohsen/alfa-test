# Quick Start Guide: Alfa MCP Server

## What is This?

This is an MCP (Model Context Protocol) server that wraps Alfa's accessibility testing engine, allowing AI assistants like Claude to test web pages for accessibility issues.

## Quick Setup

1. **Install dependencies:**
   ```bash
   cd mcp-server
   yarn install
   ```

2. **Build the server:**
   ```bash
   yarn build
   ```

3. **Test it:**
   ```bash
   yarn start
   ```

## Available Tools

### 1. `audit_html`
Audit HTML content directly (basic implementation - see INTEGRATION.md for enhanced version)

### 2. `audit_page`
Audit a pre-scraped page (JSON format from alfa-scraper)

### 3. `filter_outcomes`
Filter audit results by type or rule ID

### 4. `get_rule_info`
Get information about a specific accessibility rule

### 5. `list_rules`
List all available accessibility rules

## Example Usage

### Using with Claude Desktop

1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "alfa": {
      "command": "node",
      "args": ["/absolute/path/to/alfa-test/mcp-server/dist/index.js"]
    }
  }
}
```

2. Restart Claude Desktop

3. Ask Claude: "Can you audit this HTML for accessibility issues: `<html>...</html>`"

### Using Programmatically

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Connect to server
const transport = new StdioClientTransport({
  command: "node",
  args: ["/path/to/mcp-server/dist/index.js"],
});

const client = new Client({
  name: "test-client",
  version: "1.0.0",
}, {
  capabilities: {},
});

await client.connect(transport);

// Audit HTML
const result = await client.callTool({
  name: "audit_html",
  arguments: {
    html: "<html><body><div>Hello</div></body></html>",
    url: "https://example.com",
  },
});

console.log(JSON.parse(result.content[0].text));
```

## Next Steps

- See `INTEGRATION.md` for adding URL scraping support
- See `README.md` for detailed documentation
- Check the Alfa examples repository for more use cases

