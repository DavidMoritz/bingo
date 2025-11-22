import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import outputs from '../front/src/amplify_outputs.json'

// Configure Amplify
Amplify.configure(outputs as any)
const client = generateClient({
  authMode: 'apiKey',
})

async function updateGenre() {
  console.log('Searching for "4th of july" template...')

  // Find the template with genre "4th of july"
  const result = await client.models.PhraseTemplate.list({
    filter: {
      genre: { eq: '4th of july' },
    },
  })

  const templates = result.data ?? []

  if (templates.length === 0) {
    console.log('No template found with genre "4th of july"')
    return
  }

  const template = templates[0]
  console.log(`Found template: ${template.id} with ${template.phrases.length} phrases`)

  // Delete the old template
  console.log('Deleting old template...')
  await client.models.PhraseTemplate.delete({ id: template.id })

  // Create new template with "fireworks" as genre
  console.log('Creating new template with genre "fireworks"...')
  const createResult = await client.models.PhraseTemplate.create({
    genre: 'fireworks',
    phrases: template.phrases,
    isAiGenerated: template.isAiGenerated,
    usageCount: template.usageCount,
  })

  if (createResult.data) {
    console.log('✓ Successfully updated genre from "4th of july" to "fireworks"')
  } else {
    console.error('✗ Failed to create new template:', createResult.errors)
  }
}

updateGenre().catch(console.error)
