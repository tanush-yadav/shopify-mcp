#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ShopifyClient } from "./ShopifyClient/ShopifyClient.js";
import {
  CreateBasicDiscountCodeInput,
  CreateDraftOrderPayload,
  ProductNode,
  ShopifyOrderGraphql,
  ShopifyWebhookTopic
} from "./ShopifyClient/ShopifyClientPort.js";

const server = new McpServer({
  name: "shopify-tools",
  version: "1.0.0",
});

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
if (!SHOPIFY_ACCESS_TOKEN) {
  console.error("Error: SHOPIFY_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

const MYSHOPIFY_DOMAIN = process.env.MYSHOPIFY_DOMAIN;
if (!MYSHOPIFY_DOMAIN) {
  console.error("Error: MYSHOPIFY_DOMAIN environment variable is required");
  process.exit(1);
}

function formatProduct(product: ProductNode): string {
  const variantsString = product.variants.edges
    .map((variantEdge) => {
      const variant = variantEdge.node;
      let sizeChartInfo = "";
      // Check for metafield on the variant
      if (variant.metafield && variant.metafield.value) {
        try {
          const parsedValue = JSON.parse(variant.metafield.value);
          sizeChartInfo = `\n    variant.sizeChart: ${JSON.stringify(parsedValue, null, 2)}`;
        } catch (e) {
          sizeChartInfo = `\n    variant.sizeChart: ${variant.metafield.value}`;
        }
      }

      return `variant.title: ${variant.title}
    variant.id: ${variant.id}
    variant.price: ${variant.price}
    variant.sku: ${variant.sku}
    variant.inventoryPolicy: ${variant.inventoryPolicy}
    variant.sizeChart: ${sizeChartInfo}
    `;
    })
    .join(", ");

  return `
  Product: ${product.title}
  description: ${product.description}
  handle: ${product.handle}
  variants: ${variantsString}
  `;
}

function formatOrder(order: ShopifyOrderGraphql): string {
  let fulfillmentInfo = "No fulfillment information";
  if (order.fulfillments && order.fulfillments.length > 0) {
    const fulfillment = order.fulfillments[0];
    fulfillmentInfo = `
  Fulfillment Status: ${fulfillment.status}
  Fulfilled At: ${fulfillment.createdAt}`;
    if (fulfillment.trackingInfo && fulfillment.trackingInfo.length > 0) {
      const tracking = fulfillment.trackingInfo[0];
      fulfillmentInfo += `
  Tracking Number: ${tracking.number}
  Tracking Company: ${tracking.company}
  Tracking URL: ${tracking.url}`;
    }
  }

  // Extract the numeric ID from the full GraphQL ID
  const numericOrderId = order.id.split('/').pop();
  const numericCustomerId = order.customer?.id.split('/').pop();

  return `
  Order name : ${order.name}
  Order ID: ${numericOrderId}
  Created At: ${order.createdAt}
  Status: ${order.displayFinancialStatus || "N/A"}
  Email: ${order.email || "N/A"}
  Phone: ${order.phone || "N/A"}

  Total Price: ${order.totalPriceSet.shopMoney.amount} ${
    order.totalPriceSet.shopMoney.currencyCode
  }

  Customer: ${
    order.customer
      ? `
    ID: ${numericCustomerId}
    Email: ${order.customer.email}`
      : "No customer information"
  }

  Shipping Address: ${
    order.shippingAddress
      ? `
    Province: ${order.shippingAddress.provinceCode || "N/A"}
    Country: ${order.shippingAddress.countryCode}`
      : "No shipping address"
  }

  Details: ${
    order.lineItems.nodes.length > 0
      ? order.lineItems.nodes
          .map(
            (item) => `
    Title: ${item.title}
    Quantity: ${item.quantity}
    Price: ${item.originalTotalSet.shopMoney.amount} ${
              item.originalTotalSet.shopMoney.currencyCode
            }
    Variant: ${
      item.variant
        ? `
      Title: ${item.variant.title}
      SKU: ${item.variant.sku || "N/A"}
      Price: ${item.variant.price}`
        : "No variant information"
    }`
          )
          .join("\n")
      : "No items"
  }

  ${fulfillmentInfo}
  `;
}

// Products Tools
server.tool(
  "get-products",
  "Get all products or search by title",
  {
    searchTitle: z
      .string()
      .optional()
      .describe("Search title, if missing, will return all products"),
    limit: z.number().describe("Maximum number of products to return"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-products with args: ${JSON.stringify(args)}`
    );
    const { searchTitle, limit } = args;
    const client = new ShopifyClient();
    try {
      const products = await client.loadProducts(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        searchTitle ?? null,
        limit
      );
      const formattedProducts = products.products.map(formatProduct);
      return {
        content: [{ type: "text", text: formattedProducts.join("\n") }],
      };
    } catch (error) {
      return handleError("Failed to retrieve products data", error);
    }
  }
);

server.tool(
  "get-products-by-collection",
  "Get products from a specific collection",
  {
    collectionId: z
      .string()
      .describe("ID of the collection to get products from"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of products to return"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-products-by-collection with args: ${JSON.stringify(args)}`
    );
    const { collectionId, limit } = args;
    const client = new ShopifyClient();
    try {
      const products = await client.loadProductsByCollectionId(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        collectionId,
        limit
      );
      const formattedProducts = products.products.map(formatProduct);
      return {
        content: [{ type: "text", text: formattedProducts.join("\n") }],
      };
    } catch (error) {
      return handleError("Failed to retrieve products from collection", error);
    }
  }
);

server.tool(
  "get-products-by-ids",
  "Get products by their IDs",
  {
    productIds: z
      .array(z.string())
      .describe("Array of product IDs to retrieve"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-products-by-ids with args: ${JSON.stringify(args)}`
    );
    const { productIds } = args;
    const client = new ShopifyClient();
    try {
      const products = await client.loadProductsByIds(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        productIds
      );
      const formattedProducts = products.products.map(formatProduct);
      return {
        content: [{ type: "text", text: formattedProducts.join("\n") }],
      };
    } catch (error) {
      return handleError("Failed to retrieve products by IDs", error);
    }
  }
);

server.tool(
  "get-variants-by-ids",
  "Get product variants by their IDs",
  {
    variantIds: z
      .array(z.string())
      .describe("Array of variant IDs to retrieve"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-variants-by-ids with args: ${JSON.stringify(args)}`
    );
    const { variantIds } = args;
    const client = new ShopifyClient();
    try {
      const variants = await client.loadVariantsByIds(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        variantIds
      );
      return {
        content: [{ type: "text", text: JSON.stringify(variants, null, 2) }],
      };
    } catch (error) {
      return handleError("Failed to retrieve variants", error);
    }
  }
);

// Customer Tools
server.tool(
  "get-customers",
  "Get shopify customers with pagination support",
  {
    limit: z.number().optional().describe("Limit of customers to return"),
    next: z.string().optional().describe("Next page cursor"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-customers with args: ${JSON.stringify(args)}`
    );
    const { limit, next } = args;
    const client = new ShopifyClient();
    try {
      const response = await client.loadCustomers(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        limit,
        next
      );
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      };
    } catch (error) {
      return handleError("Failed to retrieve customers data", error);
    }
  }
);

server.tool(
  "tag-customer",
  "Add tags to a customer",
  {
    customerId: z.string().describe("Customer ID to tag"),
    tags: z.array(z.string()).describe("Tags to add to the customer"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: tag-customer with args: ${JSON.stringify(args)}`
    );
    const { customerId, tags } = args;
    const client = new ShopifyClient();
    try {
      const success = await client.tagCustomer(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        tags,
        customerId
      );
      return {
        content: [
          {
            type: "text",
            text: success
              ? "Successfully tagged customer"
              : "Failed to tag customer",
          },
        ],
      };
    } catch (error) {
      return handleError("Failed to tag customer", error);
    }
  }
);

// Order Tools
server.tool(
  "get-orders",
  "Get shopify orders with advanced filtering and sorting",
  {
    first: z.number().optional().describe("Limit of orders to return"),
    after: z.string().optional().describe("Next page cursor"),
    query: z.string().optional().describe("Filter orders using query syntax"),
    sortKey: z
      .enum([
        "PROCESSED_AT",
        "TOTAL_PRICE",
        "ID",
        "CREATED_AT",
        "UPDATED_AT",
        "ORDER_NUMBER",
      ])
      .optional()
      .describe("Field to sort by"),
    reverse: z.boolean().optional().describe("Reverse sort order"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-orders with args: ${JSON.stringify(args)}`
    );
    const { first, after, query, sortKey, reverse } = args;
    const client = new ShopifyClient();
    try {
      const response = await client.loadOrders(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        {
          first,
          after,
          query,
          sortKey,
          reverse,
        }
      );
      const formattedOrders = response.orders.map(formatOrder);
      console.log("formattedOrders", formattedOrders);
      return {
        content: [{ type: "text", text: formattedOrders.join("\n---\n") }],
      };
    } catch (error) {
      return handleError("Failed to retrieve orders data", error);
    }
  }
);

server.tool(
  "get-order",
  "Get a single order by ID",
  {
    orderId: z.string().describe("ID of the order to retrieve"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-order with args: ${JSON.stringify(args)}`
    );
    const { orderId } = args;
    const client = new ShopifyClient();
    try {
      const order = await client.loadOrder(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        { orderId }
      );
      console.log("order", order);
      return {
        content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
      };
    } catch (error) {
      return handleError("Failed to retrieve order", error);
    }
  }
);

// Discount Tools
server.tool(
  "create-discount",
  "Create a basic discount code",
  {
    title: z.string().describe("Title of the discount"),
    code: z.string().describe("Discount code that customers will enter"),
    valueType: z
      .enum(["percentage", "fixed_amount"])
      .describe("Type of discount"),
    value: z
      .number()
      .describe("Discount value (percentage as decimal or fixed amount)"),
    startsAt: z.string().describe("Start date in ISO format"),
    endsAt: z.string().optional().describe("Optional end date in ISO format"),
    appliesOncePerCustomer: z
      .boolean()
      .describe("Whether discount can be used only once per customer"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: create-discount with args: ${JSON.stringify(args)}`
    );
    const {
      title,
      code,
      valueType,
      value,
      startsAt,
      endsAt,
      appliesOncePerCustomer,
    } = args;
    const client = new ShopifyClient();
    try {
      const discountInput: CreateBasicDiscountCodeInput = {
        title,
        code,
        valueType,
        value,
        startsAt,
        endsAt,
        includeCollectionIds: [],
        excludeCollectionIds: [],
        appliesOncePerCustomer,
        combinesWith: {
          productDiscounts: true,
          orderDiscounts: true,
          shippingDiscounts: true,
        },
      };
      const discount = await client.createBasicDiscountCode(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        discountInput
      );
      return {
        content: [{ type: "text", text: JSON.stringify(discount, null, 2) }],
      };
    } catch (error) {
      return handleError("Failed to create discount", error);
    }
  }
);

// Draft Order Tools
server.tool(
  "create-draft-order",
  "Create a draft order",
  {
    lineItems: z
      .array(
        z.object({
          variantId: z.string(),
          quantity: z.number(),
        })
      )
      .describe("Line items to add to the order"),
    email: z.string().email().describe("Customer email"),
    shippingAddress: z
      .object({
        address1: z.string(),
        city: z.string(),
        province: z.string(),
        country: z.string(),
        zip: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        countryCode: z.string(),
      })
      .describe("Shipping address details"),
    note: z.string().optional().describe("Optional note for the order"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: create-draft-order with args: ${JSON.stringify(args)}`
    );
    const { lineItems, email, shippingAddress, note } = args;
    const client = new ShopifyClient();
    try {
      const draftOrderData: CreateDraftOrderPayload = {
        lineItems,
        email,
        shippingAddress,
        billingAddress: shippingAddress, // Using same address for billing
        tags: "draft",
        note: note || "",
      };
      const draftOrder = await client.createDraftOrder(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        draftOrderData
      );
      return {
        content: [{ type: "text", text: JSON.stringify(draftOrder, null, 2) }],
      };
    } catch (error) {
      return handleError("Failed to create draft order", error);
    }
  }
);

server.tool(
  "complete-draft-order",
  "Complete a draft order",
  {
    draftOrderId: z.string().describe("ID of the draft order to complete"),
    variantId: z.string().describe("ID of the variant in the draft order"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: complete-draft-order with args: ${JSON.stringify(args)}`
    );
    const { draftOrderId, variantId } = args;
    const client = new ShopifyClient();
    try {
      const completedOrder = await client.completeDraftOrder(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        draftOrderId,
        variantId
      );
      return {
        content: [
          { type: "text", text: JSON.stringify(completedOrder, null, 2) },
        ],
      };
    } catch (error) {
      return handleError("Failed to complete draft order", error);
    }
  }
);

// Collection Tools
server.tool(
  "get-collections",
  "Get all collections",
  {
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of collections to return"),
    name: z.string().optional().describe("Filter collections by name"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-collections with args: ${JSON.stringify(args)}`
    );
    const { limit, name } = args;
    const client = new ShopifyClient();
    try {
      const collections = await client.loadCollections(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN,
        { limit, name }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(collections, null, 2) }],
      };
    } catch (error) {
      return handleError("Failed to retrieve collections", error);
    }
  }
);

// Shop Tools
server.tool("get-shop", "Get shop details", {}, async (args) => {
  console.error(
    `[MCP Server] Received call: get-shop with args: ${JSON.stringify(args)}`
  );
  const client = new ShopifyClient();
  try {
    const shop = await client.loadShop(SHOPIFY_ACCESS_TOKEN, MYSHOPIFY_DOMAIN);
    return {
      content: [{ type: "text", text: JSON.stringify(shop, null, 2) }],
    };
  } catch (error) {
    return handleError("Failed to retrieve shop details", error);
  }
});

server.tool(
  "get-shop-details",
  "Get extended shop details including shipping countries",
  {},
  async (args) => {
    console.error(
      `[MCP Server] Received call: get-shop-details with args: ${JSON.stringify(args)}`
    );
    const client = new ShopifyClient();
    try {
      const shopDetails = await client.loadShopDetail(
        SHOPIFY_ACCESS_TOKEN,
        MYSHOPIFY_DOMAIN
      );
      return {
        content: [{ type: "text", text: JSON.stringify(shopDetails, null, 2) }],
      };
    } catch (error) {
      return handleError("Failed to retrieve extended shop details", error);
    }
  }
);

// Webhook Tools
server.tool(
  "manage-webhook",
  "Subscribe, find, or unsubscribe webhooks",
  {
    action: z
      .enum(["subscribe", "find", "unsubscribe"])
      .describe("Action to perform with webhook"),
    callbackUrl: z.string().url().describe("Webhook callback URL"),
    topic: z
      .nativeEnum(ShopifyWebhookTopic)
      .describe("Webhook topic to subscribe to"),
    webhookId: z
      .string()
      .optional()
      .describe("Webhook ID (required for unsubscribe)"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: manage-webhook with args: ${JSON.stringify(args)}`
    );
    const { action, callbackUrl, topic, webhookId } = args;
    const client = new ShopifyClient();
    try {
      switch (action) {
        case "subscribe": {
          const webhook = await client.subscribeWebhook(
            SHOPIFY_ACCESS_TOKEN,
            MYSHOPIFY_DOMAIN,
            callbackUrl,
            topic
          );
          return {
            content: [{ type: "text", text: JSON.stringify(webhook, null, 2) }],
          };
        }
        case "find": {
          const webhook = await client.findWebhookByTopicAndCallbackUrl(
            SHOPIFY_ACCESS_TOKEN,
            MYSHOPIFY_DOMAIN,
            callbackUrl,
            topic
          );
          return {
            content: [{ type: "text", text: JSON.stringify(webhook, null, 2) }],
          };
        }
        case "unsubscribe": {
          if (!webhookId) {
            throw new Error("webhookId is required for unsubscribe action");
          }
          await client.unsubscribeWebhook(
            SHOPIFY_ACCESS_TOKEN,
            MYSHOPIFY_DOMAIN,
            webhookId
          );
          return {
            content: [
              { type: "text", text: "Webhook unsubscribed successfully" },
            ],
          };
        }
      }
    } catch (error) {
      return handleError("Failed to manage webhook", error);
    }
  }
);

// Tool to check if the size-chart is present in the variant
server.tool(
  "debug-get-variant-metafield",
  "DEBUG: Get a specific variant and its size_chart_json metafield.",
  {
    variantId: z
      .string()
      .describe("The GID of the variant (e.g., gid://shopify/ProductVariant/XXXX)"),
  },
  async (args) => {
    console.error(
      `[MCP Server] Received call: debug-get-variant-metafield with args: ${JSON.stringify(args)}`
    );
    const { variantId } = args;
    const client = new ShopifyClient();
    const graphqlQuery = `
      query GetVariantMetafield($id: ID!) {
        node(id: $id) {
          ... on ProductVariant {
            id
            title
            metafield(namespace: "custom", key: "size_chart_json") {
              id
              value
              type
              namespace
              key
            }
          }
        }
      }
    `;
    try {
      const result = await client.shopifyGraphqlRequest<any>({
        url: `https://${MYSHOPIFY_DOMAIN}/admin/api/2024-04/graphql.json`,
        accessToken: SHOPIFY_ACCESS_TOKEN,
        query: graphqlQuery,
        variables: { id: variantId },
      });
      return {
        content: [
          { type: "text", text: `Raw GraphQL Response:\n${JSON.stringify(result.data, null, 2)}` },
        ],
      };
    } catch (error) {
      return handleError("Failed to execute debug GraphQL query", error);
    }
  }
);
// ***** END TEMPORARY DEBUG TOOL *****

// Utility function to handle errors
function handleError(
  defaultMessage: string,
  error: unknown
): {
  content: { type: "text"; text: string }[];
  isError: boolean;
} {
  console.error(`[MCP Server] Error encountered:`, error);

  let errorMessage = defaultMessage;
  let errorDetails = "";

  // Extract detailed error information based on error type
  if (error instanceof Error) {
    errorMessage = `${defaultMessage}: ${error.message}`;

    // Handle specific Shopify Client error types
    if ("code" in error && typeof error.code === "string") {
      errorDetails += `\nError Code: ${error.code}`;
    }

    if ("statusCode" in error && typeof error.statusCode === "number") {
      errorDetails += `\nStatus Code: ${error.statusCode}`;
    }

    if ("contextData" in error) {
      try {
        errorDetails += `\nContext: ${JSON.stringify(error.contextData, null, 2)}`;
      } catch (e) {
        errorDetails += `\nContext: [Complex object that couldn't be stringified]`;
      }
    }

    // Include stack trace in development environments
    if (process.env.NODE_ENV !== "production" && error.stack) {
      errorDetails += `\n\nStack Trace:\n${error.stack}`;
    }
  } else if (typeof error === "object" && error !== null) {
    try {
      errorDetails = `\nDetails: ${JSON.stringify(error, null, 2)}`;
    } catch (e) {
      errorDetails = `\nDetails: [Complex object that couldn't be stringified]`;
    }
  }

  // Combine message and details
  const fullErrorMessage = errorDetails
    ? `${errorMessage}\n${errorDetails}`
    : errorMessage;

  return {
    content: [{ type: "text", text: fullErrorMessage }],
    isError: true,
  };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Shopify MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
