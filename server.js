const express = require('express')
const TurnstileSolver = require('./turnstile-solver')

const app = express()

app.use(express.json({ limit: '10mb' }))

app.get('/', (req, res) => {
  res.json({
    status: true,
    creator: 'Kei',
    message: 'Turnstile Solver API Running'
  })
})

app.post('/action', async (req, res) => {
  const {
    url,
    siteKey,
    record = false
  } = req.body

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'url is required'
    })
  }

  const solver = new TurnstileSolver({
    record
  })

  try {
    const result = await solver.solve(url, siteKey)
    res.json(result)
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message
    })
  } finally {
    await solver.cleanup()
  }
})

const PORT = process.env.PORT || 7860

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT)
})
