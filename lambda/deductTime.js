/**
 * Lambda Function: deductTime
 *
 * Purpose: Record a time deduction in DynamoDB
 * Trigger: API Gateway (POST /deduct)
 *
 * Environment Variables:
 * - TIMEZONE (optional): Timezone for date calculation (default: America/New_York)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const DEDUCTIONS_TABLE = 'deductions';
const APPROVED_DEVICES_TABLE = 'approved-devices';
const TIMEZONE = process.env.TIMEZONE || 'America/New_York';
const DEFAULT_TIME_MINUTES = parseInt(process.env.DEFAULT_TIME_MINUTES || '60', 10);

/**
 * Get current date in YYYY-MM-DD format for the configured timezone
 */
function getTodayDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Returns YYYY-MM-DD
}

/**
 * Calculate TTL timestamp (30 days from now)
 */
function getTTL() {
  const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
  const thirtyDays = 30 * 24 * 60 * 60; // 30 days in seconds
  return now + thirtyDays;
}

/**
 * Get total deductions for today
 */
async function getTotalDeductions(date) {
  const result = await docClient.send(new QueryCommand({
    TableName: DEDUCTIONS_TABLE,
    KeyConditionExpression: '#date = :date',
    ExpressionAttributeNames: { '#date': 'date' },
    ExpressionAttributeValues: { ':date': date },
  }));

  const total = (result.Items || []).reduce((sum, item) => sum + (item.minutes || 0), 0);
  return { total, count: result.Items?.length || 0 };
}

/**
 * Get default time from environment variable
 */
function getDefaultTime() {
  return DEFAULT_TIME_MINUTES;
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // TODO: Change to https://bingobolt.com in production
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Get deviceId from x-api-key header
  const deviceId = event.headers['x-api-key'] || event.headers['X-Api-Key'];

  if (!deviceId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing x-api-key header (device ID)' }),
    };
  }

  // Verify device is approved
  try {
    const deviceCheck = await docClient.send(new GetCommand({
      TableName: APPROVED_DEVICES_TABLE,
      Key: { deviceId },
    }));

    if (!deviceCheck.Item) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Device not approved',
          deviceId,
        }),
      };
    }
  } catch (error) {
    console.error('Error checking device approval:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error verifying device' }),
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { minutes, reason } = body;

  // Validate minutes
  if (!minutes || typeof minutes !== 'number' || minutes <= 0 || minutes > 120) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid minutes value (must be number between 1 and 120)',
      }),
    };
  }

  // Get today's date and create deduction record
  const today = getTodayDate();
  const timestamp = new Date().toISOString();
  const ttl = getTTL();

  const deduction = {
    date: today,
    timestamp,
    minutes,
    deviceId,
    ttl,
    ...(reason && { reason }), // Only include reason if provided
  };

  try {
    // Save deduction to DynamoDB
    await docClient.send(new PutCommand({
      TableName: DEDUCTIONS_TABLE,
      Item: deduction,
    }));

    // Get updated totals
    const { total: totalDeductionsToday, count: deductionCount } = await getTotalDeductions(today);
    const defaultTime = getDefaultTime();
    const finalTimeToday = Math.max(0, defaultTime - totalDeductionsToday);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        deducted: minutes,
        totalDeductionsToday,
        deductionCount,
        defaultTime,
        finalTimeToday,
        message: `${minutes} minutes deducted. Total deductions today: ${totalDeductionsToday} minutes.`,
      }),
    };
  } catch (error) {
    console.error('Error saving deduction:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to save deduction',
        message: error.message,
      }),
    };
  }
};
