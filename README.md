# Shopify MCP Server

MCP Server for Shopify API, enabling interaction with store data through GraphQL API. This server provides tools for managing products, customers, orders, and more.

<a href="https://glama.ai/mcp/servers/bemvhpy885"><img width="380" height="200" src="https://glama.ai/mcp/servers/bemvhpy885/badge" alt="Shopify Server MCP server" /></a>

## Features

* **Product Management**: Search and retrieve product information
* **Customer Management**: Load customer data and manage customer tags
* **Order Management**: Advanced order querying and filtering
* **GraphQL Integration**: Direct integration with Shopify's GraphQL Admin API
* **Comprehensive Error Handling**: Clear error messages for API and authentication issues

## Prerequisites

1. Node.js (version 16 or higher)
2. Shopify Custom App Access Token (see setup instructions below)

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pashpashpash/shopify-mcp-server.git
   cd shopify-mcp-server
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Project**:
   ```bash
   npm run build
   ```

## Shopify Setup

### Creating a Custom App

1. From your Shopify admin, go to **Settings** > **Apps and sales channels**
2. Click **Develop apps** (you may need to enable developer preview first)
3. Click **Create an app**
4. Set a name for your app (e.g., "Shopify MCP Server")
5. Click **Configure Admin API scopes**
6. Select the following scopes:
   * `read_products`, `write_products`
   * `read_customers`, `write_customers`
   * `read_orders`, `write_orders`
7. Click **Save**
8. Click **Install app**
9. Click **Install** to give the app access to your store data
10. After installation, you'll see your **Admin API access token**
11. Copy this token - you'll need it for configuration

Note: Store your access token securely. It provides access to your store data and should never be shared or committed to version control.

## Configuration

1. **Create Environment File**:
   Create a `.env` file in the project root:
   ```
   SHOPIFY_ACCESS_TOKEN=your_access_token
   MYSHOPIFY_DOMAIN=your-store.myshopify.com
   ```

2. **Configure Claude Desktop**:

Add this to your claude_desktop_config.json:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

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
Note: Replace "path/to/shopify-mcp-server" with the actual path to your cloned repository.

## Available Tools

### Product Management

1. `get-products`
   * Get all products or search by title
   * Inputs:
     * `searchTitle` (optional string): Filter products by title
     * `limit` (number): Maximum number of products to return

2. `get-products-by-collection`
   * Get products from a specific collection
   * Inputs:
     * `collectionId` (string): ID of the collection
     * `limit` (optional number, default: 10): Maximum products to return

3. `get-products-by-ids`
   * Get products by their IDs
   * Inputs:
     * `productIds` (array of strings): Array of product IDs to retrieve

4. `get-variants-by-ids`
   * Get product variants by their IDs
   * Inputs:
     * `variantIds` (array of strings): Array of variant IDs to retrieve

### Customer Management

5. `get-customers`
   * Get shopify customers with pagination
   * Inputs:
     * `limit` (optional number): Maximum customers to return
     * `next` (optional string): Next page cursor

6. `tag-customer`
   * Add tags to a customer
   * Inputs:
     * `customerId` (string): Customer ID to tag
     * `tags` (array of strings): Tags to add

### Order Management

7. `get-orders`
   * Get orders with advanced filtering
   * Inputs:
     * `first` (optional number): Limit of orders to return
     * `after` (optional string): Next page cursor
     * `query` (optional string): Filter query
     * `sortKey` (optional enum): Sort field
     * `reverse` (optional boolean): Reverse sort

8. `get-order`
   * Get a single order by ID
   * Inputs:
     * `orderId` (string): ID of the order

9. `create-draft-order`
    * Create a draft order
    * Inputs:
      * `lineItems` (array): Items with variantId and quantity
      * `email` (string): Customer email
      * `shippingAddress` (object): Shipping details
      * `note` (optional string): Optional note

10. `complete-draft-order`
    * Complete a draft order
    * Inputs:
      * `draftOrderId` (string): ID of draft order
      * `variantId` (string): ID of variant

### Discount Management

11. `create-discount`
    * Create a basic discount code
    * Inputs:
      * `title` (string): Discount title
      * `code` (string): Discount code
      * `valueType` (enum): 'percentage' or 'fixed_amount'
      * `value` (number): Discount value
      * `startsAt` (string): Start date
      * `endsAt` (optional string): End date
      * `appliesOncePerCustomer` (boolean): Once per customer flag

### Collection Management

12. `get-collections`
    * Get all collections
    * Inputs:
      * `limit` (optional number, default: 10)
      * `name` (optional string): Filter by name

### Shop Information

13. `get-shop`
    * Get basic shop details
    * No inputs required

14. `get-shop-details`
    * Get extended shop details
    * No inputs required

### Webhook Management

15. `manage-webhook`
    * Manage webhooks
    * Inputs:
      * `action` (enum): 'subscribe', 'find', 'unsubscribe'
      * `callbackUrl` (string): Webhook URL
      * `topic` (enum): Webhook topic
      * `webhookId` (optional string): Required for unsubscribe

## Debugging

If you run into issues, check Claude Desktop's MCP logs:
```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

Common issues:
1. **Authentication Errors**:
   - Verify your Shopify access token
   - Check your shop domain format
   - Ensure all required API scopes are enabled

2. **API Errors**:
   - Check rate limits
   - Verify input formats
   - Ensure required fields are provided

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Dependencies

- @modelcontextprotocol/sdk - MCP protocol implementation
- graphql-request - GraphQL client for Shopify API
- zod - Runtime type validation

## License

MIT

---
Note: This is a fork of the [original shopify-mcp-server repository](https://github.com/rezapex/shopify-mcp-server-main
