import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest, authorize } from '../middleware/auth'

const router = Router()

// ─── GET ALL SERVICES ───────────────────────────
// Public — shows all ceremony types
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query

    const where: any = { isActive: true }
    if (category) where.category = { equals: category as string, mode: 'insensitive' }

    const services = await prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    res.status(200).json({ services })
  } catch (error) {
    console.error('Get services error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── SEED SERVICES (one-time setup) ─────────────
// Run once to populate ceremony types
router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  try {
    const ceremonies = [
      { name: 'Griha Pravesh', nameHindi: 'गृह प्रवेश', category: 'Life Events', description: 'Housewarming ceremony for new home' },
      { name: 'Wedding Ceremony', nameHindi: 'विवाह संस्कार', category: 'Life Events', description: 'Complete Hindu wedding rituals' },
      { name: 'Satyanarayan Katha', nameHindi: 'सत्यनारायण कथा', category: 'Festival Pujas', description: 'Devotional worship of Lord Vishnu' },
      { name: 'Mundan Ceremony', nameHindi: 'मुंडन संस्कार', category: 'Life Events', description: 'First head-shaving ceremony for child' },
      { name: 'Namkaran', nameHindi: 'नामकरण', category: 'Life Events', description: 'Baby naming ceremony' },
      { name: 'Engagement Ceremony', nameHindi: 'सगाई', category: 'Life Events', description: 'Ring exchange and engagement rituals' },
      { name: 'Ganesh Puja', nameHindi: 'गणेश पूजा', category: 'Festival Pujas', description: 'Worship of Lord Ganesha' },
      { name: 'Lakshmi Puja', nameHindi: 'लक्ष्मी पूजा', category: 'Festival Pujas', description: 'Worship of Goddess Lakshmi for prosperity' },
      { name: 'Rudrabhishek', nameHindi: 'रुद्राभिषेक', category: 'Daily Rituals', description: 'Sacred bathing ritual for Lord Shiva' },
      { name: 'Navgraha Shanti', nameHindi: 'नवग्रह शांति', category: 'Daily Rituals', description: 'Planetary peace puja for astrological remedies' },
      { name: 'Akhand Ramayan Path', nameHindi: 'अखंड रामायण पाठ', category: 'Daily Rituals', description: 'Continuous recitation of Ramayan' },
      { name: 'Vastu Shanti', nameHindi: 'वास्तु शांति', category: 'Life Events', description: 'Puja to remove vastu dosha from property' },
      { name: 'Last Rites (Antim Sanskar)', nameHindi: 'अंतिम संस्कार', category: 'Life Events', description: 'Hindu funeral and cremation rituals' },
      { name: 'Sunderkand Path', nameHindi: 'सुंदरकांड पाठ', category: 'Daily Rituals', description: 'Recitation of Sunderkand from Ramcharitmanas' },
      { name: 'Diwali Puja', nameHindi: 'दिवाली पूजा', category: 'Festival Pujas', description: 'Special puja for Diwali festival' },
    ]

    let created = 0
    for (const ceremony of ceremonies) {
      const exists = await prisma.service.findUnique({ where: { name: ceremony.name } })
      if (!exists) {
        await prisma.service.create({ data: ceremony })
        created++
      }
    }

    res.status(201).json({ message: `Seeded ${created} new services. ${ceremonies.length - created} already existed.` })
  } catch (error) {
    console.error('Seed error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

// ─── PANDIT ADDS A SERVICE THEY OFFER ───────────
router.post('/pandit-service', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const pandit = await prisma.pandit.findUnique({ where: { userId } })
    if (!pandit) {
      res.status(404).json({ error: 'Pandit profile not found.' })
      return
    }

    const { serviceId, price, duration } = req.body

    if (!serviceId || !price) {
      res.status(400).json({ error: 'Service ID and price are required.' })
      return
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) {
      res.status(404).json({ error: 'Service not found.' })
      return
    }

    const panditService = await prisma.panditService.create({
      data: {
        panditId: pandit.id,
        serviceId,
        price,
        duration: duration || null,
      },
      include: { service: true },
    })

    res.status(201).json({ message: 'Service added to your profile!', panditService })
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'You already offer this service.' })
      return
    }
    console.error('Add service error:', error)
    res.status(500).json({ error: 'Something went wrong.' })
  }
})

export default router