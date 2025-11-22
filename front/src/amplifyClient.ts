import { Amplify } from 'aws-amplify'
import outputs from './amplify_outputs.json'

Amplify.configure(outputs, {
  oauth: {
    redirectSignIn: [window.location.origin + '/'],
    redirectSignOut: [window.location.origin + '/'],
  },
})
