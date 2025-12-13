# MCP Server Setup Complete! ✅

## Installation Status

✅ **Dependencies installed** - All required packages are installed  
✅ **Server built** - TypeScript compiled successfully  
✅ **Ready to run** - Server is ready to use

## How to Run the Server

### Option 1: Direct Execution
```bash
cd mcp-server
node dist/index.js
```

The server communicates via **stdio** (standard input/output), which is the standard for MCP servers. It will wait for JSON-RPC messages on stdin and respond on stdout.

### Option 2: With MCP Client

The server is designed to be used with MCP-compatible clients like:
- Claude Desktop
- Custom MCP clients using the `@modelcontextprotocol/sdk`

## Available Tools

The server exposes 5 tools:

1. **`audit_html`** - Audit HTML content for accessibility issues
2. **`audit_page`** - Audit a pre-scraped page (JSON format)
3. **`filter_outcomes`** - Filter audit results by type or rule
4. **`get_rule_info`** - Get information about a specific rule
5. **`list_rules`** - List all available accessibility rules

## Integration with Claude Desktop

To use with Claude Desktop, add to your config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

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

**Important:** Use the absolute path to the `dist/index.js` file.

After adding the configuration, restart Claude Desktop.

## Testing the Server

You can test the server manually by sending JSON-RPC messages:

```bash
# List available tools
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js

# Call a tool
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "list_rules", "arguments": {}}}' | node dist/index.js
```

## Next Steps

1. **Add URL scraping** - See `INTEGRATION.md` for adding `@siteimprove/alfa-scraper`
2. **Add HTML parsing** - See `INTEGRATION.md` for using jsdom for proper HTML parsing
3. **Customize tools** - Modify `src/index.ts` to add more tools or customize behavior

## Troubleshooting

- **Server not responding**: Make sure you're sending valid JSON-RPC 2.0 messages
- **Module not found**: Run `yarn install` from the project root
- **Build errors**: Run `yarn build` from the project root first

## Files Created

- `mcp-server/src/index.ts` - Main server implementation
- `mcp-server/package.json` - Dependencies and scripts
- `mcp-server/tsconfig.json` - TypeScript configuration
- `mcp-server/dist/index.js` - Compiled JavaScript (after build)
- `mcp-server/README.md` - Full documentation
- `mcp-server/INTEGRATION.md` - Integration guides
- `mcp-server/QUICKSTART.md` - Quick start guide

The server is ready to use! 🎉

