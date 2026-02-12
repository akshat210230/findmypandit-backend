import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import panditRoutes from './routes/pandit'
import serviceRoutes from './routes/service'
import bookingRoutes from './routes/booking'
import reviewRoutes from './routes/review'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Find My Pandit API is running! 🙏' })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/pandits', panditRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/reviews', reviewRoutes)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})