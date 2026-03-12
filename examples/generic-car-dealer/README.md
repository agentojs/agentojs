# Generic Car Dealer Example

Demonstrates how to connect a non-standard REST API (a hypothetical car dealer) to the CommerceBackend interface using `@agentojs/generic` with custom field mapping.

## The problem

Your car dealer API returns vehicles in a custom format:

```json
{
  "vehicles": [
    {
      "vehicle_name": "2024 Toyota RAV4 XLE",
      "vehicle_desc": "Compact SUV, 2.5L engine, AWD",
      "vin": "2T3P1RFV0RC123456",
      "msrp": 3250000,
      "stock_number": "A1234",
      "currency": "usd"
    }
  ]
}
```

The `@agentojs/generic` adapter maps these fields to the standard `Product` type that any AI agent can understand.

## How field mapping works

```typescript
const fieldMap: GenericFieldMap = {
  product: {
    title: 'vehicle_name',                             // vehicle_name -> title
    description: 'vehicle_desc',                       // vehicle_desc -> description
    handle: 'vin',                                     // VIN as slug
    'variants.0.prices.0.amount': 'msrp',              // msrp -> price
    'variants.0.prices.0.currency_code': 'currency',   // currency code
    'variants.0.sku': 'stock_number',                   // stock # as SKU
  },
};
```

## Setup

```bash
cd examples/generic-car-dealer
pnpm install
```

## Run

```bash
export DEALER_URL=https://api.dealer.example.com
export DEALER_API_KEY=your_api_key
npx tsx index.ts
```

## What it does

1. Connects to the dealer API with custom endpoints (`/vehicles` instead of `/products`)
2. Searches for vehicles matching "SUV"
3. Maps the dealer's custom response fields to standard `Product` objects
4. Displays vehicle details using the mapped fields
5. Lists vehicle categories

## Expected output

```
Dealer API healthy: true

Found 3 vehicle(s):
  - 2024 Toyota RAV4 XLE ($32,500) [VIN: 2T3P1RFV0RC123456]
  - 2024 Honda CR-V Sport ($34,150) [VIN: 5J6RW2H53RL123456]
  - 2024 Ford Explorer ST ($47,500) [VIN: 1FM5K8GC2RGA12345]

Vehicle details:
  Name: 2024 Toyota RAV4 XLE
  Description: Compact SUV, 2.5L engine, AWD
  VIN: 2T3P1RFV0RC123456
  Stock #: A1234

Vehicle categories:
  - SUV
  - Sedan
  - Truck
```
