import { a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
  Profile: a
    .model({
      id: a.id(),
      displayName: a.string(),
      email: a.string(),
      createdAt: a.datetime().required(),
    })
    .identifier(['id'])
    .authorization((allow) => [allow.publicApiKey()]),

  PhraseSet: a
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
      ownerProfileId: a.string().required(),
    })
    .identifier(['code'])
    .authorization((allow) => [allow.publicApiKey()]),

  PlaySession: a
    .model({
      id: a.id(),
      profileId: a.string().required(),
      phraseSetCode: a.string().required(),
      phraseSetTitle: a.string(),
      gridSize: a.integer().required(),
      usesFreeCenter: a.boolean().required(),
      boardSnapshot: a.json().required(), // phrases placed at play time
      checkedCells: a.integer().array(), // indices checked during play
      createdAt: a.datetime().required(),
    })
    .identifier(['id'])
    .authorization((allow) => [allow.publicApiKey()]),

  Rating: a
    .model({
      id: a.id(),
      profileId: a.string().required(),
      phraseSetCode: a.string().required(),
      ratingValue: a.integer().required(), // 1-5; update existing rather than new per session
      lastSessionId: a.string(), // optional reference to most recent play session
      updatedAt: a.datetime().required(),
      createdAt: a.datetime().required(),
    })
    .identifier(['id'])
    .authorization((allow) => [allow.publicApiKey()]),
})

export const data = defineData({
  name: 'data',
  schema,
})
