import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import * as fs from 'fs'
import * as path from 'path'
import outputs from '../front/src/amplify_outputs.json'

// Configure Amplify
Amplify.configure(outputs as any)
const client = generateClient({
  authMode: 'apiKey',
})

interface SuggestionTemplate {
  keywords: string[]
  phrases: string[]
}

async function seedTemplates() {
  const suggestionsDir = path.join(__dirname, '../src/suggestions')
  const files = fs.readdirSync(suggestionsDir).filter((f) => f.endsWith('.json'))

  console.log(`Found ${files.length} template files to seed...`)

  for (const file of files) {
    const filePath = path.join(suggestionsDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const template: SuggestionTemplate = JSON.parse(content)

    // Use the primary keyword (first one) as the genre
    const genre = template.keywords[0].toLowerCase()

    console.log(`Seeding template: ${genre} (${template.phrases.length} phrases)`)

    try {
      const result = await client.models.PhraseTemplate.create({
        genre,
        phrases: template.phrases,
        isAiGenerated: false,
        usageCount: 0,
      })

      if (result.data) {
        console.log(`✓ Created template for "${genre}"`)
      } else {
        console.error(`✗ Failed to create template for "${genre}":`, result.errors)
      }
    } catch (error) {
      console.error(`✗ Error seeding "${genre}":`, error)
    }
  }

  console.log('\nSeeding complete!')
}

seedTemplates().catch(console.error)
