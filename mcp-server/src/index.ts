#!/usr/bin/env node

/**
 * MCP Server for Alfa Accessibility Testing
 * 
 * This server exposes Alfa's accessibility testing capabilities through
 * the Model Context Protocol (MCP), allowing AI assistants to test
 * web pages for accessibility issues.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { Audit } from "@siteimprove/alfa-act";
import { Outcome } from "@siteimprove/alfa-act";
import rules, { Rules } from "@siteimprove/alfa-rules";
import { Page } from "@siteimprove/alfa-web";
import { Device } from "@siteimprove/alfa-device";
import { Request, Response } from "@siteimprove/alfa-http";
import { Document } from "@siteimprove/alfa-dom";
import { URL } from "@siteimprove/alfa-url";
import { Sequence } from "@siteimprove/alfa-sequence";

// Note: For full functionality, you'll need @siteimprove/alfa-scraper
// which is in the alfa-integrations repository. This example shows
// how to use Alfa with pre-scraped data or HTML content.

const server = new Server(
  {
    name: "alfa-accessibility-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: "audit_html",
    description:
      "Run an accessibility audit on HTML content. Provide the HTML string and optionally a URL for context.",
    inputSchema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "The HTML content to audit",
        },
        url: {
          type: "string",
          description: "Optional URL for context (defaults to 'about:blank')",
        },
      },
      required: ["html"],
    },
  },
  {
    name: "audit_page",
    description:
      "Run an accessibility audit on a Page object (requires pre-scraped page data in JSON format).",
    inputSchema: {
      type: "object",
      properties: {
        pageJson: {
          type: "string",
          description: "JSON string of a scraped page (from alfa-scraper)",
        },
      },
      required: ["pageJson"],
    },
  },
  {
    name: "filter_outcomes",
    description:
      "Filter audit outcomes by type (passed, failed, cantTell, inapplicable) or rule ID.",
    inputSchema: {
      type: "object",
      properties: {
        outcomes: {
          type: "array",
          description: "Array of outcome objects to filter",
        },
        outcomeType: {
          type: "string",
          enum: ["passed", "failed", "cantTell", "inapplicable"],
          description: "Filter by outcome type",
        },
        ruleId: {
          type: "string",
          description: "Filter by specific rule ID (e.g., 'R1', 'R2')",
        },
      },
      required: ["outcomes"],
    },
  },
  {
    name: "get_rule_info",
    description: "Get information about a specific accessibility rule.",
    inputSchema: {
      type: "object",
      properties: {
        ruleId: {
          type: "string",
          description: "The rule ID to get information about (e.g., 'R1', 'R2')",
        },
      },
      required: ["ruleId"],
    },
  },
  {
    name: "list_rules",
    description: "List all available accessibility rules.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "audit_html": {
        const { html, url = "about:blank" } = args as {
          html: string;
          url?: string;
        };

        // Note: For proper HTML parsing, you would typically use:
        // 1. @siteimprove/alfa-scraper (for live URLs)
        // 2. jsdom or similar DOM parser (for HTML strings)
        // 
        // For this example, we'll create a minimal document structure.
        // In production, consider using jsdom to parse HTML:
        //   const { JSDOM } = require("jsdom");
        //   const dom = new JSDOM(html);
        //   const documentJson = await Native.fromNode(dom.window.document);
        //   const document = Document.from(documentJson, device).getUnsafe();

        const pageUrlResult = URL.parse(url);
        if (pageUrlResult.isErr()) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Invalid URL: ${pageUrlResult.getErr()}`,
                }),
              },
            ],
            isError: true,
          };
        }
        const pageUrl = pageUrlResult.getUnsafe();

        // Create a minimal Page object with an empty document
        // This is a simplified example - for real HTML parsing, use jsdom + Native.fromNode
        const request = Request.of("GET", pageUrl);
        const response = Response.empty();
        const device = Device.standard();
        const document = Document.empty(); // Simplified - use proper HTML parsing in production

        const page = Page.of(request, response, document, device);

        // Run the audit
        const outcomes = await Audit.of(page, rules).evaluate();
        const outcomesArray = Array.from(outcomes);

        // Convert outcomes to JSON
        const outcomesJson = outcomesArray.map((outcome) => outcome.toJSON());

        // Count outcomes by type
        const counts = {
          passed: outcomesArray.filter(Outcome.isPassed).length,
          failed: outcomesArray.filter(Outcome.isFailed).length,
          cantTell: outcomesArray.filter(Outcome.isCantTell).length,
          inapplicable: outcomesArray.filter(Outcome.isInapplicable).length,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  summary: {
                    total: outcomesArray.length,
                    counts,
                  },
                  outcomes: outcomesJson,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "audit_page": {
        const { pageJson } = args as { pageJson: string };

        // Deserialize the page
        const pageData = JSON.parse(pageJson);
        const pageResult = Page.from(pageData);

        if (pageResult.isErr()) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Failed to deserialize page: ${pageResult.getErr()}`,
                }),
              },
            ],
            isError: true,
          };
        }

        const page = pageResult.getUnsafe();

        // Run the audit
        const outcomes = await Audit.of(page, rules).evaluate();
        const outcomesArray = Array.from(outcomes);

        // Convert outcomes to JSON
        const outcomesJson = outcomesArray.map((outcome) => outcome.toJSON());

        // Count outcomes by type
        const counts = {
          passed: outcomesArray.filter(Outcome.isPassed).length,
          failed: outcomesArray.filter(Outcome.isFailed).length,
          cantTell: outcomesArray.filter(Outcome.isCantTell).length,
          inapplicable: outcomesArray.filter(Outcome.isInapplicable).length,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  summary: {
                    total: outcomesArray.length,
                    counts,
                  },
                  outcomes: outcomesJson,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "filter_outcomes": {
        const {
          outcomes,
          outcomeType,
          ruleId,
        } = args as {
          outcomes: any[];
          outcomeType?: string;
          ruleId?: string;
        };

        let filtered = outcomes;

        if (outcomeType) {
          filtered = filtered.filter(
            (outcome) => outcome.outcome === outcomeType
          );
        }

        if (ruleId) {
          filtered = filtered.filter((outcome) => {
            const ruleUri = outcome.test?.["@id"];
            return ruleUri?.includes(ruleId);
          });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  filtered: filtered,
                  count: filtered.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_rule_info": {
        const { ruleId } = args as { ruleId: string };

        // Find the rule by URI
        const allRules = Sequence.from(rules);
        const ruleOption = allRules.find((r) => {
          const uri = r.uri;
          return uri.includes(ruleId) || uri.endsWith(ruleId);
        });
        
        if (ruleOption.isNone()) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Rule ${ruleId} not found`,
                }),
              },
            ],
            isError: true,
          };
        }
        
        const rule = ruleOption.getUnsafe();

        if (!rule) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Rule ${ruleId} not found`,
                }),
              },
            ],
            isError: true,
          };
        }

        // Get rule information from JSON
        const ruleJson = rule.toJSON();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...ruleJson,
                  uri: rule.uri,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_rules": {
        const allRules = Sequence.from(rules);
        const rulesList = allRules.map((rule) => {
          const ruleJson = rule.toJSON();
          return {
            ...ruleJson,
            uri: rule.uri,
          };
        }).toArray();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: rulesList.length,
                  rules: rulesList,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Alfa MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

