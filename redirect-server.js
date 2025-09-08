const express = require('express')
const app = express()
const session = require('cookie-session')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');

app.set('view engine', 'ejs')
app.use(express.static(`${__dirname}/static`))
app.use(express.urlencoded({ extended: false }))

app.use(bodyParser.urlencoded({ extended: true }))

app.set('etag', false)

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.use(cookieParser());

require('dotenv').config()

app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'csgodoku',
  resave: true,
  saveUninitialized: true,
  maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
}))

app.get('/', (req, res) => {
  res.render('newDomain')
})

app.post('/import', express.json({ limit: '100mb' }), async (req, res) => {
  const localStorageValue = req.body.localStorageData || {};
  const sessionValue = req.session

  console.log('importing user data')
  const localStorageKey = (await (await fetch("https://www.csdoku.com/import", {
    method: 'POST',
    credentials: 'include',
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ sessionValue: sessionValue, localStorageValue: localStorageValue })
  })).json()).key

  res.send({ key: localStorageKey})
})

/* 404 Page */
app.use(function (req, res, next) {
  res.redirect('/')
})

/* Start Function */
async function start() {
  app.listen(process.env.PORT || 4000, () => console.log("Server is running..."))
}

start()

// npx tailwindcss -i .\static\styles.css -o ./static/output.css --watch
// npx tailwindcss -i static/styles.css -o static/output.css --watch
