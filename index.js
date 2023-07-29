const express = require('express')
const app = express()
const session = require('cookie-session')
const bodyParser = require('body-parser')
const csv = require('csv-parser')
const fs = require('fs')

app.set('view engine', 'ejs')
app.use(express.static(`${__dirname}/static`))
app.use(express.urlencoded({ extended: false }))

app.use(bodyParser.urlencoded({ extended: true }))

require('dotenv').config()

app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'pog',
  resave: true,
  saveUninitialized: true
}))

// const db = require('./db')
const playerData = {}
const playerList = []

async function readCSV(playerData, playerList) {
  return new Promise(async function (resolve, reject) {
    const parseType = ['', 'int', '', '', 'int', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']
    let lastUpdated = undefined
    let topRow = undefined
    fs.createReadStream('playerData.csv')
      .pipe(csv())
      .on('headers', (headers) => {
        topRow = headers
        lastUpdated = headers[0]
      })
      .on('data', (row) => {
        const rowData = Object.values(row)
        const playerID = parseInt(rowData[1])
        playerData[playerID] = {}

        for (let i = 1; i < rowData.length-1; i++) {
          if (rowData[i] === 'undefined' || rowData[i] === 'N/A') {
            playerData[playerID][topRow[i]] = undefined
          }
          else if (parseType[i] === 'int') {
            playerData[playerID][topRow[i]] = parseInt(rowData[i])
          }
          else if (parseType[i] === 'float') {
            playerData[playerID][topRow[i]] = parseFloat(rowData[i])
          }
          else if (parseType[i] === 'set') {
            playerData[playerID][topRow[i]] = new Set(JSON.parse(rowData[i]))
          }
          else if (parseType[i] === 'dictionary') {
            const ratingDictionary = JSON.parse(rowData[i])
            playerData[playerID][topRow[i]] = {}
            for (const [year, rating] of Object.entries(ratingDictionary)) {
              playerData[playerID][topRow[i]][parseInt(year)] = parseFloat(rating)
            }
          }
          else {
            playerData[playerID][topRow[i]] = rowData[i]
          }
        }

        playerList.push({
          name: rowData[0],
          fullName: rowData[2],
        })
      })
      .on('end', () => {
        resolve(lastUpdated)
      })
  })
}

/* EJS Helper Functions */
app.locals.displayClue = function(clue) {
  if (clue[0] === 'team') {
    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        ${clue[1].substring(clue[1].indexOf('/')+1)}
      </div>
    `
  }
  else if (clue[0] === 'country') {
    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        ${clue[1]} nationality
      </div>
    `
  }
  else if (clue[0] === 'ratingYear') {
    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        over ${clue[1][1]} rating 2.0 in ${clue[1][0]}
      </div>
    `
  }
  else if (clue[0] === 'topPlacement') {
    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        top ${clue[1][1]} player in at least one year
      </div>
    `
  }
  else {
    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        over ${clue[1]} ${clue[0]} in career
      </div>
    `
  }
}

let puzzle = undefined
let puzzleDate = undefined

const NUMBER_OF_GUESSES = 9

const PUZZLES_GRID = [[0, 3], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [0, 5], [1, 5], [2, 5]]

async function start() {
  console.log('reading csv...')
  const lastUpdated = await readCSV(playerData, playerList)
  console.log(`Last updated: ${lastUpdated}`)
}

start()

function checkPlayerGrid(playerID, clue1, clue2) {
  const clue1Type = clue1[0]
  const clue1Val = clue1[1]
  const clue2Type = clue2[0]
  const clue2Val = clue2[1]
  let clue1Check = false
  let clue2Check = false

  if (clue1Type === 'team') {
    if (playerData[playerID]['team'].has(clue1Val)) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'country') {
    if (playerData[playerID]['country'] === clue1Val) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'ratingYear') {
    if (playerData[playerID]['ratingYear'][clue1Val[0]] >= int(clue1Val[1])) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'topPlacement') {
    if (playerData[playerID]['topPlacement'][clue1Val[0]] <= int(clue1Val[1])) {
      clue1Check = true
    }
  }
  else {
    if (playerData[playerID][clue1Type] >= int(clue1Val)) {
      clue1Check = true
    }
  }

  if (clue2Type === 'team') {
    if (playerData[playerID]['team'].has(clue2Val)) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'country') {
    if (playerData[playerID]['country'] === clue2Val) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'ratingYear') {
    if (playerData[playerID]['ratingYear'][clue2Val[0]] >= int(clue2Val[1])) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'topPlacement') {
    if (playerData[playerID]['topPlacement'][clue2Val[0]] <= int(clue2Val[1])) {
      clue2Check = true
    }
  }
  else {
    if (playerData[playerID][clue2Type] >= int(clue2Val)) {
      clue2Check = true
    }
  }

  return clue1Check && clue2Check
}

/* Middleware */
async function checkPuzzle(req, res, next) {
  // if past a time then update yada
  puzzle = [['team', '4456/Epsilon'], ['team', '5991/Envy'], ['kills', 10000], ['team', '6665/Astralis'], ['team', '5005/Complexity'], ['team', '7234/Endpoint']]
  next()
}

async function initPlayer(req, res, next) {
  if (req.session.player === undefined) {
    req.session.player = {
      start: new Date(),
      puzzle: puzzle,
      guessesLeft: NUMBER_OF_GUESSES,
      board: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      guesses: new Set(),
    }
    next()
  }
  else {
    if (req.session.player.puzzle !== puzzle) {
      req.session.player = {
        start: new Date(),
        puzzle: puzzle,
        guessesLeft: NUMBER_OF_GUESSES,
        board: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
        guesses: new Set(),
      }
      next()
    }
    else {
      next()
    }
  }
}

app.locals.getBorders = function(ind) {
  const BORDERS = ['border-r border-b', 'border-r border-b', 'border-b', 'border-r border-b', 'border-r border-b', 'border-b', 'border-r', 'border-r', '']
  return BORDERS[ind]
}

app.get('/', [checkPuzzle, initPlayer], (req, res) => {
  res.render('index', { puzzle: puzzle, players: playerList, currGame: req.session.player })
})

app.post('/insertGuess', [], (req, res) => {
  const ind = parseInt(req.body.ind)
  const guess = req.body.guess

  if (req.session.player === undefined) {
    console.log('insert guess fail, no player')
    next()
  }
  else if (req.session.player.puzzle !== puzzle) {
    console.log('insert guess fail, puzzle incorrect', req.session.player)
    next()
  }
  else if (req.session.player.guessesLeft <= 0) {
    console.log('insert guess fail, no guesses left', req.session.player)
    next()
  }
  else if (ind < 0 || ind >= 9) {
    console.log('insert guess fail, invalid index', ind)
    next()
  }
  else if (req.session.player.board === undefined) {
    console.log('insert guess fail, no board', req.session.player)
    next()
  }
  else if (req.session.player.board[ind] !== undefined) {
    console.log('insert guess fail, already guessed', req.session.player)
    next()
  }
  else if (req.session.player.guesses === undefined) {
    console.log('insert guess fail, no guesses', req.session.player)
    next()
  }
  else if (req.session.player.guesses.has(guess)) {
    console.log('insert guess fail, already guessed', req.session.player)
    next()
  }
  else if (playerData[guess] === undefined) {
    console.log('insert guess fail, invalid player', guess)
    next()
  }
  else if (guess in req.session.player.guesses) {
    console.log('insert guess fail, already guessed', guess)
    next()
  }
  else {
    // all good
    req.session.player.guesses.add(guess)

  }
})

app.listen(process.env.PORT || 4000, () => console.log("Server is running..."))

// npx tailwindcss -i .\static\styles.css -o ./static/output.css --watch
