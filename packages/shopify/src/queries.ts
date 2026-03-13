/**
 * Shopify Storefront API GraphQL queries and mutations.
 */

// ─── Shared Fields ─────────────────────────────────────────────────

export const PRODUCT_FIELDS = `
  id title description handle productType tags vendor
  createdAt updatedAt
  featuredImage { id url altText width height }
  images(first: 10) { edges { node { id url altText width height } cursor } pageInfo { hasNextPage hasPreviousPage } }
  variants(first: 50) { edges { node {
    id title sku barcode
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    availableForSale quantityAvailable
    weight weightUnit
    selectedOptions { name value }
  } cursor } pageInfo { hasNextPage hasPreviousPage } }
  options { id name values }
  collections(first: 5) { edges { node { id title handle } cursor } pageInfo { hasNextPage hasPreviousPage } }
`;

export const CART_FIELDS = `
  id checkoutUrl createdAt updatedAt
  lines(first: 50) { edges { node {
    id quantity
    merchandise { ... on ProductVariant {
      id title
      product { id title description featuredImage { id url altText width height } }
      price { amount currencyCode }
    }}
    cost { totalAmount { amount currencyCode } subtotalAmount { amount currencyCode } }
  } cursor } pageInfo { hasNextPage hasPreviousPage } }
  cost {
    totalAmount { amount currencyCode }
    subtotalAmount { amount currencyCode }
    totalTaxAmount { amount currencyCode }
  }
  buyerIdentity {
    email countryCode
    deliveryAddressPreferences { ... on MailingAddress {
      address1 address2 city provinceCode zip countryCode
    }}
  }
  deliveryGroups(first: 10) { edges { node {
    id
    deliveryOptions { handle title estimatedCost { amount currencyCode } }
    selectedDeliveryOption { handle title estimatedCost { amount currencyCode } }
  } cursor } pageInfo { hasNextPage hasPreviousPage } }
`;

// ─── Product Queries ───────────────────────────────────────────────

export const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($first: Int!, $query: String, $productType: String) {
    products(first: $first, query: $query, productType: $productType) {
      edges {
        node { ${PRODUCT_FIELDS} }
        cursor
      }
      pageInfo { hasNextPage hasPreviousPage }
    }
  }
`;

export const GET_PRODUCT_QUERY = `
  query GetProduct($id: ID!) {
    node(id: $id) {
      ... on Product { ${PRODUCT_FIELDS} }
    }
  }
`;

// ─── Collection Queries ────────────────────────────────────────────

export const GET_COLLECTIONS_QUERY = `
  query GetCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id title handle description
          image { id url altText width height }
          products(first: 0) { edges { node { id } cursor } pageInfo { hasNextPage hasPreviousPage } }
        }
        cursor
      }
    }
  }
`;

export const GET_COLLECTION_QUERY = `
  query GetCollection($id: ID!) {
    node(id: $id) {
      ... on Collection {
        id title handle description
        image { id url altText width height }
        products(first: 50) {
          edges { node { ${PRODUCT_FIELDS} } cursor }
          pageInfo { hasNextPage hasPreviousPage }
        }
      }
    }
  }
`;

// ─── Shop Query ────────────────────────────────────────────────────

export const SHOP_QUERY = `query { shop { name } }`;

// ─── Cart Mutations ────────────────────────────────────────────────

export const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

export const CART_QUERY = `
  query GetCart($id: ID!) {
    cart(id: $id) { ${CART_FIELDS} }
  }
`;

export const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

export const CART_LINES_REMOVE_MUTATION = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

export const CART_BUYER_IDENTITY_UPDATE_MUTATION = `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

export const CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION = `
  mutation CartSelectedDeliveryOptionsUpdate($cartId: ID!, $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!) {
    cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;
