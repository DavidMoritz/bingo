#!/usr/bin/env tsx

/**
 * Interactive script to add a new device to the approved-devices DynamoDB table
 *
 * Usage: npm run new-device
 */

import * as readline from 'readline';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'approved-devices';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify question
function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('=================================');
  console.log('Add New Approved Device');
  console.log('=================================\n');

  // Prompt for device ID
  const deviceId = await question('Device ID (64-character hash): ');

  if (!deviceId) {
    console.error('❌ Device ID is required!');
    rl.close();
    process.exit(1);
  }

  if (deviceId.length !== 64) {
    console.warn(`⚠️  Warning: Device ID should be 64 characters (got ${deviceId.length})`);
  }

  // Prompt for device name
  const name = await question('Device name (e.g., "David\'s iPhone"): ');

  if (!name) {
    console.error('❌ Device name is required!');
    rl.close();
    process.exit(1);
  }

  // Prompt for addedBy (with default)
  const addedByInput = await question('Added by (default: admin): ');
  const addedBy = addedByInput || 'admin';

  rl.close();

  console.log('\n=================================');
  console.log('Adding device with details:');
  console.log('=================================');
  console.log(`Device ID: ${deviceId}`);
  console.log(`Name: ${name}`);
  console.log(`Added by: ${addedBy}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Add to DynamoDB
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        deviceId,
        name,
        addedBy,
        addedAt: new Date().toISOString(),
      },
    }));

    console.log('✅ Device added successfully!');
    console.log('\nRefresh the Moritz Tools page to see the change.');
  } catch (error) {
    console.error('❌ Error adding device:', error);
    process.exit(1);
  }
}

main();
