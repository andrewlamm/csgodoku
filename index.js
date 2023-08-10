const express = require('express')
const app = express()
const session = require('cookie-session')
const bodyParser = require('body-parser')
const csv = require('csv-parser')
const fs = require('fs')
const { Octokit } = require("@octokit/rest")
const Readable = require('stream').Readable
const { Base64 } = require('js-base64')

app.set('view engine', 'ejs')
app.use(express.static(`${__dirname}/static`))
app.use(express.urlencoded({ extended: false }))

app.use(bodyParser.urlencoded({ extended: true }))

require('dotenv').config()

app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'csgodoku',
  resave: true,
  saveUninitialized: true,
  maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
}))

const db = require('./db')

const playerData = {}
const playerList = {}

async function readCSV(playerData, playerList) {
  return new Promise(async function (resolve, reject) {
    const octokit = new Octokit({
      auth: process.env.GH_TOKEN,
    })
    const res = await octokit.repos.getContent({
      owner: 'superandybean',
      repo: 'csgodoku',
      path: 'playerData.csv',
    })
    const data = Base64.decode(res.data.content)

    const parseType = ['', 'int', '', '', 'int', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']
    let lastUpdated = undefined
    let topRow = undefined
    // fs.createReadStream('playerData.csv')
    Readable.from(data)
      .pipe(csv())
      .on('headers', (headers) => {
        topRow = headers
        lastUpdated = headers[0]
      })
      .on('data', (row) => {
        const rowData = Object.values(row)
        const playerID = parseInt(rowData[1])
        playerData[playerID] = {}
        playerData[playerID]['name'] = rowData[0]

        for (let i = 1; i < rowData.length; i++) {
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

        playerList[playerID] = {
          name: rowData[0],
          fullName: rowData[2],
          id: playerID,
        }
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
      <div class="flex flex-col relative h-20 w-20 md:h-36 md:w-36 items-center justify-center text-center text-white">
        <img src="/images/team/${clue[1].substring(0, clue[1].indexOf('/'))}.png" title="${clue[1].substring(clue[1].indexOf('/')+1)}" class="h-12 md:h-20">
        <div class="absolute bottom-0 w-full text-center pb-2 text-sm md:text-base">
          ${clue[1].substring(clue[1].indexOf('/')+1)}
        </div>
      </div>
    `
  }
  else if (clue[0] === 'country') {
    return `
      <div class="flex flex-col relative h-20 w-20 md:h-36 md:w-36 items-center justify-center text-center text-white">
        <img src="/images/country/${clue[1]}.png" title="${clue[1]}" class="h-4 md:h-12">
        <div class="absolute bottom-0 w-full text-center pb-2 text-xs md:text-base">
          ${clue[1]} nationality
        </div>
      </div>
    `
  }
  else {
    let clueString = ''

    if (clue[0] === 'age') {
      clueString = `${clue[1]}+ years old`
    }
    else if (clue[0] === 'rating2') {
      clueString = `${clue[1]} career <b>rating 2.0</b>`
    }
    else if (clue[0] === 'rating1') {
      clueString = `${clue[1]} career <b>rating 1.0</b>`
    }
    else if (clue[0] === 'KDDiff') {
      clueString `${clue[1]}+ career K/D difference`
    }
    else if (clue[0] === 'maps') {
      clueString = `${clue[1]}+ maps played`
    }
    else if (clue[0] === 'rounds') {
      clueString = `${clue[1]}+ rounds played`
    }
    else if (clue[0] === 'KDRatio') {
      clueString = `${clue[1]}+ career K/D ratio`
    }
    else if (clue[0] === 'HSRatio') {
      clueString = `${clue[1]}%+ career headshot percentage`
    }
    else if (clue[0] === 'ratingTop20') {
      clueString = `${clue[1]}+ career <b>rating 2.0</b> against top 20 teams`
    }
    else if (clue[0] === 'clutchesTotal') {
      clueString = `${clue[1]}+ clutches won`
    }
    else if (clue[0] === 'majorsWon') {
      clueString = `${clue[1]}+ majors won`
    }
    else if (clue[0] === 'majorsPlayed') {
      clueString = `${clue[1]}+ majors played`
    }
    else if (clue[0] === 'LANsWon') {
      clueString = `${clue[1]}+ LANs won`
    }
    else if (clue[0] === 'LANsPlayed') {
      clueString = `${clue[1]}+ LANs played`
    }
    else if (clue[0] === 'top20s') {
      clueString = `${clue[1]}+ top 20 players of the year finishes`
    }
    else if (clue[0] === 'top10s') {
      clueString = `${clue[1]}+ top 10 players of the year finishes`
    }
    else if (clue[0] === 'ratingYear') {
      clueString = `${clue[1][1]}+ <b>rating 1.0</b> in ${clue[1][0]}`
    }
    else if (clue[0] === 'topPlacement') {
      clueString = `top ${clue[1]} player in at least one year`
    }
    else {
      clueString = `${clue[1]}+ career ${clue[0]}`
    }

    return `
      <div class="flex flex-col relative h-20 w-20 md:h-36 md:w-36 items-center justify-center text-center text-white text-sm md:text-base">
        ${clueString}
      </div>
    `
  }
}

app.locals.getBorders = function(ind) {
  const BORDERS = ['border-r border-b', 'border-r border-b', 'border-b', 'border-r border-b', 'border-r border-b', 'border-b', 'border-r', 'border-r', '']
  return BORDERS[ind]
}

app.locals.formatPercentage = function(percent) {
  if (percent < 10) {
    return `${percent.toFixed(2)}%`
  }
  else if (percent < 100) {
    return `${percent.toFixed(1)}%`
  }
  else {
    return `${percent.toFixed(0)}%`
  }
}

let puzzle = undefined
let puzzleDate = undefined
let possiblePlayers = undefined
let lastUpdated = undefined

const TIME_OFFSET = 1690855200 // Jul 31, 10 PM EST
const SECONDS_PER_DAY = 86400

const NUMBER_OF_GUESSES = 9

const PUZZLES_GRID = [[0, 3], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [0, 5], [1, 5], [2, 5]]

function checkPlayerGrid(playerID, clue1, clue2) {
  const clue1Type = clue1[0]
  const clue1Val = clue1[1]
  const clue2Type = clue2[0]
  const clue2Val = clue2[1]
  let clue1Check = false
  let clue2Check = false

  if (clue1Type === 'team') {
    if (playerData[playerID]['teams'].has(clue1Val)) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'country') {
    if (playerData[playerID]['country'] === clue1Val) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'ratingYear') {
    if (playerData[playerID]['ratingYear'][clue1Val[0]] >= parseInt(clue1Val[1])) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'topPlacement') {
    if (playerData[playerID]['topPlacement'] <= parseInt(clue1Val)) {
      clue1Check = true
    }
  }
  else {
    if (playerData[playerID][clue1Type] >= parseInt(clue1Val)) {
      clue1Check = true
    }
  }

  if (clue2Type === 'team') {
    if (playerData[playerID]['teams'].has(clue2Val)) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'country') {
    if (playerData[playerID]['country'] === clue2Val) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'ratingYear') {
    if (playerData[playerID]['ratingYear'][clue2Val[0]] >= parseInt(clue2Val[1])) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'topPlacement') {
    if (playerData[playerID]['topPlacement'] <= parseInt(clue2Val)) {
      clue2Check = true
    }
  }
  else {
    if (playerData[playerID][clue2Type] >= parseInt(clue2Val)) {
      clue2Check = true
    }
  }

  return clue1Check && clue2Check
}

function findAllPossiblePlayers(puzzle) {
  possiblePlayers = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()]
  for (const [id, player] of Object.entries(playerData)) {
    const playerID = parseInt(id)
    for (let pos = 0; pos < 9; pos++) {
      if (checkPlayerGrid(playerID, puzzle[PUZZLES_GRID[pos][0]], puzzle[PUZZLES_GRID[pos][1]])) {
        possiblePlayers[pos].add(playerID)
      }
    }
  }
}

function calculateUniqueness(board, possiblePlayers) {
  let score = 0
  for (let i = 0; i < 9; i++) {
    if (board[i] !== undefined && board[i] !== null) {
      for (let j = 0; j < possiblePlayers[i].length; j++) {
        if (possiblePlayers[i][j].playerID === board[i]) {
          if (possiblePlayers[i][j].percentage === undefined) {
            score += 100
          }
          else {
            score += 100 - parseInt(possiblePlayers[i][j].percentage * 100)
          }
          break
        }
      }
    }
  }
  return score
}

/* Middleware */
async function checkPuzzle(req, res, next) {
  if (puzzle === undefined) {
    // need to load puzzle
    const currTime = Math.floor(new Date().getTime() / 1000) - TIME_OFFSET
    puzzleDate = parseInt(currTime / SECONDS_PER_DAY)

    const puzzleResult = await db.findOne({ _id: 'puzzleList' })
    const puzzleList = puzzleResult.puzzles
    puzzle = puzzleList[puzzleDate]

    findAllPossiblePlayers(puzzle)

    const statsResult = await db.findOne({ _id: 'currentPuzzleStats' })
    if (puzzleDate === statsResult.puzzleDate) {
      // date on stats is correct, no need to reset
      next()
    }
    else {
      // need to reset stats as well
      const initPickedPlayers = [{}, {}, {}, {}, {}, {}, {}, {}, {}]
      for (let i = 0; i < 9; i++) {
        possiblePlayers[i].forEach(playerID => {
          initPickedPlayers[i][playerID] = 0
        })
      }

      const query = { _id: 'currentPuzzleStats' }

      const update = { $set: {
        puzzleDate: puzzleDate,
        numberGames: 0,
        scores: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalUniqueness: 0,
        pickedPlayers: initPickedPlayers,
      } }

      const updateRes = await db.updateOne(query, update)

      next()
    }
  }
  else {
    const currTime = Math.floor(new Date().getTime() / 1000) - TIME_OFFSET
    if (parseInt(currTime / SECONDS_PER_DAY) > puzzleDate) {
      // need to have a new puzzle

      /* get puzzle */
      puzzleDate = parseInt(currTime / SECONDS_PER_DAY)

      const puzzleResult = await db.findOne({ _id: 'puzzleList' })
      const puzzleList = puzzleResult.puzzles
      puzzle = puzzleList[puzzleDate]

      /* get possible players */
      findAllPossiblePlayers(puzzle)

      const initPickedPlayers = [{}, {}, {}, {}, {}, {}, {}, {}, {}]
      for (let i = 0; i < 9; i++) {
        possiblePlayers[i].forEach(playerID => {
          initPickedPlayers[i][playerID] = 0
        })
      }

      /* reset stats */
      const query = { _id: 'currentPuzzleStats' }

      const update = { $set: {
        puzzleDate: puzzleDate,
        numberGames: 0,
        scores: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalUniqueness: 0,
        pickedPlayers: initPickedPlayers,
      } }

      const updateRes = await db.updateOne(query, update)

      next()
    }
    else {
      // current puzzle is fine, do nothing
      next()
    }
  }
}

async function initPlayer(req, res, next) {
  if (req.session.player === undefined) {
    req.session.player = {
      start: new Date(),
      puzzle: puzzle,
      guessesLeft: NUMBER_OF_GUESSES,
      board: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      guesses: [[], [], [], [], [], [], [], [], []],
      gameStatus: 0,
      userScore: ['-', '-'],
    }
    req.session.userStats = {
      finalGridAmount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }
    next()
  }
  else {
    if (JSON.stringify(req.session.player.puzzle) !== JSON.stringify(puzzle)) {
      req.session.player = {
        start: new Date(),
        puzzle: puzzle,
        guessesLeft: NUMBER_OF_GUESSES,
        board: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
        guesses: [[], [], [], [], [], [], [], [], []],
        gameStatus: 0,
        userScore: ['-', '-'],
      }
      next()
    }
    else {
      next()
    }
  }
}

async function getPickedPlayersList() {
  // read from db
  const pickedPlayersSet = [{}, {}, {}, {}, {}, {}, {}, {}, {}]
  const pickedPlayersCount = [[], [], [], [], [], [], [], [], []]
  const totalPicks = [0, 0, 0, 0, 0, 0, 0, 0, 0]

  for (let ind = 0; ind < 9; ind++) {
    possiblePlayers[ind].forEach(playerID => {
      pickedPlayersSet[ind][playerID] = {
        playerID: playerID,
        name: playerData[playerID].name,
        fullName: playerData[playerID].fullName,
        count: 0,
        percentage: 0,
      }
    })
  }

  const query = { _id: 'currentPuzzleStats' }
  const result = await db.findOne(query)

  for (let ind = 0; ind < 9; ind++) {
    for (const [playerID, count] of Object.entries(result.pickedPlayers[ind])) {
      pickedPlayersSet[ind][playerID].count = count
      totalPicks[ind] += count
    }
  }

  for (let ind = 0; ind < 9; ind++) {
    for (const [playerID, player] of Object.entries(pickedPlayersSet[ind])) {
      pickedPlayersCount[ind].push(player)
    }
  }

  for (let ind = 0; ind < 9; ind++) {
    pickedPlayersCount[ind].sort((a, b) => b.count - a.count)
  }

  for (let ind = 0; ind < 9; ind++) {
    for (const [playerID, player] of Object.entries(pickedPlayersCount[ind])) {
      player.percentage = totalPicks[ind] === 0 ? 0 : player.count / totalPicks[ind]
      player.totalPicks = totalPicks[ind]
    }
  }

  return pickedPlayersCount
}

async function updateGlobalFinalScores(score, unique) {
  const query = { _id: 'currentPuzzleStats' }

  const update = { $inc: {  } }
  update.$inc[`scores.${score}`] = 1
  update.$inc.numberGames = 1
  update.$inc.totalUniqueness = unique

  const updateRes = await db.updateOne(query, update)
}

async function getFinalScores() {
  const query = { _id: 'currentPuzzleStats' }
  const result = await db.findOne(query)

   return [result.scores, result.numberGames]
}

async function getUniqueness() {
  const query = { _id: 'currentPuzzleStats' }
  const result = await db.findOne(query)

  return result.numberGames === 0 ? 0 : parseInt(result.totalUniqueness / result.numberGames)
}

async function getStats(req, res, next) {
  res.locals.pickedPlayersData = await getPickedPlayersList()
  res.locals.finalScores = await getFinalScores()
  res.locals.averageUniqueness = await getUniqueness()

  next()
}

async function insertGuessHelper(req, res, next) {
  try {
    const ind = parseInt(req.body.index)
    const guess = parseInt(req.body.guess)

    if (req.session.player === undefined) {
      console.log('insert guess fail, no player')
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (JSON.stringify(req.session.player.puzzle) !== JSON.stringify(puzzle)) {
      console.log('insert guess fail, puzzle incorrect', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.guessesLeft <= 0) {
      console.log('insert guess fail, no guesses left', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (ind < 0 || ind >= 9) {
      console.log('insert guess fail, invalid index', ind)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.board === undefined) {
      console.log('insert guess fail, no board', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.board[ind] !== undefined && req.session.player.board[ind] !== null) {
      console.log(req.session.player.board[ind])
      console.log('insert guess fail, index already guessed', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.guesses === undefined) {
      console.log('insert guess fail, no guesses array', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (playerData[guess] === undefined) {
      console.log('insert guess fail, invalid player guessed', guess)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.guesses[ind].includes(guess) || req.session.player.board.includes(guess)) {
      console.log('insert guess fail, already guessed', playerData[guess].name)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.userStats === undefined || req.session.userStats.finalGridAmount === undefined || req.session.userStats.finalGridAmount.length !== 10) {
      console.log('insert guess fail, user stats error', req.session.userStats)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else {
      // all good
      req.session.player.guesses[ind].push(guess)
      req.session.player.guessesLeft -= 1

      if (possiblePlayers[ind].has(guess)) {
        // correct guess
        req.session.player.board[ind] = guess

        res.locals.pickedPlayersData = await getPickedPlayersList()

        for (let i = 0; i < res.locals.pickedPlayersData[ind].length; i++) {
          if (res.locals.pickedPlayersData[ind][i].playerID === guess) {
            res.locals.guessPercentage = (res.locals.pickedPlayersData[ind][i].count + 1) / (res.locals.pickedPlayersData[ind][i].totalPicks + 1)
            break
          }
        }
      }


      if (req.session.player.guessesLeft <= 0) {
        // game is over

        /* add picks to db */
        const query = { _id: 'currentPuzzleStats' }
        const result = await db.findOne(query)

        const update = { $inc: { } }

        for (let i = 0; i < 9; i++) {
          if (req.session.player.board[i] !== undefined && req.session.player.board[i] !== null) {
            const player = req.session.player.board[i]
            update.$inc[`pickedPlayers.${i}.${player}`] = 1
          }
        }

        const resultDoc = await db.updateOne(query, update)

        const score = 9 - req.session.player.board.filter(x => x === undefined || x === null).length

        req.session.userStats.finalGridAmount[score] += 1

        const pickedPlayersData = await getPickedPlayersList()
        const uniqueScore = calculateUniqueness(req.session.player.board, pickedPlayersData)

        await updateGlobalFinalScores(score, uniqueScore)

        req.session.player.gameStatus = req.session.player.board.filter(x => x === undefined || x === null).length === 0 ? 1 : -1
        req.session.player.userScore = [score, uniqueScore]

        res.locals.guessReturn = {
          gameStatus: req.session.player.board.filter(x => x === undefined || x === null).length === 0 ? 1 : -1, // gameStatus; 1 = win, -1 = lose, 0 = in progress
          guessStatus: possiblePlayers[ind].has(guess) ? 1 : 0, // guess status; 1 = in board, 0 = not
          guessesLeft: req.session.player.guessesLeft, // guesses left
          guessPercentage: res.locals.guessPercentage, // percentage of players with this guess
          userScore: [score, uniqueScore], // user score [score, uniqueness]
        }
        next()
      }
      else {
        // continue game
        res.locals.guessReturn = {
          gameStatus: 0,
          guessStatus: possiblePlayers[ind].has(guess) ? 1 : 0,
          guessesLeft: req.session.player.guessesLeft,
          guessPercentage: res.locals.guessPercentage,
        }
        next()
      }
    }
  }
  catch (err) {
    console.log('insert guess fail, error', err)
    res.locals.guessReturn = {
      guessStatus: -1,
      guessesLeft: 0,
      gameStatus: 0,
    }
    next()
  }
}

async function concedeHelper(req, res, next) {
  try {
    if (req.session.player === undefined) {
      console.log('concede fail, no player')
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (JSON.stringify(req.session.player.puzzle) !== JSON.stringify(puzzle)) {
      console.log('concede fail, puzzle incorrect', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.board === undefined) {
      console.log('concede fail, no board', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.userStats === undefined || req.session.userStats.finalGridAmount === undefined || req.session.userStats.finalGridAmount.length !== 10) {
      console.log('concede fail, user stats error', req.session.userStats)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.gameStatus !== 0) {
      // game has ended, do nothing
      console.log('concede fail, game ended', req.session.player)
      next()
    }
    else {
      req.session.player.guessesLeft = 0
      req.session.player.gameStatus = -1

      const query = { _id: 'currentPuzzleStats' }
      const result = await db.findOne(query)

      const update = { $inc: { } }

      for (let i = 0; i < 9; i++) {
        if (req.session.player.board[i] !== undefined && req.session.player.board[i] !== null) {
          const player = req.session.player.board[i]
          update.$inc[`pickedPlayers.${i}.${player}`] = 1
        }
      }

      const resultDoc = await db.updateOne(query, update)

      const score = 9 - req.session.player.board.filter(x => x === undefined || x === null).length

      req.session.userStats.finalGridAmount[score] += 1

      const pickedPlayersData = await getPickedPlayersList()
      const uniqueScore = calculateUniqueness(req.session.player.board, pickedPlayersData)

      await updateGlobalFinalScores(score, uniqueScore)

      req.session.player.gameStatus = req.session.player.board.filter(x => x === undefined || x === null).length === 0 ? 1 : -1
      req.session.player.userScore = [score, uniqueScore]

      res.locals.guessReturn = {
        gameStatus: -1,
        guessesLeft: 0,
        pickedPlayers: pickedPlayersData,
        userScore: [score, uniqueScore],
      }
      next()
    }
  }
  catch (err) {
    console.log('concede fail, error', err)
    next()
  }
}

function checkPlayer(req, res, next) {
  if (req.session.player === undefined) {
    res.locals.guessReturn = {
      guessStatus: -1,
      guessesLeft: 0,
    }
    next()
  }
  else if (JSON.stringify(req.session.player.puzzle) !== JSON.stringify(puzzle)) {
    res.locals.guessReturn = {
      guessStatus: -1,
      guessesLeft: 0,
    }
    next()
  }
  else {
    next()
  }
}

app.get('/', [checkPuzzle, initPlayer, getStats], (req, res) => {
  // console.log('load')
  req.session.update = Math.floor(Date.now() / 60000) // update cookie expiry every time user visits site

  req.session.player.boardPercentages = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
  for (let ind = 0; ind < 9; ind++) {
    if (req.session.player.board[ind] !== undefined && req.session.player.board[ind] !== null) {
      // ind is filled with a player
      for (let i = 0; i < res.locals.pickedPlayersData[ind].length; i++) {
        if (res.locals.pickedPlayersData[ind][i].playerID === req.session.player.board[ind]) {
          if (req.session.player.gameStatus !== 0) {
            // game over
            req.session.player.boardPercentages[ind] = res.locals.pickedPlayersData[ind][i].percentage
          }
          else {
            // game not over, need to +1
            req.session.player.boardPercentages[ind] = (res.locals.pickedPlayersData[ind][i].count + 1) / (res.locals.pickedPlayersData[ind][i].totalPicks + 1)
          }
          break
        }
      }
    }
  }

  if (req.session.player.gameStatus !== 0) {
    // game ended
    req.session.player.userScore[1] = calculateUniqueness(req.session.player.board, res.locals.pickedPlayersData)
  }

  res.render('index', {
    puzzle: puzzle,
    players: playerList,
    currGame: req.session.player,
    lastUpdated: lastUpdated
  })
})

app.get('/stats', [checkPuzzle, initPlayer, getStats], (req, res) => {
  req.session.update = Math.floor(Date.now() / 60000) // update cookie expiry every time user visits site

  if (req.session.player.gameStatus !== 0) {
  req.session.player.boardPercentages = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
    for (let ind = 0; ind < 9; ind++) {
      if (req.session.player.board[ind] !== undefined && req.session.player.board[ind] !== null) {
        // ind is filled with a player
        for (let i = 0; i < res.locals.pickedPlayersData[ind].length; i++) {
          if (res.locals.pickedPlayersData[ind][i].playerID === req.session.player.board[ind]) {
            req.session.player.boardPercentages[ind] = res.locals.pickedPlayersData[ind][i].percentage
            break
          }
        }
      }
    }
  }

  const numberGames = res.locals.finalScores[0].reduce((a, b) => a + b, 0)
  const scoreSum = res.locals.finalScores[0].reduce((a, b, ind) => a + b * ind, 0)

  if (req.session.player.gameStatus !== 0) {
    // game ended
    req.session.player.userScore[1] = calculateUniqueness(req.session.player.board, res.locals.pickedPlayersData)

    res.render('stats', {
      puzzle: puzzle,
      players: playerList,
      currGame: req.session.player,
      finalScores: res.locals.finalScores[0],
      averageScore: (scoreSum / numberGames).toFixed(1),
      numberGames: res.locals.finalScores[1],
      pickedPlayers: res.locals.pickedPlayersData,
      userOverallScores: req.session.userStats.finalGridAmount,
      averageUniqueness: res.locals.averageUniqueness,
      lastUpdated: lastUpdated
    })
  }
  else {
    res.render('stats', {
      puzzle: puzzle,
      players: playerList,
      currGame: req.session.player,
      finalScores: res.locals.finalScores[0],
      averageScore: (scoreSum / numberGames).toFixed(1),
      numberGames: res.locals.finalScores[1],
      pickedPlayers: undefined,
      userOverallScores: req.session.userStats.finalGridAmount,
      averageUniqueness: res.locals.averageUniqueness,
      lastUpdated: lastUpdated
    })
  }
})

app.post('/insertGuess', [checkPuzzle, checkPlayer, insertGuessHelper], (req, res) => {
  res.send(res.locals.guessReturn)
})

app.post('/concede', [checkPuzzle, checkPlayer, concedeHelper], (req, res) => {
  res.send(res.locals.guessReturn)
})

async function start() {
  console.log('reading csv...')
  lastUpdated = await readCSV(playerData, playerList)
  console.log(`Last updated: ${lastUpdated}`)
  app.listen(process.env.PORT || 4000, () => console.log("Server is running..."))
}

start()

// npx tailwindcss -i .\static\styles.css -o ./static/output.css --watch
// npx tailwindcss -i static/styles.css -o static/output.css --watch
