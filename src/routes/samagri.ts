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
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a Hindu ritual expert. Generate a samagri (ritual items) list for a ${ceremony} ceremony.
        
Return ONLY a JSON array, no other text. Format:
[
  { "name": "item name in English", "nameHindi": "item name in Hindi", "quantity": "amount", "unit": "unit like g/ml/pieces", "estimatedPrice": price in rupees as number },
  ...
]

Include 8-12 essential items specific to ${ceremony}. Keep prices realistic for India.`
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