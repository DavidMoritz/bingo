import { defineAuth, secret } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
      },
      callbackUrls: ['http://localhost:5173/', 'http://localhost:4173/'],
      logoutUrls: ['http://localhost:5173/', 'http://localhost:4173/'],
    },
  },
})
