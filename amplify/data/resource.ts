import { a } from '@aws-amplify/backend'

const phraseSet = a
  .model({
    code: a.id(),
    title: a.string().required(),
    phrases: a.string().array().required(),
    createdAt: a.datetime().required(),
    isPublic: a.boolean().required(),
    freeSpace: a.boolean().required(),
    ratingTotal: a.integer().required().default(0),
    ratingCount: a.integer().required().default(0),
    ratingAverage: a.float().required().default(0),
  })
  .identifier(['code'])

export const data = a
  .data({
    models: { phraseSet },
  })
  .authorization((allow) => [allow.publicApiKey()])
