import { createServer } from 'vite'
import express from 'express'
import morgan from 'morgan'

const app = express()
app.use(morgan('dev'))

const vite = await createServer({ server: { middlewareMode: true } })
app.use(vite.middlewares)

app.listen(3000, () => console.log('http://localhost:3000'))
