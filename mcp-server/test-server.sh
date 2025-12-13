#!/bin/bash

# Simple test script for the MCP server
# This sends a basic MCP request to test if the server responds

echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js

