# Enhanced Integration Guide

## Adding URL Scraping Support

To add full URL scraping support, you'll need to integrate with `@siteimprove/alfa-scraper` from the [alfa-integrations](https://github.com/Siteimprove/alfa-integrations) repository.

### Step 1: Install alfa-scraper

```bash
# Clone the alfa-integrations repository
git clone https://github.com/Siteimprove/alfa-integrations.git
cd alfa-integrations

# Install dependencies
yarn install
yarn build

# Link or copy the scraper package to your MCP server
```

### Step 2: Add Scraper Tool

Add this to your `src/index.ts`:

```typescript
import { Scraper } from "@siteimprove/alfa-scraper";
import { Device } from "@siteimprove/alfa-device";

// Add to tools array:
{
  name: "audit_url",
  description: "Scrape a URL and run an accessibility audit",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to scrape and audit",
      },
      waitFor: {
        type: "string",
        enum: ["loaded", "idle", "animations"],
        description: "What to wait for before scraping (default: loaded)",
      },
    },
    required: ["url"],
  },
}

// Add handler:
case "audit_url": {
  const { url, waitFor = "loaded" } = args as {
    url: string;
    waitFor?: string;
  };

  const results: any[] = [];

  await Scraper.with(async (scraper) => {
    for (const page of await scraper.scrape(url)) {
      const outcomes = await Audit.of(page, rules).evaluate();
      const outcomesArray = Array.from(outcomes);
      const outcomesJson = outcomesArray.map((outcome) => outcome.toJSON());

      const counts = {
        passed: outcomesArray.filter(Outcome.isPassed).length,
        failed: outcomesArray.filter(Outcome.isFailed).length,
        cantTell: outcomesArray.filter(Outcome.isCantTell).length,
        inapplicable: outcomesArray.filter(Outcome.isInapplicable).length,
      };

      results.push({
        url: page.response.url.toString(),
        summary: {
          total: outcomesArray.length,
          counts,
        },
        outcomes: outcomesJson,
      });
    }
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}
```

## Adding HTML String Parsing

For proper HTML string parsing, use jsdom:

### Step 1: Install jsdom

```bash
yarn add jsdom
yarn add -D @types/jsdom
```

### Step 2: Update audit_html Handler

```typescript
import { JSDOM } from "jsdom";
import { Native } from "@siteimprove/alfa-dom/native";

case "audit_html": {
  const { html, url = "about:blank" } = args as {
    html: string;
    url?: string;
  };

  // Parse HTML with jsdom
  const dom = new JSDOM(html, { url });
  const pageUrl = URL.parse(url).getUnsafe();
  const device = Device.standard();

  // Convert DOM to Alfa format
  const documentJson = await Native.fromNode(dom.window.document);
  const documentResult = Document.from(documentJson.document, device);

  if (documentResult.isErr()) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Failed to parse document: ${documentResult.getErr()}`,
          }),
        },
      ],
      isError: true,
    };
  }

  const document = documentResult.getUnsafe();
  const request = Request.of("GET", pageUrl);
  const response = Response.of(200, [], "");

  const page = Page.of(request, response, document, device);

  // Run audit...
}
```

## MCP Client Configuration Examples

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Custom MCP Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/path/to/mcp-server/dist/index.js"],
});

const client = new Client({
  name: "alfa-client",
  version: "1.0.0",
}, {
  capabilities: {},
});

await client.connect(transport);

// List tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call a tool
const result = await client.callTool({
  name: "audit_html",
  arguments: {
    html: "<html><body><div>Test</div></body></html>",
    url: "https://example.com",
  },
});

console.log("Result:", result);
```

