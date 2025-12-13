# Testing the Alfa MCP Server in Claude Desktop

## Step 1: Restart Claude Desktop

1. **Quit Claude Desktop completely**:
   - Press `Cmd + Q` (or go to Claude Desktop → Quit)
   - Make sure it's fully closed (check Activity Monitor if needed)

2. **Reopen Claude Desktop**:
   - Launch Claude Desktop from Applications or Spotlight
   - The MCP server should connect automatically

## Step 2: Verify Connection

Once Claude Desktop is open, you can verify the MCP server is connected by asking:

```
What MCP tools do you have available?
```

or

```
What accessibility testing tools can you use?
```

Claude should respond with information about the 5 available tools.

## Step 3: Test Each Tool

### Test 1: List All Rules
Ask Claude:
```
List all the accessibility rules you can check
```

Expected: Claude should list all 91 accessibility rules.

### Test 2: Get Rule Information
Ask Claude:
```
Tell me about rule R1. What does it check for?
```

or

```
What is rule sia-r2 about?
```

Expected: Claude should provide details about the specific rule.

### Test 3: Audit HTML Content
Ask Claude:
```
Can you audit this HTML for accessibility issues: 
<html><body><div>Hello World</div></body></html>
```

Expected: Claude should run an accessibility audit and report any issues found.

### Test 4: Filter Results
After running an audit, you can ask:
```
Show me only the failed accessibility checks from the previous audit
```

## Step 4: Troubleshooting

### If Claude doesn't recognize the tools:

1. **Check the config file**:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Verify the server path**:
   ```bash
   ls -la /Users/shahabmohsen/Desktop/alfa/alfa-test/mcp-server/dist/index.js
   ```

3. **Check Claude Desktop logs**:
   - Look for error messages in the Claude Desktop window
   - Check Console.app for MCP-related errors

4. **Test the server manually**:
   ```bash
   echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | \
     node /Users/shahabmohsen/Desktop/alfa/alfa-test/mcp-server/dist/index.js
   ```

### If you see connection errors:

- Make sure Node.js is in your PATH: `which node`
- Verify Node.js version: `node --version` (should be >= 20.0.0)
- Check file permissions: The server file should be executable

## Example Conversation Flow

Here's a complete example of testing the MCP server:

**You**: "What accessibility testing tools do you have?"

**Claude**: [Should list the 5 tools: audit_html, audit_page, filter_outcomes, get_rule_info, list_rules]

**You**: "Can you audit this HTML: `<html><head><title>Test</title></head><body><img src='test.jpg'><button>Click me</button></body></html>`"

**Claude**: [Should run the audit and report accessibility issues like missing alt text, etc.]

**You**: "What rules failed in that audit?"

**Claude**: [Should filter and show only failed outcomes]

## Advanced Testing

### Test with Real HTML
You can paste actual HTML from a website:

```
Can you audit this HTML for accessibility:
[paste your HTML here]
```

### Test Rule Information
```
What does rule R62 check for? What WCAG criteria does it relate to?
```

### Test Multiple Rules
```
Tell me about rules R1, R2, and R3. What do they check?
```

## Success Indicators

✅ **Working correctly if**:
- Claude recognizes the tools when asked
- Can list all 91 rules
- Can run audits on HTML
- Can provide rule information
- Can filter results

❌ **Not working if**:
- Claude says it doesn't have those tools
- Errors appear when trying to use tools
- No response when asking about accessibility tools

## Quick Test Commands

Copy and paste these into Claude Desktop:

1. **Basic test**: "What accessibility tools do you have?"
2. **Rules test**: "List all accessibility rules"
3. **Audit test**: "Audit this HTML: `<html><body><div>Test</div></body></html>`"
4. **Rule info test**: "Tell me about rule R1"

If all of these work, your MCP server is fully functional! 🎉

