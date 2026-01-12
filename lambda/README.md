# Nintendo Switch Parental Controls Time Management - Lambda Functions

This directory contains the AWS Lambda functions for the Moritz Nintendo Switch time management system.

## Overview

This system allows a parent to:
1. Set a default daily play time for Nintendo Switch (e.g., 60 minutes)
2. Deduct time throughout the day as punishment for misbehavior
3. Automatically apply the calculated time limit (default - deductions) each morning

## Architecture

### Lambda Functions

1. **`checkDevice.js`** - Verify device approval
   - Trigger: API Gateway (POST /check-device)
   - Purpose: Check if a device ID exists in the approved-devices table
   - Used by: Frontend to gate access to Moritz Tools

2. **`deductTime.js`** - Record time deductions
   - Trigger: API Gateway (POST /deduct)
   - Purpose: Add deduction records to DynamoDB
   - Used by: Frontend deduction buttons (-5, -10, -15 min)

3. **`setDailyTime.js`** - Apply daily time limit
   - Trigger: EventBridge (daily @ 6 AM)
   - Purpose: Calculate total deductions and set Nintendo Switch time limit
   - Used by: Automated daily schedule

### DynamoDB Tables

See `DYNAMODB_SCHEMA.md` for full table definitions:

- **`approved-devices`** - Authorized device fingerprints
- **`deductions`** - Daily time deduction records

Default time limit is configured via `DEFAULT_TIME_MINUTES` environment variable (default: 60).

## Files

```
lambda/
├── README.md                 # This file
├── DEPLOYMENT.md             # Step-by-step AWS deployment guide
├── DYNAMODB_SCHEMA.md        # DynamoDB table schemas and setup
├── package.json              # Node.js dependencies
├── checkDevice.js            # Lambda: Check device approval
├── deductTime.js             # Lambda: Record time deduction
└── setDailyTime.js           # Lambda: Set daily Nintendo time limit
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Infrastructure

Follow the detailed instructions in `DEPLOYMENT.md` to:
- Create DynamoDB tables
- Create IAM roles
- Deploy Lambda functions
- Set up API Gateway
- Configure EventBridge scheduler

### 3. Test Functions

Each Lambda function can be tested directly in the AWS Console with test events.

**Example test for `deductTime`:**
```json
{
  "httpMethod": "POST",
  "headers": {
    "x-api-key": "your-device-id-here"
  },
  "body": "{\"minutes\": 5, \"reason\": \"Test deduction\"}"
}
```

## Environment Variables

### `checkDevice`
- No environment variables required

### `deductTime`
- `TIMEZONE` (optional): Timezone for date calculation (default: `America/New_York`)
- `DEFAULT_TIME_MINUTES` (optional): Default daily time in minutes (default: 60)

### `setDailyTime`
- `NINTENDO_EMAIL`: Your Nintendo account email **(required)**
- `NINTENDO_PASSWORD`: Your Nintendo account password **(required)**
- `DEFAULT_TIME_MINUTES` (optional): Default daily time in minutes (default: 60)
- `TIMEZONE` (optional): Timezone for date calculation (default: `America/New_York`)

**IMPORTANT:** Keep credentials as `<INSERT-EMAIL>` and `<INSERT-PASSWORD>` in the repo. Set real values only in AWS Lambda environment variables.

## Device Fingerprinting

The frontend uses device fingerprinting to create a stable device identifier based on:
- User agent
- Browser language
- Platform
- Screen resolution
- Timezone
- Hardware concurrency
- Device memory
- Touch points

The fingerprint is hashed with SHA-256 to create a 64-character device ID that's checked against the `approved-devices` table.

## Security

**Device Authorization:**
- Only approved devices can access Moritz Tools
- Device IDs must be manually added to DynamoDB
- Each deduction requires a valid device ID in the `x-api-key` header

**API Protection:**
- CORS restricts browser-based access
- Device approval prevents unauthorized deductions
- Rate limiting recommended in API Gateway

**Credential Storage:**
- Nintendo credentials stored as Lambda environment variables
- Not exposed to frontend or API responses
- Never committed to the repository

## Nintendo API Integration

The `setDailyTime` function currently has **placeholder code** for Nintendo API integration. To complete this:

1. Install the `nxapi` library (reverse-engineered Nintendo API)
2. Implement authentication using `NINTENDO_EMAIL` and `NINTENDO_PASSWORD` environment variables
3. Implement actual API calls in `setDailyTime.js` to set parental control time

See: https://github.com/samuelthomas2774/nxapi

**Note:** This API is unofficial and may change without notice.

## Data Flow

### Deduction Flow
```
User clicks "-5 min" button
    ↓
Frontend calls POST /deduct with deviceId as x-api-key header
    ↓
API Gateway triggers deductTime Lambda
    ↓
Lambda verifies device is approved
    ↓
Lambda writes deduction to DynamoDB
    ↓
Lambda returns success + updated totals
    ↓
Frontend displays confirmation
```

### Daily Time Setting Flow
```
EventBridge triggers setDailyTime Lambda at 6 AM
    ↓
Lambda reads default time from environment variable (DEFAULT_TIME_MINUTES)
    ↓
Lambda queries all deductions for today
    ↓
Lambda calculates: finalTime = defaultTime - totalDeductions
    ↓
Lambda authenticates with Nintendo API using credentials (via nxapi)
    ↓
Lambda sets parental control time limit
    ↓
Nintendo Switch updates time limit
```

## Cost

**Estimated monthly cost: ~$0.40**

- Lambda: Free tier (minimal invocations)
- DynamoDB: ~$0.40 (on-demand, 2 tables, light usage)
- API Gateway: Free tier
- EventBridge: Free tier

## Troubleshooting

### Deductions Not Saving
- Check CloudWatch logs for `deductTime` Lambda
- Verify IAM role has DynamoDB write permissions
- Ensure device is approved in `approved-devices` table

### Daily Time Not Setting
- Check CloudWatch logs for `setDailyTime` Lambda
- Verify EventBridge rule is enabled
- Confirm Nintendo credentials are set in environment variables
- Note: nxapi integration must be implemented first

### Device Not Approved
- Verify device ID in `approved-devices` DynamoDB table
- Check that hash matches exactly
- Try clearing browser localStorage and regenerating device ID

## Development

### Local Testing
Lambda functions can be tested locally using the AWS SAM CLI or by creating test events in the Lambda console.

### Deployment
After making changes:
1. Update the Lambda function code
2. Re-package with dependencies: `zip -r functionName.zip functionName.js node_modules/`
3. Upload to AWS Lambda via console or CLI

### Logs
All Lambda functions write to CloudWatch Logs. Check there for debugging information.

## Next Steps

1. ✅ Deploy DynamoDB tables
2. ✅ Deploy Lambda functions
3. ✅ Create API Gateway endpoints
4. ✅ Configure EventBridge schedule
5. ⏳ Approve your first device
6. ⏳ Test time deductions
7. ⏳ Implement nxapi integration
8. ⏳ Test on actual Nintendo Switch

---

For detailed deployment instructions, see **DEPLOYMENT.md**.

For DynamoDB schema details, see **DYNAMODB_SCHEMA.md**.
