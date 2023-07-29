const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const csv = require('csv-parser')
const fs = require('fs')

app.set('view engine', 'ejs')
app.use(express.static(`${__dirname}/static`))
app.use(express.urlencoded({ extended: false }))

app.use(bodyParser.urlencoded({ extended: true }))

require('dotenv').config()

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
        ${clue[1]}
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

async function start() {
  console.log('reading csv...')
  const lastUpdated = await readCSV(playerData, playerList)
  console.log(`Last updated: ${lastUpdated}`)
}

start()

app.locals.getBorders = function(ind) {
  const BORDERS = ['border-r border-b', 'border-r border-b', 'border-b', 'border-r border-b', 'border-r border-b', 'border-b', 'border-r', 'border-r', '']
  return BORDERS[ind]
}

app.get('/', (req, res) => {
  const puzzle = [['team', 'Epsilon'], ['team', 'Envy'], ['kills', 10000], ['team', 'Astralis'], ['team', 'Complexity'], ['team', 'Endpoint']] // TODO
  res.render('index', { puzzle: puzzle, players: playerList })
})

app.listen(process.env.PORT || 4000, () => console.log("Server is running..."))

// npx tailwindcss -i .\static\styles.css -o ./static/output.css --watch
