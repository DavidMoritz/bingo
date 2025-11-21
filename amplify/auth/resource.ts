import { OAuthProvider, defineAuth, secret } from '@aws-amplify/backend'

export const auth = defineAuth({
  loginWith: {
    email: true,
    oauth: {
      domainPrefix: 'bingo-gen2', // change if already taken
      scopes: ['email', 'openid', 'profile'],
      redirectSignIn: ['http://localhost:5173/'],
      redirectSignOut: ['http://localhost:5173/'],
      responseType: 'code',
      providers: [
        OAuthProvider.GOOGLE({
          clientId: secret('GOOGLE_CLIENT_ID'),
          clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        }),
      ],
    },
  },
})
