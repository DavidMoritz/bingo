# DynamoDB Table Schemas

This document defines the DynamoDB tables needed for the Nintendo Switch Parental Controls Time Management system.

**Note:** The default daily time limit is configured via the `DEFAULT_TIME_MINUTES` environment variable (default: 60), not stored in DynamoDB.

## Table 1: `approved-devices`

**Purpose:** Store authorized device IDs that can access the Moritz Tools interface and trigger time deductions.

**Table Settings:**
- Table name: `approved-devices`
- Partition key: `deviceId` (String)
- Billing mode: On-demand (pay per request)

**Schema:**
```json
{
  "deviceId": "a3f2b9c1e5d8f7a2b4c6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5",
  "name": "David's iPhone",
  "addedAt": "2026-01-11T14:30:00.000Z",
  "addedBy": "admin"
}
```

**Attributes:**
- `deviceId` (String, PK): SHA-256 hash of device fingerprint (64 characters)
- `name` (String): Human-readable device name for identification
- `addedAt` (String): ISO 8601 timestamp when device was approved
- `addedBy` (String): Who approved the device (e.g., "admin", "David")

**Example Items:**
```json
[
  {
    "deviceId": "a3f2b9c1e5d8f7a2b4c6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5",
    "name": "David's iPhone 15",
    "addedAt": "2026-01-11T10:00:00.000Z",
    "addedBy": "admin"
  },
  {
    "deviceId": "b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7",
    "name": "David's MacBook Pro",
    "addedAt": "2026-01-11T10:05:00.000Z",
    "addedBy": "admin"
  }
]
```

---

## Table 2: `deductions`

**Purpose:** Track time deductions throughout each day for calculating final daily time limit.

**Table Settings:**
- Table name: `deductions`
- Partition key: `date` (String) - Format: YYYY-MM-DD
- Sort key: `timestamp` (String) - ISO 8601 timestamp
- Billing mode: On-demand
- TTL: Optional - auto-delete records older than 30 days (attribute: `ttl`)

**Schema:**
```json
{
  "date": "2026-01-11",
  "timestamp": "2026-01-11T14:30:00.000Z",
  "minutes": 5,
  "reason": "Did not obey immediately",
  "deviceId": "a3f2b9c1e5d8f7a2b4c6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5",
  "ttl": 1738425000
}
```

**Attributes:**
- `date` (String, PK): Date in YYYY-MM-DD format (local timezone)
- `timestamp` (String, SK): ISO 8601 timestamp when deduction was made
- `minutes` (Number): Number of minutes deducted (positive integer)
- `reason` (String, Optional): Optional reason for the deduction
- `deviceId` (String): Device ID that triggered the deduction
- `ttl` (Number, Optional): Unix epoch timestamp for auto-deletion (30 days from creation)

**Example Items:**
```json
[
  {
    "date": "2026-01-11",
    "timestamp": "2026-01-11T08:15:00.000Z",
    "minutes": 5,
    "reason": "Did not clean room",
    "deviceId": "a3f2b9c1...",
    "ttl": 1738425000
  },
  {
    "date": "2026-01-11",
    "timestamp": "2026-01-11T14:30:00.000Z",
    "minutes": 10,
    "reason": "Talked back",
    "deviceId": "a3f2b9c1...",
    "ttl": 1738425000
  },
  {
    "date": "2026-01-11",
    "timestamp": "2026-01-11T16:45:00.000Z",
    "minutes": 5,
    "deviceId": "a3f2b9c1...",
    "ttl": 1738425000
  }
]
```

**Query Pattern:**
```javascript
// Get all deductions for today
const params = {
  TableName: 'deductions',
  KeyConditionExpression: '#date = :today',
  ExpressionAttributeNames: { '#date': 'date' },
  ExpressionAttributeValues: { ':today': '2026-01-11' }
};
```

---

## Setup Instructions

### Create Tables via AWS Console

1. **approved-devices**
   - Go to DynamoDB → Create table
   - Table name: `approved-devices`
   - Partition key: `deviceId` (String)
   - Use default settings → Create table

2. **deductions**
   - Go to DynamoDB → Create table
   - Table name: `deductions`
   - Partition key: `date` (String)
   - Sort key: `timestamp` (String)
   - Enable TTL: Attribute name `ttl` (optional)
   - Use default settings → Create table

That's it! Only 2 tables needed.

### Create Tables via AWS CLI

```bash
# Create approved-devices table
aws dynamodb create-table \
  --table-name approved-devices \
  --attribute-definitions AttributeName=deviceId,AttributeType=S \
  --key-schema AttributeName=deviceId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create deductions table
aws dynamodb create-table \
  --table-name deductions \
  --attribute-definitions \
    AttributeName=date,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
  --key-schema \
    AttributeName=date,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

---

## Cost Estimates

**Monthly Costs (On-Demand Pricing):**
- `approved-devices`: ~1-5 devices = minimal cost (~$0.00)
- `deductions`: ~10 deductions/day = ~300 writes/month = ~$0.38

**Total estimated cost: $0.40/month**
