import { buildApp } from './app'

const { app } = buildApp()
const port = process.env.PORT ? Number(process.env.PORT) : 3000

app.listen(port, () => {
  console.log(`Bingo API listening on http://localhost:${port}`)
})
