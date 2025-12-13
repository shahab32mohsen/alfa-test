# Claude Desktop Setup Complete! ✅

## Configuration Created

The Claude Desktop configuration file has been created at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

## What Was Configured

The Alfa MCP server has been added to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "alfa": {
      "command": "node",
      "args": [
        "/Users/shahabmohsen/Desktop/alfa/alfa-test/mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Next Steps

1. **Install Claude Desktop** (if not already installed):
   - Download from: https://claude.ai/download
   - Install the application

2. **Restart Claude Desktop**:
   - If Claude Desktop is already running, quit it completely
   - Reopen Claude Desktop
   - The MCP server will be automatically loaded

3. **Verify the Setup**:
   - Open Claude Desktop
   - Try asking: "What accessibility tools do you have available?"
   - Or: "List all the accessibility rules you can check"

## Available Tools

Once connected, you can ask Claude to:
- **Audit HTML**: "Can you audit this HTML for accessibility issues: `<html>...</html>`"
- **List Rules**: "What accessibility rules are available?"
- **Get Rule Info**: "Tell me about rule R1"
- **Filter Results**: "Show me only the failed accessibility checks"

## Troubleshooting

### If the server doesn't connect:

1. **Check the path**: Make sure the path to `dist/index.js` is correct
   ```bash
   ls -la /Users/shahabmohsen/Desktop/alfa/alfa-test/mcp-server/dist/index.js
   ```

2. **Check Node.js**: Make sure Node.js is in your PATH
   ```bash
   which node
   node --version  # Should be >= 20.0.0
   ```

3. **Check Claude Desktop logs**:
   - Look for error messages in Claude Desktop
   - Check the console for MCP connection errors

4. **Test the server manually**:
   ```bash
   echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node /Users/shahabmohsen/Desktop/alfa/alfa-test/mcp-server/dist/index.js
   ```

## Adding More MCP Servers

If you want to add more MCP servers later, edit the config file and add them to the `mcpServers` object:

```json
{
  "mcpServers": {
    "alfa": {
      "command": "node",
      "args": ["/path/to/alfa/mcp-server/dist/index.js"]
    },
    "another-server": {
      "command": "python",
      "args": ["/path/to/another/server.py"]
    }
  }
}
```

## Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Your setup is complete! 🎉

