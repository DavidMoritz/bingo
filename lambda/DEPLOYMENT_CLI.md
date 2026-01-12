# CLI Deployment Instructions
## Nintendo Switch Parental Controls Time Management System

This guide provides **exact AWS CLI commands** for deploying the complete infrastructure. Copy and paste these commands into your terminal.

---

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- Node.js 18.x or later installed
- Access to your Nintendo Account credentials
- Current directory: Project root (`/Users/davidmoritz/Code/react/bingo`)

---

## Phase 1: Create DynamoDB Tables

✅ **Already completed!** You've created:
- `approved-devices` table
- `deductions` table with TTL enabled

---

## Phase 2: Create IAM Role for Lambda Functions

### Step 1: Create Trust Policy

```bash
cat > lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

### Step 2: Create IAM Role

```bash
aws iam create-role \
  --role-name MoritzNintendoLambdaRole \
  --assume-role-policy-document file://lambda-trust-policy.json
```

### Step 3: Attach CloudWatch Logs Policy

```bash
aws iam attach-role-policy \
  --role-name MoritzNintendoLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### Step 4: Create DynamoDB Access Policy

```bash
cat > dynamodb-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:728935397829:table/approved-devices",
        "arn:aws:dynamodb:us-east-1:728935397829:table/deductions"
      ]
    }
  ]
}
EOF
```

### Step 5: Attach DynamoDB Policy to Role

```bash
aws iam put-role-policy \
  --role-name MoritzNintendoLambdaRole \
  --policy-name DynamoDBAccessPolicy \
  --policy-document file://dynamodb-policy.json
```

---

## Phase 3: Package Lambda Functions

### Step 1: Navigate to Lambda Directory

```bash
cd lambda
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Deployment Packages

```bash
# Package checkDevice
zip -r checkDevice.zip checkDevice.js node_modules/

# Package deductTime
zip -r deductTime.zip deductTime.js node_modules/

# Package setDailyTime
zip -r setDailyTime.zip setDailyTime.js node_modules/
```

You should now have three `.zip` files in the `lambda/` directory.

---

## Phase 4: Deploy Lambda Functions

### Step 1: Get IAM Role ARN

```bash
ROLE_ARN=$(aws iam get-role --role-name MoritzNintendoLambdaRole --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"
```

**Note:** Wait 10-15 seconds after creating the role before deploying Lambdas to allow IAM propagation.

### Step 2: Create checkDevice Lambda

```bash
aws lambda create-function \
  --function-name checkDevice \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler checkDevice.handler \
  --zip-file fileb://checkDevice.zip \
  --timeout 10 \
  --description "Check if device is approved for Moritz Tools access"
```

### Step 3: Create deductTime Lambda

```bash
aws lambda create-function \
  --function-name deductTime \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler deductTime.handler \
  --zip-file fileb://deductTime.zip \
  --timeout 10 \
  --environment "Variables={TIMEZONE=America/New_York,DEFAULT_TIME_MINUTES=60}" \
  --description "Record time deduction for Nintendo Switch"
```

### Step 4: Create setDailyTime Lambda

**IMPORTANT:** Replace `<INSERT-EMAIL>` and `<INSERT-PASSWORD>` with your actual Nintendo account credentials before running this command.

```bash
aws lambda create-function \
  --function-name setDailyTime \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler setDailyTime.handler \
  --zip-file fileb://setDailyTime.zip \
  --timeout 30 \
  --environment "Variables={NINTENDO_EMAIL=<INSERT-EMAIL>,NINTENDO_PASSWORD=<INSERT-PASSWORD>,DEFAULT_TIME_MINUTES=60,TIMEZONE=America/New_York}" \
  --description "Set daily Nintendo Switch time limit based on deductions"
```

---

## Phase 5: Create API Gateway

### Step 1: Create REST API

```bash
API_ID=$(aws apigateway create-rest-api \
  --name MoritzNintendoAPI \
  --description "API for Nintendo Switch time management" \
  --endpoint-configuration types=REGIONAL \
  --query 'id' \
  --output text)

echo "API ID: $API_ID"
```

### Step 2: Get Root Resource ID

```bash
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[0].id' \
  --output text)

echo "Root Resource ID: $ROOT_ID"
```

### Step 3: Create /check-device Resource

```bash
CHECK_DEVICE_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part check-device \
  --query 'id' \
  --output text)

echo "check-device Resource ID: $CHECK_DEVICE_RESOURCE_ID"
```

### Step 4: Create POST Method for /check-device

```bash
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CHECK_DEVICE_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE
```

### Step 5: Integrate /check-device with checkDevice Lambda

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)

# Create integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CHECK_DEVICE_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:checkDevice/invocations"
```

### Step 6: Grant API Gateway Permission to Invoke checkDevice Lambda

```bash
aws lambda add-permission \
  --function-name checkDevice \
  --statement-id apigateway-checkDevice \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*/check-device"
```

### Step 7: Enable CORS for /check-device

```bash
# Create OPTIONS method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CHECK_DEVICE_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE

# Create MOCK integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CHECK_DEVICE_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}'

# Create OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $CHECK_DEVICE_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": false, "method.response.header.Access-Control-Allow-Methods": false, "method.response.header.Access-Control-Allow-Origin": false}'

# Create OPTIONS integration response
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $CHECK_DEVICE_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "\"Content-Type,x-api-key\"", "method.response.header.Access-Control-Allow-Methods": "\"POST,OPTIONS\"", "method.response.header.Access-Control-Allow-Origin": "\"*\""}'
```

### Step 8: Create /deduct Resource

```bash
DEDUCT_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part deduct \
  --query 'id' \
  --output text)

echo "deduct Resource ID: $DEDUCT_RESOURCE_ID"
```

### Step 9: Create POST Method for /deduct

```bash
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $DEDUCT_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE
```

### Step 10: Integrate /deduct with deductTime Lambda

```bash
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $DEDUCT_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:deductTime/invocations"
```

### Step 11: Grant API Gateway Permission to Invoke deductTime Lambda

```bash
aws lambda add-permission \
  --function-name deductTime \
  --statement-id apigateway-deductTime \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*/deduct"
```

### Step 12: Enable CORS for /deduct

```bash
# Create OPTIONS method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $DEDUCT_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE

# Create MOCK integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $DEDUCT_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}'

# Create OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $DEDUCT_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": false, "method.response.header.Access-Control-Allow-Methods": false, "method.response.header.Access-Control-Allow-Origin": false}'

# Create OPTIONS integration response
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $DEDUCT_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "\"Content-Type,x-api-key\"", "method.response.header.Access-Control-Allow-Methods": "\"POST,OPTIONS\"", "method.response.header.Access-Control-Allow-Origin": "\"*\""}'
```

### Step 13: Deploy API

```bash
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --stage-description "Production stage" \
  --description "Initial deployment"
```

### Step 14: Get API Gateway URL

```bash
API_URL="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"
echo "API Gateway URL: $API_URL"
echo ""
echo "Endpoints:"
echo "  - POST $API_URL/check-device"
echo "  - POST $API_URL/deduct"
```

**Save this URL!** You'll need it for the frontend configuration.

---

## Phase 6: Create EventBridge Schedule

### Step 1: Create EventBridge Rule

```bash
aws events put-rule \
  --name SetNintendoTimeDailyAt6AM \
  --description "Trigger setDailyTime Lambda every day at 6 AM EST" \
  --schedule-expression "cron(0 11 * * ? *)"
```

**Note:** `cron(0 11 * * ? *)` = 11:00 UTC = 6:00 AM EST (adjust timezone offset as needed)

### Step 2: Grant EventBridge Permission to Invoke Lambda

```bash
aws lambda add-permission \
  --function-name setDailyTime \
  --statement-id eventbridge-daily-trigger \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:$ACCOUNT_ID:rule/SetNintendoTimeDailyAt6AM"
```

### Step 3: Add Lambda as Target

```bash
aws events put-targets \
  --rule SetNintendoTimeDailyAt6AM \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:setDailyTime"
```

---

## Phase 7: Configure Frontend

### Step 1: Update Environment Variable

Create or update `front/.env.local`:

```bash
cd ../front
cat > .env.local << EOF
VITE_MORITZ_API_URL=$API_URL
EOF
```

### Step 2: Restart Frontend

```bash
# If dev server is running, restart it
npm run dev
```

---

## Phase 8: Approve Your First Device

### Step 1: Visit Moritz Tools Page

Navigate to: `http://localhost:5173/moritz-tools?code=anerinack`

You'll see a "Device Not Approved" screen with a device ID like:
```
a3f2b9c1e5d8f7a2b4c6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5
```

### Step 2: Copy the Device ID

Copy the full device ID from the page.

### Step 3: Add Device to DynamoDB

**Replace `<YOUR-DEVICE-ID>` with the actual device ID from step 2:**

```bash
aws dynamodb put-item \
  --table-name approved-devices \
  --item '{
    "deviceId": {"S": "<YOUR-DEVICE-ID>"},
    "name": {"S": "My Primary Device"},
    "addedAt": {"S": "'"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"'"},
    "addedBy": {"S": "admin"}
  }'
```

### Step 4: Refresh the Page

Refresh the Moritz Tools page - you should now see the time deduction controls!

---

## Testing

### Test checkDevice Lambda

```bash
aws lambda invoke \
  --function-name checkDevice \
  --payload '{"httpMethod":"POST","body":"{\"deviceId\":\"<YOUR-DEVICE-ID>\"}"}' \
  response.json && cat response.json && echo ""
```

### Test deductTime Lambda

```bash
aws lambda invoke \
  --function-name deductTime \
  --payload '{"httpMethod":"POST","headers":{"x-api-key":"<YOUR-DEVICE-ID>"},"body":"{\"minutes\":5,\"reason\":\"Test deduction\"}"}' \
  response.json && cat response.json && echo ""
```

### Test setDailyTime Lambda

```bash
aws lambda invoke \
  --function-name setDailyTime \
  --payload '{"source":"aws.events"}' \
  response.json && cat response.json && echo ""
```

### View CloudWatch Logs

```bash
# View logs for checkDevice
aws logs tail /aws/lambda/checkDevice --follow

# View logs for deductTime
aws logs tail /aws/lambda/deductTime --follow

# View logs for setDailyTime
aws logs tail /aws/lambda/setDailyTime --follow
```

---

## Cleanup (Optional)

If you need to delete everything:

```bash
# Delete Lambda functions
aws lambda delete-function --function-name checkDevice
aws lambda delete-function --function-name deductTime
aws lambda delete-function --function-name setDailyTime

# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete EventBridge rule
aws events remove-targets --rule SetNintendoTimeDailyAt6AM --ids 1
aws events delete-rule --name SetNintendoTimeDailyAt6AM

# Delete IAM role policies
aws iam delete-role-policy --role-name MoritzNintendoLambdaRole --policy-name DynamoDBAccessPolicy
aws iam detach-role-policy --role-name MoritzNintendoLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name MoritzNintendoLambdaRole

# Delete DynamoDB tables
aws dynamodb delete-table --table-name approved-devices
aws dynamodb delete-table --table-name deductions

# Clean up local files
rm lambda-trust-policy.json dynamodb-policy.json response.json
```

---

## Summary of Environment Variables

Save these for reference:

```bash
# API Gateway
echo "API_ID: $API_ID"
echo "API_URL: $API_URL"

# Account
echo "ACCOUNT_ID: $ACCOUNT_ID"

# IAM
echo "ROLE_ARN: $ROLE_ARN"
```

---

## Troubleshooting

### IAM Role Not Ready
If you get "role not found" errors when creating Lambdas, wait 10-15 seconds and try again.

### CORS Errors
Ensure you completed Steps 7 and 12 in Phase 5 (CORS setup).

### Lambda Can't Access DynamoDB
Verify the DynamoDB policy has the correct table ARNs for your account.

### EventBridge Not Triggering
Check the cron expression matches your desired timezone. UTC offsets:
- 6 AM EST = `cron(0 11 * * ? *)`
- 6 AM PST = `cron(0 14 * * ? *)`
- 6 AM CST = `cron(0 12 * * ? *)`

---

## Next Steps

1. ✅ Test device approval flow
2. ✅ Test time deduction via frontend
3. ⏳ Implement nxapi Nintendo API integration in `setDailyTime.js`
4. ⏳ Test on actual Nintendo Switch console
5. ⏳ Deploy frontend to production (Amplify)

For Nintendo API integration, see: https://github.com/samuelthomas2774/nxapi
