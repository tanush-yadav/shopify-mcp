# Shopify MCP Server

MCP Server for Shopify API, enabling interaction with store data (products, customers, orders, etc.) via GraphQL.


## Features

Provides tools for product, customer, and order management, direct GraphQL integration, and clear error handling.

## Prerequisites

1. Node.js (v16+)
2. Shopify Custom App Access Token

## Installation

```bash
git clone https://github.com/pashpashpash/shopify-mcp-server.git
cd shopify-mcp-server
npm install
npm run build
```

## Shopify Setup & Configuration

1.  **Create Custom App**: In Shopify admin > **Settings** > **Apps and sales channels** > **Develop apps** > **Create an app**.
2.  **Configure Scopes**: Grant `read/write` permissions for `products`, `customers`, and `orders`.
3.  **Install App & Get Token**: Install the app and copy the **Admin API access token**.
4.  **Create `.env` file** in the project root:
    ```
    SHOPIFY_ACCESS_TOKEN=your_access_token
    MYSHOPIFY_DOMAIN=your-store.myshopify.com
    ```
5.  **Configure Claude Desktop** (`claude_desktop_config.json`):
    *   macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   Windows: `%APPDATA%/Claude/claude_desktop_config.json`
    ```json
    {
      "mcpServers": {
        "shopify": {
          "command": "node",
          "args": ["path/to/shopify-mcp-server/dist/index.js"],
          "env": {
            "SHOPIFY_ACCESS_TOKEN": "your_access_token",
            "MYSHOPIFY_DOMAIN": "your-store.myshopify.com"
          }
        }
      }
    }
    ```
    *Note: Use the correct path to the cloned repo and store your token securely.*

## Available Tools

### Product Management

1.  `get-products`: Get all products or search by title.
    *   `searchTitle` (optional string): Filter by title.
    *   `limit` (number): Max products.
2.  `get-products-by-collection`: Get products from a collection.
    *   `collectionId` (string): Collection ID.
    *   `limit` (optional number, default: 10): Max products.
3.  `get-products-by-ids`: Get products by IDs.
    *   `productIds` (array of strings): Product IDs.
4.  `get-variants-by-ids`: Get variants by IDs.
    *   `variantIds` (array of strings): Variant IDs.

### Customer Management

5.  `get-customers`: Get customers with pagination.
    *   `limit` (optional number): Max customers.
    *   `next` (optional string): Next page cursor.
6.  `tag-customer`: Add tags to a customer.
    *   `customerId` (string): Customer ID.
    *   `tags` (array of strings): Tags to add.

### Order Management

7.  `get-orders`: Get orders with advanced filtering/sorting.
    *   `first` (optional number): Limit orders.
    *   `after` (optional string): Next page cursor.
    *   `query` (optional string): Filter query.
    *   `sortKey` (optional enum): Sort field.
    *   `reverse` (optional boolean): Reverse sort.
8.  `get-order`: Get a single order by ID.
    *   `orderId` (string): Order ID.
9.  `create-draft-order`: Create a draft order.
    *   `lineItems` (array): Items (variantId, quantity).
    *   `email` (string): Customer email.
    *   `shippingAddress` (object): Shipping details.
    *   `note` (optional string): Order note.
10. `complete-draft-order`: Complete a draft order.
    *   `draftOrderId` (string): Draft order ID.
    *   `variantId` (string): Variant ID.

### Discount Management

11. `create-discount`: Create a basic discount code.
    *   `title` (string): Discount title.
    *   `code` (string): Discount code.
    *   `valueType` (enum): 'percentage' or 'fixed_amount'.
    *   `value` (number): Discount value.
    *   `startsAt` (string): Start date (ISO).
    *   `endsAt` (optional string): End date (ISO).
    *   `appliesOncePerCustomer` (boolean): Limit one use per customer.

### Collection Management

12. `get-collections`: Get all collections.
    *   `limit` (optional number, default: 10): Max collections.
    *   `name` (optional string): Filter by name.

### Shop Information

13. `get-shop`: Get basic shop details (No inputs).
14. `get-shop-details`: Get extended shop details (No inputs).

### Webhook Management

15. `manage-webhook`: Manage webhooks.
    *   `action` (enum): 'subscribe', 'find', 'unsubscribe'.
    *   `callbackUrl` (string): Webhook URL.
    *   `topic` (enum): Webhook topic.
    *   `webhookId` (optional string): Required for unsubscribe.

### Debugging Tools

16. `debug-get-variant-metafield`: Get variant & `size_chart_json` metafield.
    *   `variantId` (string): Variant GID.

### Developer Tools

17. `introspect_admin_schema`: Introspect Admin API GraphQL schema.
    *   `query` (string): Filter term.
    *   `filter` (optional array): Filter by 'types', 'queries', 'mutations', 'all'.
18. `search_dev_docs`: Search shopify.dev docs.
    *   `prompt` (string): Search query.

## Debugging

Check Claude Desktop MCP logs:
`tail -n 20 -f ~/Library/Logs/Claude/mcp*.log`

Common issues:
*   **Authentication**: Check token, domain format, API scopes.
*   **API Errors**: Check rate limits, input formats, required fields.

## Development

```bash
npm install
npm run build
npm test
```

## Dependencies

- @modelcontextprotocol/sdk
- graphql-request
- zod

## License

MIT

---
Note: Fork of [original shopify-mcp-server repository](https://github.com/rezapex/shopify-mcp-server-main)
