/**
 * Lambda Function: checkDevice
 *
 * Purpose: Check if a device ID is approved to access Moritz Tools
 * Trigger: API Gateway (POST /check-device)
 *
 * Environment Variables:
 * - (none required - table names are hardcoded)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const APPROVED_DEVICES_TABLE = 'approved-devices';

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // TODO: Change to https://bingobolt.com in production
    'Access-Control-Allow-Headers': 'Content-Type',
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

  const { deviceId } = body;

  // Validate deviceId
  if (!deviceId || typeof deviceId !== 'string') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing or invalid deviceId' }),
    };
  }

  // Check if device is approved
  try {
    const result = await docClient.send(new GetCommand({
      TableName: APPROVED_DEVICES_TABLE,
      Key: { deviceId },
    }));

    const approved = !!result.Item;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        approved,
        deviceId,
        deviceName: result.Item?.name || null,
      }),
    };
  } catch (error) {
    console.error('Error checking device approval:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
