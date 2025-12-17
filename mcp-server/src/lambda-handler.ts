/**
 * AWS Lambda Handler for Alfa MCP Server
 * 
 * This handler wraps the MCP server functionality for AWS Lambda deployment,
 * compatible with Bedrock Agent Core Gateway targets.
 */

import { Audit, Outcome } from "@siteimprove/alfa-act";
import rules from "@siteimprove/alfa-rules";
import { Page } from "@siteimprove/alfa-web";
import { Device } from "@siteimprove/alfa-device";
import { Request as HttpRequest, Response as HttpResponse } from "@siteimprove/alfa-http";
import { Document, Node, h } from "@siteimprove/alfa-dom";
import { URL } from "@siteimprove/alfa-url";
import { Sequence } from "@siteimprove/alfa-sequence";
import { parseHTML } from "linkedom";

// MCP Tool definitions
const TOOLS = [
  {
    name: "audit_html",
    description: "Run an accessibility audit on HTML content. Provide the HTML string and optionally a URL for context.",
    inputSchema: {
      type: "object",
      properties: {
        html: { type: "string", description: "The HTML content to audit" },
        url: { type: "string", description: "Optional URL for context (defaults to 'about:blank')" },
      },
      required: ["html"],
    },
  },
  {
    name: "audit_page",
    description: "Run an accessibility audit on a Page object (requires pre-scraped page data in JSON format).",
    inputSchema: {
      type: "object",
      properties: {
        pageJson: { type: "string", description: "JSON string of a scraped page (from alfa-scraper)" },
      },
      required: ["pageJson"],
    },
  },
  {
    name: "get_rule_info",
    description: "Get information about a specific accessibility rule.",
    inputSchema: {
      type: "object",
      properties: {
        ruleId: { type: "string", description: "The rule ID to get information about (e.g., 'R1', 'R2')" },
      },
      required: ["ruleId"],
    },
  },
  {
    name: "list_rules",
    description: "List all available accessibility rules.",
    inputSchema: { type: "object", properties: {} },
  },
];

// Helper function to convert linkedom node to Alfa node
function convertToAlfaNode(node: any, device: Device): any {
  if (!node) return null;

  switch (node.nodeType) {
    case 1: // ELEMENT_NODE
      const children: any[] = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = convertToAlfaNode(node.childNodes[i], device);
        if (child) children.push(child);
      }
      
      const attrs: Record<string, string> = {};
      if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          attrs[attr.name] = attr.value;
        }
      }
      
      return h.element(
        node.localName.toLowerCase(),
        attrs,
        children
      );

    case 3: // TEXT_NODE
      return node.textContent ? h.text(node.textContent) : null;

    case 8: // COMMENT_NODE
      return null; // Skip comments

    case 9: // DOCUMENT_NODE
      const docChildren: any[] = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = convertToAlfaNode(node.childNodes[i], device);
        if (child) docChildren.push(child);
      }
      return h.document(docChildren);

    case 10: // DOCUMENT_TYPE_NODE
      return h.type(node.name || "html", node.publicId || null, node.systemId || null);

    default:
      return null;
  }
}

// Tool execution handlers
async function executeAuditHtml(args: { html: string; url?: string }) {
  const { html, url = "about:blank" } = args;

  const pageUrlResult = URL.parse(url);
  if (pageUrlResult.isErr()) {
    throw new Error(`Invalid URL: ${pageUrlResult.getErr()}`);
  }
  const pageUrl = pageUrlResult.getUnsafe();
  const device = Device.standard();

  // Parse HTML with linkedom (lighter than jsdom, no external file dependencies)
  const { document: linkedomDoc } = parseHTML(html);

  // Convert linkedom document to Alfa document
  const alfaDocument = convertToAlfaNode(linkedomDoc, device) as Document;

  const request = HttpRequest.of("GET", pageUrl);
  const response = HttpResponse.of(pageUrl, 200);
  const page = Page.of(request, response, alfaDocument, device);

  const outcomes = await Audit.of(page, rules).evaluate();
  const outcomesArray = Array.from(outcomes);
  const outcomesJson = outcomesArray.map((outcome) => outcome.toJSON());

  const counts = {
    passed: outcomesArray.filter(Outcome.isPassed).length,
    failed: outcomesArray.filter(Outcome.isFailed).length,
    cantTell: outcomesArray.filter(Outcome.isCantTell).length,
    inapplicable: outcomesArray.filter(Outcome.isInapplicable).length,
  };

  return {
    summary: { total: outcomesArray.length, counts },
    outcomes: outcomesJson,
  };
}

async function executeAuditPage(args: { pageJson: string }) {
  const pageData = JSON.parse(args.pageJson);
  const pageResult = Page.from(pageData);

  if (pageResult.isErr()) {
    throw new Error(`Failed to deserialize page: ${pageResult.getErr()}`);
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

  return {
    summary: { total: outcomesArray.length, counts },
    outcomes: outcomesJson,
  };
}

function executeGetRuleInfo(args: { ruleId: string }) {
  const allRules = Sequence.from(rules);
  const ruleOption = allRules.find((r) => {
    const uri = r.uri;
    return uri.includes(args.ruleId) || uri.endsWith(args.ruleId);
  });

  if (ruleOption.isNone()) {
    throw new Error(`Rule ${args.ruleId} not found`);
  }

  const rule = ruleOption.getUnsafe();
  return { ...rule.toJSON(), uri: rule.uri };
}

function executeListRules() {
  const allRules = Sequence.from(rules);
  const rulesList = allRules.map((rule) => ({ ...rule.toJSON(), uri: rule.uri })).toArray();
  return { count: rulesList.length, rules: rulesList };
}

// MCP Protocol Handler
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "alfa-accessibility-server", version: "0.1.0" },
          },
        };

      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } };

      case "tools/call": {
        const { name, arguments: args } = params;
        let result: any;

        switch (name) {
          case "audit_html":
            result = await executeAuditHtml(args);
            break;
          case "audit_page":
            result = await executeAuditPage(args);
            break;
          case "get_rule_info":
            result = executeGetRuleInfo(args);
            break;
          case "list_rules":
            result = executeListRules();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

// API Key for authentication
const API_KEY = process.env.API_KEY || "alfa-mcp-2024-secret-key-f8e9d7c6b5a4";

// Lambda Handler
export const handler = async (event: any): Promise<any> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    // Check API key authentication
    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization || "";
    const apiKeyHeader = headers["x-api-key"] || headers["X-Api-Key"] || "";
    
    const providedKey = authHeader.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : apiKeyHeader;
    
    if (providedKey !== API_KEY) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32001,
            message: "Unauthorized: Invalid or missing API key. Use 'Authorization: Bearer <key>' or 'X-Api-Key: <key>' header.",
          },
        }),
      };
    }

    // Handle different event formats
    let body: any;
    
    if (event.body) {
      // API Gateway / Lambda Function URL format
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } else if (event.jsonrpc) {
      // Direct MCP request
      body = event;
    } else if (event.requestContext?.http) {
      // Lambda Function URL
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } else {
      // Assume it's a direct invocation with MCP payload
      body = event;
    }

    // Handle batch requests
    if (Array.isArray(body)) {
      const responses = await Promise.all(body.map(handleMCPRequest));
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(responses),
      };
    }

    // Handle single request
    const response = await handleMCPRequest(body);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : "Parse error",
        },
      }),
    };
  }
};

