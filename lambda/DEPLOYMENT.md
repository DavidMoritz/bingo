# Deployment Instructions
## Nintendo Switch Parental Controls Time Management System

This guide walks you through deploying the complete AWS infrastructure for the Moritz Nintendo Switch time management system.

---

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18.x or later installed locally
- Access to your Nintendo Account credentials

---

## Phase 1: Create DynamoDB Tables

Follow the instructions in `DYNAMODB_SCHEMA.md` to create the two required tables:

### Quick Setup via AWS Console

1. **Go to DynamoDB Console** → Tables → Create table

2. **Create `approved-devices` table:**
   - Table name: `approved-devices`
   - Partition key: `deviceId` (String)
   - Billing mode: On-demand
   - Click "Create table"

3. **Create `deductions` table:**
   - Table name: `deductions`
   - Partition key: `date` (String)
   - Sort key: `timestamp` (String)
   - Billing mode: On-demand
   - Click "Create table"
   - After creation: Go to table → Additional settings → Enable TTL
     - TTL attribute: `ttl`

That's it! Only 2 tables needed. The default time limit is configured via environment variables.

---

## Phase 2: Create IAM Role for Lambda Functions

Lambda functions need permissions to access DynamoDB tables.

### Via AWS Console

1. **Go to IAM Console** → Roles → Create role
2. **Select trusted entity:** AWS service → Lambda
3. **Attach permissions policies:**
   - `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)
4. **Click "Next"**
5. **Role name:** `MoritzNintendoLambdaRole`
6. **Click "Create role"**

7. **Add DynamoDB permissions:**
   - Go back to the role you just created
   - Add permissions → Create inline policy
   - JSON editor:
     ```json
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
             "arn:aws:dynamodb:*:*:table/approved-devices",
             "arn:aws:dynamodb:*:*:table/deductions"
           ]
         }
       ]
     }
     ```
   - Policy name: `DynamoDBAccessPolicy`
   - Click "Create policy"

---

## Phase 3: Package and Deploy Lambda Functions

### Step 1: Install Dependencies

```bash
cd lambda
npm install
```

This installs the AWS SDK v3 packages needed by all Lambda functions.

### Step 2: Create Deployment Packages

Create a ZIP file for each Lambda function:

```bash
# From the lambda/ directory

# Package checkDevice
zip -r checkDevice.zip checkDevice.js node_modules/

# Package deductTime
zip -r deductTime.zip deductTime.js node_modules/

# Package setDailyTime
zip -r setDailyTime.zip setDailyTime.js node_modules/
```

### Step 3: Deploy Lambda Functions via AWS Console

#### Lambda 1: checkDevice

1. **Go to Lambda Console** → Create function
2. **Function name:** `checkDevice`
3. **Runtime:** Node.js 18.x
4. **Architecture:** x86_64
5. **Execution role:** Use existing role → `MoritzNintendoLambdaRole`
6. **Click "Create function"**
7. **Upload code:**
   - Code source → Upload from → .zip file
   - Upload `checkDevice.zip`
   - Click "Save"
8. **Configuration:**
   - Timeout: 10 seconds (Configuration → General configuration → Edit)

#### Lambda 2: deductTime

1. **Go to Lambda Console** → Create function
2. **Function name:** `deductTime`
3. **Runtime:** Node.js 18.x
4. **Architecture:** x86_64
5. **Execution role:** Use existing role → `MoritzNintendoLambdaRole`
6. **Click "Create function"**
7. **Upload code:**
   - Upload `deductTime.zip`
8. **Configuration:**
   - Timeout: 10 seconds
9. **Environment variables:**
   - Key: `TIMEZONE`, Value: `America/New_York` (or your timezone - optional)
   - Key: `DEFAULT_TIME_MINUTES`, Value: `60` (or your desired default - optional)

#### Lambda 3: setDailyTime

1. **Go to Lambda Console** → Create function
2. **Function name:** `setDailyTime`
3. **Runtime:** Node.js 18.x
4. **Architecture:** x86_64
5. **Execution role:** Use existing role → `MoritzNintendoLambdaRole`
6. **Click "Create function"**
7. **Upload code:**
   - Upload `setDailyTime.zip`
8. **Configuration:**
   - Timeout: 30 seconds (Nintendo API calls may take longer)
9. **Environment variables:**
   - Key: `NINTENDO_EMAIL`, Value: `<your-nintendo-email>` **(required)**
   - Key: `NINTENDO_PASSWORD`, Value: `<your-nintendo-password>` **(required)**
   - Key: `DEFAULT_TIME_MINUTES`, Value: `60` (optional, defaults to 60)
   - Key: `TIMEZONE`, Value: `America/New_York` (optional, defaults to America/New_York)

**IMPORTANT:** Replace `<your-nintendo-email>` and `<your-nintendo-password>` with your actual Nintendo account credentials when you deploy. Keep these as `<INSERT-EMAIL>` and `<INSERT-PASSWORD>` in the repo.

---

## Phase 4: Create API Gateway

### Step 1: Create REST API

1. **Go to API Gateway Console** → Create API
2. **Choose:** REST API (not private) → Build
3. **API name:** `MoritzNintendoAPI`
4. **Endpoint type:** Regional
5. **Click "Create API"**

### Step 2: Create `/check-device` Endpoint

1. **Actions** → Create Resource
   - Resource Name: `check-device`
   - Resource Path: `/check-device`
   - Enable CORS: ✓ (check the box)
   - Click "Create Resource"

2. **With `/check-device` selected** → Actions → Create Method → POST
   - Integration type: Lambda Function
   - Lambda Region: (your region)
   - Lambda Function: `checkDevice`
   - Click "Save"
   - Grant permission: OK

3. **Enable CORS:**
   - Select `/check-device` → Actions → Enable CORS
   - Accept defaults → Enable CORS and replace existing headers
   - Confirm

### Step 3: Create `/deduct` Endpoint

1. **Actions** → Create Resource
   - Resource Name: `deduct`
   - Resource Path: `/deduct`
   - Enable CORS: ✓
   - Click "Create Resource"

2. **With `/deduct` selected** → Actions → Create Method → POST
   - Integration type: Lambda Function
   - Lambda Function: `deductTime`
   - Click "Save"
   - Grant permission: OK

3. **Enable CORS:**
   - Select `/deduct` → Actions → Enable CORS
   - Accept defaults → Enable CORS

### Step 4: Deploy API

1. **Actions** → Deploy API
2. **Deployment stage:** [New Stage]
3. **Stage name:** `prod`
4. **Click "Deploy"**

5. **Copy the Invoke URL:**
   - It will look like: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`
   - You'll need this for the frontend configuration

---

## Phase 5: Configure EventBridge for Daily Trigger

1. **Go to EventBridge Console** → Rules → Create rule
2. **Rule name:** `SetNintendoTimeDailyAt6AM`
3. **Rule type:** Schedule
4. **Click "Continue in EventBridge Scheduler"** (or stay in EventBridge)

**If using EventBridge Scheduler (recommended):**
1. **Schedule name:** `SetNintendoTimeDailyAt6AM`
2. **Schedule pattern:** Recurring schedule
3. **Cron expression:** `0 6 * * ? *` (6 AM daily UTC)
   - Adjust for your timezone if needed
   - For 6 AM EST: `0 11 * * ? *` (11 AM UTC = 6 AM EST)
4. **Target:** Lambda function
5. **Lambda function:** `setDailyTime`
6. **Retry policy:** Default
7. **Create schedule**

**If using EventBridge Rules:**
1. **Schedule pattern:** Cron expression
2. **Cron expression:** `0 6 * * ? *`
3. **Target:** Lambda function → `setDailyTime`
4. **Create rule**

---

## Phase 6: Configure Frontend

Update your frontend environment variables to point to the API Gateway endpoint.

### Option 1: Local Development

Create or update `front/.env.local`:

```bash
VITE_MORITZ_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
```

Replace `abc123xyz.execute-api.us-east-1.amazonaws.com` with your actual API Gateway URL.

### Option 2: Production (Amplify)

1. Go to Amplify Console → Your app → Environment variables
2. Add: `VITE_MORITZ_API_URL` = `https://your-api-gateway-url.com/prod`

---

## Phase 7: Approve Your First Device

1. **Visit the Moritz Tools page:**
   - `http://localhost:5173/moritz-tools?code=anerinack` (local)
   - `https://bingobolt.com/moritz-tools?code=anerinack` (production)

2. **You'll see a "Device Not Approved" screen with a device ID like:**
   ```
   a3f2b9c1e5d8f7a2b4c6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5
   ```

3. **Copy that device ID**

4. **Go to DynamoDB Console** → Tables → `approved-devices` → "Explore table items" → "Create item"

5. **Add the device:**
   ```json
   {
     "deviceId": "a3f2b9c1e5d8f7a2b4c6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5",
     "name": "David's iPhone",
     "addedAt": "2026-01-11T14:30:00.000Z",
     "addedBy": "admin"
   }
   ```

6. **Refresh the Moritz Tools page** → You should now see the time deduction controls!

---

## Phase 8: Test the System

### Test Device Approval

1. Visit `/moritz-tools?code=anerinack`
2. Verify you see the deduction controls (not the "Device Not Approved" message)

### Test Time Deduction (Manual)

1. **Go to Lambda Console** → `deductTime` → Test
2. **Create a test event:**
   ```json
   {
     "httpMethod": "POST",
     "headers": {
       "x-api-key": "a3f2b9c1e5d8f7a2b4c6e8f1a3b5c7d9e2f4a6b8c1d3e5f7a9b2c4d6e8f1a3b5"
     },
     "body": "{\"minutes\": 5, \"reason\": \"Test deduction\"}"
   }
   ```
3. **Run the test** → Check CloudWatch logs and DynamoDB `deductions` table

### Test Daily Time Setter (Manual)

1. **Go to Lambda Console** → `setDailyTime` → Test
2. **Create a test event:**
   ```json
   {
     "source": "aws.events"
   }
   ```
3. **Run the test** → Check CloudWatch logs for calculation output

### Test EventBridge Schedule

Wait until 6 AM (or your scheduled time) and check:
- CloudWatch Logs for `setDailyTime` Lambda
- Verify it calculated deductions correctly

---

## Phase 9: Nintendo API Integration (Future)

The `setDailyTime` Lambda currently has placeholder code for the Nintendo API integration. To complete this:

1. **Research the nxapi library:**
   - https://github.com/samuelthomas2774/nxapi
   - This is a reverse-engineered library for Nintendo's API

2. **Install nxapi in your Lambda:**
   ```bash
   cd lambda
   npm install nxapi
   # Re-package setDailyTime.zip with the nxapi dependency
   ```

3. **Authenticate once manually:**
   - Run nxapi locally to get session tokens
   - Store session tokens in DynamoDB `configuration` table

4. **Update `setDailyTime.js`:**
   - Uncomment the nxapi integration code
   - Implement actual API calls to set parental control time

5. **Test thoroughly:**
   - Verify time limits update on your actual Nintendo Switch console

**WARNING:** Nintendo's API is unofficial and may change without notice. Monitor the nxapi repository for updates.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          User (Parent)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 1. Visit /moritz-tools?code=anerinack
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Bingo Bolt Frontend (React)                   │
│  - Device fingerprinting (SHA-256 hash)                         │
│  - Checks device approval via API                               │
│  - Shows deduction buttons (-5, -10, -15 min)                   │
└──────────────┬───────────────────────┬──────────────────────────┘
               │                       │
               │ 2. POST /check-device │ 3. POST /deduct
               │    {deviceId}         │    {minutes, reason}
               ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│  API Gateway             │  │  API Gateway                     │
│  /check-device           │  │  /deduct                         │
└──────────┬───────────────┘  └────────────┬─────────────────────┘
           │                               │
           │ 4. Invoke                     │ 6. Invoke
           ▼                               ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│  Lambda: checkDevice     │  │  Lambda: deductTime              │
│  - Query approved-devices│  │  - Verify device approved        │
│  - Return approval status│  │  - Write to deductions table     │
└──────────┬───────────────┘  └────────────┬─────────────────────┘
           │                               │
           │ 5. Query                      │ 7. Write deduction
           ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DynamoDB Tables                         │
│  ┌──────────────────┐           ┌──────────────┐               │
│  │ approved-devices │           │  deductions  │               │
│  │  - deviceId (PK) │           │  - date (PK) │               │
│  │  - name          │           │  - timestamp │               │
│  └──────────────────┘           └──────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                           ▲
                           │ 8. Daily @ 6 AM
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│  EventBridge Scheduler: cron(0 6 * * ? *)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 9. Trigger
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Lambda: setDailyTime                                           │
│  1. Get default time (60 min)                                   │
│  2. Query today's deductions                                    │
│  3. Calculate: final = default - totalDeductions                │
│  4. Call Nintendo API via nxapi                                 │
│  5. Set parental control time limit                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 10. Set time limit
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         Nintendo Switch 2 Parental Controls API (nxapi)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Estimate

**Monthly AWS Costs (light usage):**
- Lambda: $0.00 (within free tier)
  - checkDevice: ~100 requests/month
  - deductTime: ~50 requests/month
  - setDailyTime: 30 requests/month (daily)
- DynamoDB: $0.40 - $1.00 (on-demand)
  - approved-devices: minimal reads
  - deductions: ~50 writes/month
  - configuration: minimal reads
- API Gateway: $0.00 - $0.50 (within free tier for low usage)
- EventBridge: $0.00 (within free tier)

**Total: $0.40 - $1.50/month**

---

## Troubleshooting

### Device Not Approved (even after adding to DynamoDB)

1. Check that the deviceId in DynamoDB exactly matches the one shown on the page
2. Clear browser localStorage and refresh to regenerate device ID
3. Check API Gateway logs to see if the checkDevice Lambda is being called
4. Verify CORS is enabled on API Gateway

### Deduction Button Does Nothing

1. Check browser console for errors
2. Verify API Gateway URL is correct in environment variables
3. Check Lambda CloudWatch logs for errors
4. Verify device is approved

### Daily Time Not Setting

1. Check EventBridge rule is enabled and scheduled correctly
2. Check `setDailyTime` CloudWatch logs at scheduled time
3. Verify Nintendo credentials are set correctly in environment variables
4. Nintendo API integration is currently a placeholder - implement nxapi first

### CORS Errors

1. Ensure CORS is enabled on all API Gateway endpoints
2. Check that Lambda functions return proper CORS headers
3. Verify `Access-Control-Allow-Origin` matches your frontend domain

---

## Security Considerations

**Production Improvements:**

1. **Update CORS origins:**
   - Change `Access-Control-Allow-Origin: *` to `https://bingobolt.com`

2. **Rate limiting:**
   - Add API Gateway usage plans to prevent abuse

3. **IP whitelisting (optional):**
   - Restrict API Gateway access to your home IP

4. **Monitor CloudWatch Logs:**
   - Set up alarms for errors or unusual activity

5. **Nintendo credentials:**
   - Never commit real credentials to the repo
   - Use environment variables in Lambda

---

## Maintenance

### Update Default Time

1. Go to Lambda Console → `setDailyTime` function
2. Configuration → Environment variables → Edit
3. Update `DEFAULT_TIME_MINUTES` to desired value
4. Save changes

### Approve New Device

1. Visit `/moritz-tools?code=anerinack` on the new device
2. Copy the device ID shown
3. Add to DynamoDB `approved-devices` table

### View Deduction History

1. Go to DynamoDB → `deductions` table
2. Query by date (YYYY-MM-DD format)
3. Review all deductions for that day

---

## Next Steps

1. ✅ Deploy infrastructure (DynamoDB, Lambda, API Gateway, EventBridge)
2. ✅ Test device approval flow
3. ✅ Test time deduction via frontend
4. ⏳ Implement nxapi Nintendo API integration
5. ⏳ Test on actual Nintendo Switch console
6. ⏳ Deploy frontend to production (Amplify)
7. ⏳ Monitor for 30 days to ensure reliability

---

## Support

For issues or questions:
- Check CloudWatch Logs for error messages
- Review DynamoDB tables for data integrity
- Verify API Gateway endpoints are accessible
- Consult nxapi documentation for Nintendo API issues
