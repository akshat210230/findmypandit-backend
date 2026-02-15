import 'dotenv/config'
import { prisma } from './src/lib/prisma'
import { hashPassword } from './src/utils/auth'

async function seedPandits() {
  const pandits = [
    { email: 'suresh.tiwari@test.com', firstName: 'Suresh', lastName: 'Tiwari', bio: 'Senior pandit with deep knowledge of Vedic traditions. Specializes in Satyanarayan Katha and Rudrabhishek.', exp: 22, city: 'Delhi', state: 'Delhi', languages: ['Hindi', 'Sanskrit'], specs: ['Satyanarayan Katha', 'Rudrabhishek', 'Navgraha Shanti'], min: 2500, max: 12000 },
    { email: 'anil.dubey@test.com', firstName: 'Anil', lastName: 'Dubey', bio: 'Multilingual priest comfortable with modern families. Expert in all life event ceremonies.', exp: 12, city: 'Bangalore', state: 'Karnataka', languages: ['Hindi', 'Sanskrit', 'Kannada', 'English'], specs: ['Weddings', 'Mundan', 'Namkaran'], min: 2000, max: 10000 },
    { email: 'vijay.mishra@test.com', firstName: 'Vijay', lastName: 'Mishra', bio: 'Specialist in festival pujas and havans. Known for creating a warm, devotional atmosphere.', exp: 18, city: 'Pune', state: 'Maharashtra', languages: ['Hindi', 'Sanskrit', 'Marathi'], specs: ['Ganesh Puja', 'Lakshmi Puja', 'Diwali Puja'], min: 2000, max: 8000 },
    { email: 'deepak.shastri@test.com', firstName: 'Deepak', lastName: 'Shastri', bio: 'Young and energetic priest who explains every ritual in simple terms. Great with families new to traditions.', exp: 8, city: 'Mumbai', state: 'Maharashtra', languages: ['Hindi', 'Sanskrit', 'Gujarati'], specs: ['Ganesh Puja', 'Satyanarayan Katha', 'Griha Pravesh'], min: 1500, max: 6000 },
    { email: 'mohan.jha@test.com', firstName: 'Mohan', lastName: 'Jha', bio: 'One of Delhi\'s most sought-after priests. Former professor at Sanskrit University with unparalleled knowledge of Vedic rituals.', exp: 25, city: 'Delhi', state: 'Delhi', languages: ['Hindi', 'Sanskrit', 'English'], specs: ['Weddings', 'Navgraha Shanti', 'Vastu Shanti'], min: 4000, max: 20000 },
  ]

  for (const p of pandits) {
    const hash = await hashPassword('Test1234')
    const user = await prisma.user.create({
      data: { email: p.email, passwordHash: hash, firstName: p.firstName, lastName: p.lastName, role: 'PANDIT' }
    })
    await prisma.pandit.create({
      data: { userId: user.id, bio: p.bio, experienceYears: p.exp, city: p.city, state: p.state, languages: p.languages, specializations: p.specs, priceMin: p.min, priceMax: p.max, isAvailable: true, rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)), totalReviews: Math.floor(50 + Math.random() * 250) }
    })
    console.log(`Created: Pt. ${p.firstName} ${p.lastName}`)
  }

  console.log('Done! 5 pandits seeded.')
  process.exit(0)
}

seedPandits().catch(e => { console.error(e); process.exit(1) })
