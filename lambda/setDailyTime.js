/**
 * Lambda Function: setDailyTime
 *
 * Purpose: Set Nintendo Switch parental control time limit based on default time minus deductions
 * Trigger: EventBridge scheduled rule (daily at 6 AM)
 *
 * Environment Variables:
 * - NINTENDO_EMAIL: Nintendo account email
 * - NINTENDO_PASSWORD: Nintendo account password
 * - DEFAULT_TIME_MINUTES (optional): Default daily time in minutes (default: 60)
 * - TIMEZONE (optional): Timezone for date calculation (default: America/New_York)
 *
 * Dependencies:
 * - nxapi: npm install nxapi (for Nintendo API integration)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const DEDUCTIONS_TABLE = 'deductions';
const TIMEZONE = process.env.TIMEZONE || 'America/New_York';
const DEFAULT_TIME_MINUTES = parseInt(process.env.DEFAULT_TIME_MINUTES || '60', 10);

// Nintendo credentials from environment variables
const NINTENDO_EMAIL = process.env.NINTENDO_EMAIL || '<INSERT-EMAIL>';
const NINTENDO_PASSWORD = process.env.NINTENDO_PASSWORD || '<INSERT-PASSWORD>';

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
 * Get total deductions for a specific date
 */
async function getTotalDeductions(date) {
  const result = await docClient.send(new QueryCommand({
    TableName: DEDUCTIONS_TABLE,
    KeyConditionExpression: '#date = :date',
    ExpressionAttributeNames: { '#date': 'date' },
    ExpressionAttributeValues: { ':date': date },
  }));

  const total = (result.Items || []).reduce((sum, item) => sum + (item.minutes || 0), 0);
  return { total, count: result.Items?.length || 0, items: result.Items || [] };
}

/**
 * Get default time from environment variable
 */
function getDefaultTime() {
  return DEFAULT_TIME_MINUTES;
}

/**
 * Authenticate with Nintendo and set parental control time limit
 *
 * NOTE: This is a placeholder implementation.
 * You will need to install and configure the nxapi library:
 *
 * 1. Install: npm install nxapi
 * 2. Implement authentication with NINTENDO_EMAIL and NINTENDO_PASSWORD
 * 3. Call the nxapi method to set parental control time
 *
 * See: https://github.com/samuelthomas2774/nxapi
 */
async function setNintendoParentalControlTime(minutes) {
  console.log('Setting Nintendo parental control time to:', minutes, 'minutes');

  // TODO: Implement actual Nintendo API integration with nxapi
  // This is a placeholder that logs what would happen

  try {
    // Placeholder for nxapi integration
    // Real implementation would look like:
    //
    // const nxapi = require('nxapi');
    // const auth = await nxapi.authenticate(NINTENDO_EMAIL, NINTENDO_PASSWORD);
    // await nxapi.setParentalControlTimeLimit(auth, minutes);

    console.log('✅ Would set Nintendo Switch time limit to:', minutes, 'minutes');
    console.log('⚠️  nxapi integration not yet implemented');
    console.log('Using credentials:', NINTENDO_EMAIL !== '<INSERT-EMAIL>' ? '(set)' : '(not set)');

    return {
      success: true,
      message: `Placeholder: Would set time to ${minutes} minutes`,
    };
  } catch (error) {
    console.error('Error setting Nintendo time limit:', error);
    throw error;
  }
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('setDailyTime Lambda triggered at:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));

  const today = getTodayDate();
  console.log('Processing date:', today);

  try {
    // 1. Get default time from environment variable
    const defaultTime = getDefaultTime();
    console.log('Default time:', defaultTime, 'minutes');

    // 2. Get total deductions for today
    const { total: totalDeductions, count: deductionCount, items: deductions } = await getTotalDeductions(today);
    console.log('Total deductions today:', totalDeductions, 'minutes (', deductionCount, 'deductions)');

    if (deductionCount > 0) {
      console.log('Deductions breakdown:', deductions.map(d => `${d.minutes} min (${d.reason || 'no reason'})`).join(', '));
    }

    // 3. Calculate final time
    const finalTime = Math.max(0, defaultTime - totalDeductions);
    console.log('Final time for today:', finalTime, 'minutes');

    // 4. Set Nintendo parental control time limit
    const nintendoResult = await setNintendoParentalControlTime(finalTime);
    console.log('Nintendo API result:', nintendoResult);

    // 5. Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: today,
        defaultTime,
        totalDeductions,
        deductionCount,
        finalTime,
        nintendoResult,
        message: `Daily time set to ${finalTime} minutes (${defaultTime} - ${totalDeductions})`,
      }),
    };
  } catch (error) {
    console.error('Error in setDailyTime Lambda:', error);

    // Return error but don't throw (so EventBridge doesn't retry indefinitely)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        date: today,
      }),
    };
  }
};
