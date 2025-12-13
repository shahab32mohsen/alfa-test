# Alfa MCP Server

This is an MCP (Model Context Protocol) server that wraps Alfa's accessibility testing capabilities, allowing AI assistants to test web pages for accessibility issues.

## Features

The server provides the following tools:

1. **audit_html** - Run an accessibility audit on HTML content
2. **audit_page** - Run an audit on a pre-scraped page (JSON format)
3. **filter_outcomes** - Filter audit results by type or rule
4. **get_rule_info** - Get information about a specific rule
5. **list_rules** - List all available accessibility rules

## Installation

```bash
cd mcp-server
yarn install
yarn build
```

## Usage

### As an MCP Server

Add this to your MCP client configuration (e.g., Claude Desktop's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "alfa": {
      "command": "node",
      "args": ["/path/to/alfa-test/mcp-server/dist/index.js"]
    }
  }
}
```

### Standalone Testing

You can test the server directly:

```bash
# Build first
yarn build

# Run the server
yarn start
```

Then send MCP protocol messages via stdin.

## Example Usage

### Auditing HTML

```json
{
  "method": "tools/call",
  "params": {
    "name": "audit_html",
    "arguments": {
      "html": "<html><body><div>Hello</div></body></html>",
      "url": "https://example.com"
    }
  }
}
```

### Filtering Results

```json
{
  "method": "tools/call",
  "params": {
    "name": "filter_outcomes",
    "arguments": {
      "outcomes": [...],
      "outcomeType": "failed",
      "ruleId": "R1"
    }
  }
}
```

## Integration with alfa-scraper

For full functionality including scraping live URLs, you'll need to integrate with `@siteimprove/alfa-scraper` from the [alfa-integrations](https://github.com/Siteimprove/alfa-integrations) repository.

Here's an example of how to add URL scraping:

```typescript
import { Scraper } from "@siteimprove/alfa-scraper";

// Add a new tool for scraping and auditing URLs
{
  name: "audit_url",
  description: "Scrape a URL and run an accessibility audit",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string" },
    },
    required: ["url"],
  },
}

// In the handler:
Scraper.with(async (scraper) => {
  for (const page of await scraper.scrape(url)) {
    const outcomes = await Audit.of(page, rules).evaluate();
    // ... process outcomes
  }
});
```

## Notes

- The server uses stdio transport for MCP communication
- All results are returned as JSON
- The server requires Node.js >= 20.0.0
- Make sure the Alfa packages are built before running this server

