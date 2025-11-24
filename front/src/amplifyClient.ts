import { Amplify } from 'aws-amplify'
import outputs from '../../amplify_outputs.json'

const updatedConfig = {
  ...outputs,
  auth: {
    ...outputs.auth,
    oauth: {
      ...outputs.auth.oauth,
      redirectSignIn: [window.location.origin + '/'],
      redirectSignOut: [window.location.origin + '/'],
    },
  },
}

Amplify.configure(updatedConfig)
