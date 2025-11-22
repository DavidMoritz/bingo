import { defineBackend } from '@aws-amplify/backend'
import { data } from './data/resource.js'
import { auth } from './auth/resource.js'

export const backend = defineBackend({
  data,
  auth,
})
