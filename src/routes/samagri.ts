import { Router, Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

router.get('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ceremony } = req.query

    if (!ceremony) {
      res.status(400).json({ error: 'Ceremony name required' })
      return
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a helpful Indian mother preparing for a ${ceremony} at home. Imagine you are making a shopping list before going to the local bazaar to buy everything needed for this puja at your own house.

Write the list like you are personally going to buy these items — practical, specific, nothing missing, nothing extra. Think room by room, ritual by ritual. Include items for the murti/photo, the puja thali, the havan if needed, the prasad, and any decoration specific to this ceremony.

Return ONLY a JSON array, no other text, no markdown. Format:
[
  { "name": "item name in English", "nameHindi": "हिंदी नाम", "quantity": "realistic home quantity like 250g or 1 pack", "unit": "g/ml/pieces/pack", "estimatedPrice": realistic Indian market price as a number },
  ...
]

Rules:
- 10-14 items, all essential for a home ${ceremony}
- Quantities should be for a typical family of 4-6 people
- Prices should match local Indian kirana/bazaar rates in 2024
- Include prasad ingredients specific to this ceremony
- Do not include items that are already in every Indian home (salt, water, basic spices)
- Make it feel personal and complete — nothing should be missing on the day of the puja`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      res.status(500).json({ error: 'Failed to parse samagri list' })
      return
    }

    const items = JSON.parse(jsonMatch[0])
    res.json({ items })

  } catch (error) {
    console.error('Samagri generation error:', error)
    res.status(500).json({ error: 'Failed to generate samagri list' })
  }
})

export default router