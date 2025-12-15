#!/usr/bin/env node

/**
 * HTTP MCP Server for Alfa Accessibility Testing
 * 
 * This server exposes Alfa's accessibility testing capabilities via HTTP REST API,
 * enabling external agents to access the MCP tools over the network.
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { Audit } from "@siteimprove/alfa-act";
import { Outcome } from "@siteimprove/alfa-act";
import rules, { Rules } from "@siteimprove/alfa-rules";
import { Page } from "@siteimprove/alfa-web";
import { Device } from "@siteimprove/alfa-device";
import { Request as HttpRequest, Response as HttpResponse } from "@siteimprove/alfa-http";
import { Document, Node } from "@siteimprove/alfa-dom";
import { Native } from "@siteimprove/alfa-dom/native";
import { URL } from "@siteimprove/alfa-url";
import { Sequence } from "@siteimprove/alfa-sequence";
import { JSDOM } from "jsdom";

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || process.env.MCP_API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Authentication middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  if (!API_KEY) {
    // No API key configured - allow all (development only)
    console.warn("⚠️  WARNING: No API_KEY configured. Server is open to all requests!");
    return next();
  }

  const authHeader = req.headers.authorization;
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : req.headers["x-api-key"] as string;

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing API key",
    });
  }

  next();
}

// Health check endpoint (no auth required)
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "alfa-mcp-server",
    version: "0.1.0",
  });
});

// List available tools
app.get("/tools", authenticate, (req: Request, res: Response) => {
  const tools = [
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

  res.json({ tools });
});

// Call a tool
app.post("/tools/:toolName", authenticate, async (req: Request, res: Response) => {
  const { toolName } = req.params;
  const args = req.body;

  try {
    let result: any;

    switch (toolName) {
      case "audit_html": {
        const { html, url = "about:blank" } = args;

        const pageUrlResult = URL.parse(url);
        if (pageUrlResult.isErr()) {
          return res.status(400).json({
            error: `Invalid URL: ${pageUrlResult.getErr()}`,
          });
        }
        const pageUrl = pageUrlResult.getUnsafe();
        const device = Device.standard();

        try {
          // Parse HTML with jsdom
          const dom = new JSDOM(html, { url });

          // Set globalThis.document for Native.fromNode (it uses globalThis.document.createRange())
          // This is required because Native.fromNode expects globalThis.document to exist
          const originalDocument = globalThis.document;
          globalThis.document = dom.window.document;

          let document: Document;
          try {
            // Convert DOM to Alfa format
            const documentJson = await Native.fromNode(dom.window.document);
            
            // Remove the logs property if present (Native.fromNode returns Node.JSON & Logs)
            const { logs, ...documentJsonWithoutLogs } = documentJson as any;
            
            // Create Document from JSON
            document = Node.from(documentJsonWithoutLogs as Document.JSON, device);
          } finally {
            // Restore original document (or undefined if it didn't exist)
            if (originalDocument !== undefined) {
              globalThis.document = originalDocument;
            } else {
              delete (globalThis as any).document;
            }
          }

          const request = HttpRequest.of("GET", pageUrl);
          const response = HttpResponse.of(pageUrl, 200);

          const page = Page.of(request, response, document, device);

          const outcomes = await Audit.of(page, rules).evaluate();
          const outcomesArray = Array.from(outcomes);
          const outcomesJson = outcomesArray.map((outcome) => outcome.toJSON());

          const counts = {
            passed: outcomesArray.filter(Outcome.isPassed).length,
            failed: outcomesArray.filter(Outcome.isFailed).length,
            cantTell: outcomesArray.filter(Outcome.isCantTell).length,
            inapplicable: outcomesArray.filter(Outcome.isInapplicable).length,
          };

          result = {
            summary: {
              total: outcomesArray.length,
              counts,
            },
            outcomes: outcomesJson,
          };
        } catch (parseError) {
          return res.status(400).json({
            error: `Failed to parse HTML: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          });
        }
        break;
      }

      case "audit_page": {
        const { pageJson } = args;

        const pageData = JSON.parse(pageJson);
        const pageResult = Page.from(pageData);

        if (pageResult.isErr()) {
          return res.status(400).json({
            error: `Failed to deserialize page: ${pageResult.getErr()}`,
          });
        }

        const page = pageResult.getUnsafe();
        const outcomes = await Audit.of(page, rules).evaluate();
        const outcomesArray = Array.from(outcomes);
        const outcomesJson = outcomesArray.map((outcome) => outcome.toJSON());

        const counts = {
          passed: outcomesArray.filter(Outcome.isPassed).length,
          failed: outcomesArray.filter(Outcome.isFailed).length,
          cantTell: outcomesArray.filter(Outcome.isCantTell).length,
          inapplicable: outcomesArray.filter(Outcome.isInapplicable).length,
        };

        result = {
          summary: {
            total: outcomesArray.length,
            counts,
          },
          outcomes: outcomesJson,
        };
        break;
      }

      case "filter_outcomes": {
        const { outcomes, outcomeType, ruleId } = args;

        let filtered = outcomes;

        if (outcomeType) {
          filtered = filtered.filter((outcome: any) => outcome.outcome === outcomeType);
        }

        if (ruleId) {
          filtered = filtered.filter((outcome: any) => {
            const ruleUri = outcome.test?.["@id"];
            return ruleUri?.includes(ruleId);
          });
        }

        result = {
          filtered,
          count: filtered.length,
        };
        break;
      }

      case "get_rule_info": {
        const { ruleId } = args;

        const allRules = Sequence.from(rules);
        const ruleOption = allRules.find((r) => {
          const uri = r.uri;
          return uri.includes(ruleId) || uri.endsWith(ruleId);
        });

        if (ruleOption.isNone()) {
          return res.status(404).json({
            error: `Rule ${ruleId} not found`,
          });
        }

        const rule = ruleOption.getUnsafe();
        const ruleJson = rule.toJSON();

        result = {
          ...ruleJson,
          uri: rule.uri,
        };
        break;
      }

      case "list_rules": {
        const allRules = Sequence.from(rules);
        const rulesList = allRules
          .map((rule) => {
            const ruleJson = rule.toJSON();
            return {
              ...ruleJson,
              uri: rule.uri,
            };
          })
          .toArray();

        result = {
          count: rulesList.length,
          rules: rulesList,
        };
        break;
      }

      default:
        return res.status(404).json({
          error: `Unknown tool: ${toolName}`,
        });
    }

    res.json(result);
  } catch (error) {
    console.error("Error executing tool:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Alfa MCP HTTP Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Tools endpoint: http://localhost:${PORT}/tools`);
  if (API_KEY) {
    console.log(`🔐 Authentication: Enabled (API key required)`);
  } else {
    console.log(`⚠️  Authentication: DISABLED (set API_KEY env var to enable)`);
  }
});

