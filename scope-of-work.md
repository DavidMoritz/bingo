# Scope of Work: Nintendo Switch Parental Controls Time Management System

## Project Overview

Build an AWS Lambda-based system that automates Nintendo Switch Parental Controls time limits with a punishment/deduction mechanism. The system will set a default daily play time and allow the parent to deduct minutes via API calls as punishment for misbehavior.

## Business Requirements

### Core Functionality

1. **Daily Time Allocation**
   - System automatically sets Nintendo Switch parental controls time limit each day
   - Default time is configurable (e.g., 60 minutes per day)
   - Runs on a scheduled basis (e.g., daily at 6:00 AM)

2. **Punishment/Deduction System**
   - Parent can trigger a "deduct time" event via API call
   - Deductions accumulate throughout the day
   - Final daily time = Default time - Total deductions
   - Deduction counter resets daily

3. **Deduction Tracking**
   - Store deductions in a database
   - Track history of deductions (timestamp, amount, optional reason)
   - Support for viewing deduction history

4. **API Interface**
   - RESTful API endpoint to trigger deductions
   - Simple interface (could be accessed via mobile app, Alexa skill, or direct HTTP call)
   - Authentication to prevent unauthorized deductions

## Technical Architecture

### AWS Services

1. **AWS Lambda**
   - Function 1: Scheduled daily time setter (triggered by EventBridge)
   - Function 2: Deduction handler (triggered by API Gateway)
   - Runtime: Node.js 18.x or later (for nxapi library compatibility)

2. **Amazon DynamoDB**
   - Table: Deductions
     - Partition Key: date (YYYY-MM-DD)
     - Sort Key: timestamp
     - Attributes: minutes, reason (optional), created_at
   - Table: Configuration
     - Store default time limit
     - Store Nintendo Account credentials (encrypted)

3. **API Gateway**
   - REST API endpoint: POST /deduct
   - Query parameters or body: minutes (integer), reason (optional string)
   - API key authentication

4. **Amazon EventBridge**
   - Scheduled rule to trigger daily time setter Lambda
   - Cron expression: cron(0 6 * * ? *) for 6 AM daily

5. **AWS Secrets Manager** (recommended)
   - Store Nintendo Account credentials securely
   - Store API Gateway API key

### Third-Party Integration

**Nintendo Switch Parental Controls API**
- Use reverse-engineered library: [nxapi](https://github.com/samuelthomas2774/nxapi)
- Requires Nintendo Account authentication
- API may change without notice (not officially supported)

## Implementation Requirements

### Phase 1: Core Infrastructure

1. **DynamoDB Tables Setup**
   - Create Deductions table with appropriate indexes
   - Create Configuration table
   - Set up TTL (Time To Live) on Deductions table to auto-delete old records (optional)

2. **Lambda Functions**
   - Create Lambda execution role with appropriate permissions:
     - DynamoDB read/write
     - Secrets Manager read
     - CloudWatch Logs write
   - Package nxapi library with Lambda deployment

3. **API Gateway**
   - Create REST API
   - Configure POST /deduct endpoint
   - Enable API key requirement
   - Set up CORS if needed for web interface

4. **EventBridge Rule**
   - Create scheduled rule for daily execution
   - Target: Daily time setter Lambda

### Phase 2: Lambda Function Logic

**Function 1: Daily Time Setter (`setDailyTime.js`)**

Pseudocode:
```
1. Retrieve configuration (default time)
2. Query DynamoDB for today's deductions
3. Calculate total deductions
4. Calculate final time: default - total_deductions
5. Authenticate with Nintendo Account (using nxapi)
6. Set parental control time limit for today
7. Log results to CloudWatch
8. (Optional) Send notification if time was heavily deducted
```

**Function 2: Deduction Handler (`deductTime.js`)**

Pseudocode:
```
1. Validate API request (API key, parameters)
2. Extract minutes and reason from request
3. Write deduction record to DynamoDB
   - date: today's date
   - timestamp: current timestamp
   - minutes: deduction amount
   - reason: optional reason text
4. Return success response with current total deductions
5. (Optional) Immediately recalculate and update Switch if before daily run
```

### Phase 3: Nintendo Account Integration

1. **Authentication Setup**
   - Use nxapi library to authenticate with Nintendo Account
   - Store session tokens in Secrets Manager or DynamoDB
   - Implement token refresh logic

2. **Parental Controls API Integration**
   - Identify correct child account
   - Set daily play time limit programmatically
   - Handle API errors and retries

3. **Testing**
   - Test authentication flow
   - Verify time limit updates on actual Switch console
   - Test edge cases (0 minutes, negative deductions, etc.)

### Phase 4: User Interface (Optional)

Create simple interface for triggering deductions:

**Option A: Web Dashboard**
- Static S3-hosted page
- Buttons: "Deduct 5 min", "Deduct 10 min", "Deduct 15 min"
- Shows current total deductions for the day
- View deduction history

**Option B: Mobile App Shortcut**
- iOS Shortcuts app integration
- Quick action to call API Gateway endpoint

**Option C: Alexa Skill**
- Voice command: "Alexa, deduct 5 minutes from Switch time"

## Deliverables

1. **AWS Infrastructure**
   - DynamoDB tables (Deductions, Configuration)
   - Lambda functions (setDailyTime, deductTime)
   - API Gateway REST API
   - EventBridge scheduled rule
   - Secrets Manager entries

2. **Code**
   - Lambda function code (Node.js)
   - Deployment package with dependencies (nxapi)
   - Infrastructure as Code (optional: CloudFormation or Terraform)

3. **Documentation**
   - Setup guide (how to configure Nintendo Account credentials)
   - API documentation (how to call deduction endpoint)
   - Troubleshooting guide
   - Architecture diagram

4. **Testing Evidence**
   - Successful daily time set on Switch console
   - Successful deduction via API call
   - Verification that time limit updates correctly

## Technical Specifications

### API Endpoint Specification

**POST /deduct**

Request:
```json
{
  "minutes": 5,
  "reason": "Did not obey immediately"
}
```

Response (Success):
```json
{
  "success": true,
  "deducted": 5,
  "totalDeductionsToday": 15,
  "finalTimeToday": 45,
  "message": "5 minutes deducted. Total deductions today: 15 minutes."
}
```

Response (Error):
```json
{
  "success": false,
  "error": "Invalid minutes value"
}
```

### DynamoDB Schema

**Deductions Table:**
```
{
  "date": "2026-01-11",           // Partition key
  "timestamp": "2026-01-11T14:30:00Z", // Sort key
  "minutes": 5,
  "reason": "Did not obey immediately"
}
```

**Configuration Table:**
```
{
  "key": "default_time",          // Partition key
  "value": 60
}
```

### Environment Variables

Lambda functions should use:
- `NINTENDO_CREDENTIALS_SECRET_NAME`: Name of Secrets Manager secret
- `DEDUCTIONS_TABLE_NAME`: DynamoDB table name
- `CONFIG_TABLE_NAME`: DynamoDB table name
- `DEFAULT_TIME_MINUTES`: Fallback default time

## Constraints & Considerations

### Technical Constraints

1. **Unofficial API Risk**
   - Nintendo may change their API at any time
   - No SLA or support from Nintendo
   - Must include error handling and notifications if API fails

2. **Authentication Complexity**
   - Nintendo authentication may require periodic re-authentication
   - Session tokens may expire

3. **Time Zone Handling**
   - Ensure consistent time zone usage (recommend UTC)
   - Daily reset should align with parent's local time zone

### Security Considerations

1. **API Gateway Security**
   - Require API key for all requests
   - Consider IP whitelisting
   - Rate limiting to prevent abuse

2. **Credential Storage**
   - Never store Nintendo credentials in plain text
   - Use AWS Secrets Manager or encrypted DynamoDB fields
   - Rotate credentials if compromised

3. **Data Privacy**
   - Minimize data collection
   - Consider data retention policy (auto-delete old deductions)

### Cost Considerations

**Estimated Monthly AWS Costs** (low usage):
- Lambda: $0.00 (within free tier)
- DynamoDB: $0.00 - $1.00 (on-demand pricing)
- API Gateway: $0.00 - $1.00 (within free tier)
- Secrets Manager: $0.40/month per secret
- EventBridge: $0.00 (within free tier)

**Total estimated cost: $0.40 - $2.00/month**

## Success Criteria

1. System successfully sets Nintendo Switch parental control time limit daily
2. Deduction API endpoint successfully reduces daily time allocation
3. Time limit on Switch console reflects calculated value (default - deductions)
4. System runs reliably for 30 consecutive days without manual intervention
5. Parent can trigger deductions within 30 seconds via simple interface

## Testing Plan

### Unit Tests
- Lambda function logic (calculate deductions, validate inputs)
- DynamoDB read/write operations

### Integration Tests
- End-to-end API call to deduction endpoint
- Scheduled Lambda execution
- Nintendo API authentication and time setting

### Manual Tests
1. Set default time to 60 minutes
2. Trigger 3 deductions (5 min each)
3. Wait for daily scheduled run
4. Verify Switch console shows 45 minutes limit
5. Verify next day resets to 60 minutes

## Future Enhancements (Out of Scope)

- Multi-child support (multiple Switch consoles)
- Reward system (add bonus minutes for good behavior)
- Weekly/monthly reporting dashboard
- Push notifications when time limit is set
- Integration with other smart home systems
- Mobile app for easier deduction management

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Nintendo changes API | High | Monitor nxapi library updates, implement error alerting |
| Lambda function fails | Medium | CloudWatch alarms, retry logic, manual fallback |
| Incorrect time calculation | Medium | Comprehensive testing, logging all calculations |
| Unauthorized API access | Low | API key authentication, IP whitelisting |
| AWS service outage | Low | Accept risk, manual control via Nintendo app |

## Timeline Estimate

- Phase 1 (Infrastructure): 4-6 hours
- Phase 2 (Lambda Logic): 6-8 hours
- Phase 3 (Nintendo Integration): 8-12 hours (includes testing/debugging)
- Phase 4 (UI - Optional): 4-6 hours
- Documentation: 2-4 hours

**Total: 24-36 hours** (3-5 days of development)

## References

- [nxapi GitHub Repository](https://github.com/samuelthomas2774/nxapi)
- [pynintendoparental PyPI](https://pypi.org/project/pynintendoparental/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [Nintendo Switch Parental Controls App](https://www.nintendo.com/us/switch/parental-controls/)

## Contact & Support

- Primary stakeholder: Parent (Nintendo Account owner)
- Target user: Child with Nintendo Switch 2 console
- Support channel: TBD (email, phone, etc.)
