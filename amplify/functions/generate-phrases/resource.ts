import { defineFunction, secret } from '@aws-amplify/backend'

export const generatePhrases = defineFunction({
  name: 'generate-phrases',
  entry: './handler.ts',
  timeoutSeconds: 30, // AI generation can take 10-15 seconds
  environment: {
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
  },
})
