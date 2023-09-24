// File to add 1.6 teams to csv

const JSSoup = require('jssoup').default
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
const { executablePath } = require('puppeteer')
const csv = require('csv-parser')
const sharp = require('sharp')

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getParsedPage(url, loadAllPlayers=false) {
  return new Promise(async function (resolve, reject) {
    await delay(2000)

    try {
      const browser = await puppeteer.launch({ headless: 'new' })

      const browserPage = await browser.newPage()

      await browserPage.setRequestInterception(true)

      browserPage.on('request', async request => {
        if (request.resourceType() === 'fetch' || request.resourceType() === 'image' || request.resourceType() === 'media' || request.resourceType() === 'font' || request.resourceType() === 'stylesheet' || request.resourceType() === 'websocket' || request.resourceType() === 'manifest' || request.resourceType() === 'other' ||
            (request.resourceType() === 'script' && !request.url().includes('hltv.js'))) {
          request.abort()
        } else {
          // console.log(request.url())
          request.continue()
        }
      })

      await browserPage.goto(url, { waitUntil: 'domcontentloaded' })
      const fullPage = await browserPage.evaluate(() => document.body.innerHTML)
      browser.close()

      if (loadAllPlayers) {
        const page = '<html><body>' + fullPage.substring(fullPage.indexOf('<div class="navbar">'), fullPage.indexOf('</table>')) + '</table></div></div></div></div></div></body></html>' // reduce page size to only relevant content
        resolve(new JSSoup(page))
      }
      else {
        const page = '<html><body>' + fullPage.substring(fullPage.indexOf('<div class="navbar">'))
        resolve(new JSSoup(page))
      }
    }
    catch (err) {
      console.log('failed getting page with error', err)
      console.log('retrying...', url)
      // reject(err)
      resolve(getParsedPage(url, loadAllPlayers))
    }
  })
}

async function readCSV(playerData, idToName) {
  return new Promise(async function (resolve, reject) {
    const parseType = ['', 'int', '', '', 'int', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']
    let lastUpdated = undefined
    let topRow = undefined
    fs.createReadStream('data/playerData.csv')
      .pipe(csv())
      .on('headers', (headers) => {
        topRow = headers
        lastUpdated = headers[0]
      })
      .on('data', (row) => {
        const rowData = Object.values(row)
        const playerID = parseInt(rowData[1])

        if (playerData[playerID] === undefined) {
          playerData[playerID] = {}
          playerData[playerID].name = rowData[0]
          idToName[playerID] = rowData[0]
        }

        for (let i = 1; i < rowData.length; i++) {
          if (rowData[i] === 'undefined' || rowData[i] === 'N/A') {
            playerData[playerID][topRow[i]] = 'N/A'
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
      })
      .on('end', () => {
        resolve(lastUpdated)
      })
  })
}

async function main() {
  const idToName = {}
  const playerData = {}

  const lastUpdated = await readCSV(playerData, idToName)
  const updateDate = new Date(lastUpdated)

  let dataToWrite = `${new Date().toDateString().split(' ').slice(1).join(' ')},id,fullName,country,age,rating2,rating1,KDDiff,maps,rounds,kills,deaths,KDRatio,HSRatio,adr,ratingTop20,ratingYear,clutchesTotal,teams,majorsWon,majorsPlayed,LANsWon,LANsPlayed,MVPs,top20s,top10s,topPlacement\n`

  try {
    for (const [id, name] of Object.entries(idToName)) {
      console.log('loading ' + name)
      const matchesPage = await getParsedPage('https://www.hltv.org/legacystats/player/matches/' + id + '/', true)
      const matchesTable = matchesPage.find('table', {'class': 'stats-table'}).find('tbody').findAll('tr')

      for (let i = 0; i < matchesTable.length; i++) {
        const matchDate = parseInt(matchesTable[i].findAll('td')[0].find('div', {'class': 'time'}).attrs['data-unix'])

        const teamURL = matchesTable[i].findAll('td')[1].find('a').attrs.href
        const teamID = parseInt(teamURL.split('/')[3])
        const teamURLName = teamURL.split('/')[4]
        const teamName = matchesTable[i].findAll('td')[1].find('a').text.replaceAll('&amp;', '&')

        playerData[id].teams.add(teamID + '/' + teamName)
      }

      // writing to string
      let addString = ''
      for (const [stat, statline] of Object.entries(playerData[id])) {
        if (stat === 'teams') {
          addString += `"${JSON.stringify([...statline]).replaceAll('"', '""')}",`
        }
        else if (stat === 'ratingYear') {
          addString += `"${JSON.stringify(statline).replaceAll('"', '""')}",`
        }
        else {
          addString += statline + ','
        }
      }

      dataToWrite += `${addString.substring(0, addString.length-1)}\n`
    }

    console.log(new Date().toLocaleTimeString() + ' - writing to csv...')
    fs.writeFile('data/playerData.csv', dataToWrite, err => {
      if (err) {
        console.error('error writing to file', err)
      }
    })

    console.log(new Date().toLocaleTimeString() + ' - done!')
  }
  catch (err) {
    console.log(`failed loading with error`, err)
  }

  // for (const [id, data] of Object.entries(playerData)) {
  //   let addString = ''

  //   for (const [stat, statline] of Object.entries(data)) {
  //     if (stat === 'teams') {
  //       addString += `"${JSON.stringify([...statline]).replaceAll('"', '""')}",`
  //     }
  //     else if (stat === 'ratingYear') {
  //       addString += `"${JSON.stringify(statline).replaceAll('"', '""')}",`
  //     }
  //     else {
  //       addString += statline + ','
  //     }
  //   }

  //   dataToWrite += `${addString}\n`
  // }
}

main()
