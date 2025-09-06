// Adds a column for rating 3.0 in the data CSV. also fixes a bug with clutches being incorrectly counted

const JSSoup = require('jssoup').default
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
const csv = require('csv-parser')
const sharp = require('sharp')

puppeteer.use(StealthPlugin())

let browser = undefined;
let browserPage = undefined;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function loadBrowser() {
  browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-dev-shm-usage'],
    executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome' // UPDATE THIS TO YOUR CHROME PATH
  })

  browserPage = await browser.newPage()

  await browserPage.setRequestInterception(true)

  browserPage.on('request', async request => {
    if (request.resourceType() === 'fetch' || request.resourceType() === 'image' || request.resourceType() === 'media' || request.resourceType() === 'font' || request.resourceType() === 'websocket' || request.resourceType() === 'manifest' || request.resourceType() === 'other' || request.resourceType() === 'script' && !request.url().includes('hltv')) {
      request.abort()
    } else {
      request.continue()
    }
  })
}

async function getParsedPageHelper(url, findElement, loadAllPlayers=false) {
  return new Promise(async function (resolve, reject) {
    console.log(new Date().toLocaleTimeString() + ' - getting page', url)
    let browser = undefined

    try {
      // console.log(new Date().toLocaleTimeString() + ' - go to page', url)
      await browserPage.goto(url, { waitUntil: 'domcontentloaded' })
      // console.log(new Date().toLocaleTimeString() + ' - docloaded', url)
      // await browserPage.waitForSelector('.' + findElement[1])
      // console.log(new Date().toLocaleTimeString() + ' - loaded elm', url)
      // const fullPage = await browserPage.content()

      let timeout;
      let timeoutPromise = new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            clearTimeout(timeout)
            console.log("Function took longer than 5 seconds. Recalling...")
            resolve(getParsedPageHelper(url, findElement, loadAllPlayers))
          }, 10000);
      })

      const fullPage = await Promise.race([browserPage.content(), timeoutPromise])
      clearTimeout(timeout)

      // console.log(new Date().toLocaleTimeString() + ' - got content', url)
      // browser.close()
      // console.log(new Date().toLocaleTimeString() + ' - done going to page', url)

      const elementName = findElement[0]
      const className = findElement[1]

      if (loadAllPlayers) {
        const page = '<html><body>' + fullPage.substring(fullPage.indexOf('<div class="navbar">'), fullPage.indexOf('</table>')) + '</table></div></div></div></div></div></body></html>' // reduce page size to only relevant
        console.log(new Date().toLocaleTimeString() + ' - getting page completed', url)
        const soup = new JSSoup(page)
        if (soup === undefined || soup.find(elementName, {'class': className}) === undefined) {
          console.log('undefined soup or soup didnt contain elem, retrying...', url)
          await delay(5000)
          resolve(getParsedPageHelper(url, findElement, loadAllPlayers))
        }
        else {
          resolve(soup)
        }
      }
      else {
        const page = '<html><body>' + fullPage.substring(fullPage.indexOf('<div class="navbar">'))
        console.log(new Date().toLocaleTimeString() + ' - getting page completed', url)
        const soup = new JSSoup(page)
        if (soup === undefined || soup.find(elementName, {'class': className}) === undefined) {
          console.log('undefined soup or soup didnt contain elem, retrying...', url)
          await delay(5000)
          resolve(getParsedPageHelper(url, findElement, loadAllPlayers))
        }
        else {
          resolve(soup)
        }
      }
    }
    catch (err) {
      console.log('failed getting page with error', err)
      console.log('retrying...', url)
      if (browser !== undefined) {
        // browser.close()
      }
      // reject(err)
      resolve(getParsedPageHelper(url, findElement, loadAllPlayers))
    }
  })
}

async function getParsedPage(url, findElement, loadAllPlayers=false) {
  return new Promise(async function (resolve, reject) {
    let timeout;
    try {
      let timeoutPromise = new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            clearTimeout(timeout)
            console.log("Function took longer than 120 seconds. Recalling...")
            reject(new Error("Timeout reached"))
          }, 120000);
      })

      const page = await Promise.race([getParsedPageHelper(url, findElement, loadAllPlayers), timeoutPromise])

      clearTimeout(timeout)
      resolve(page)
    }
    catch (error) {
      console.error("get parsed page error:", error)
      clearTimeout(timeout)
      resolve(getParsedPage(url, findElement, loadAllPlayers))
    }
  })
}

// async function readCSV(playerData, idToName) {
//   return new Promise(async function (resolve, reject) {
//     const parseType = ['', 'int', '', '', 'int', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']
//     let lastUpdated = undefined
//     let topRow = undefined
//     fs.createReadStream('data/playerData.csv')
//       .pipe(csv())
//       .on('headers', (headers) => {
//         topRow = headers
//         lastUpdated = headers[0]
//       })
//       .on('data', (row) => {
//         const rowData = Object.values(row)
//         const playerID = parseInt(rowData[1])

//         if (playerData[playerID] === undefined) {
//           playerData[playerID] = {}
//           playerData[playerID].name = rowData[0]
//           idToName[playerID] = rowData[0]
//         }

//         for (let i = 1; i < rowData.length; i++) {
//           if (rowData[i] === 'undefined' || rowData[i] === 'N/A') {
//             playerData[playerID][topRow[i]] = 'N/A'
//           }
//           else if (parseType[i] === 'int') {
//             playerData[playerID][topRow[i]] = parseInt(rowData[i])
//           }
//           else if (parseType[i] === 'float') {
//             playerData[playerID][topRow[i]] = parseFloat(rowData[i])
//           }
//           else if (parseType[i] === 'set') {
//             playerData[playerID][topRow[i]] = new Set(JSON.parse(rowData[i]))
//           }
//           else if (parseType[i] === 'dictionary') {
//             const ratingDictionary = JSON.parse(rowData[i])
//             playerData[playerID][topRow[i]] = {}
//             for (const [year, rating] of Object.entries(ratingDictionary)) {
//               playerData[playerID][topRow[i]][parseInt(year)] = parseFloat(rating)
//             }
//           }
//           else {
//             playerData[playerID][topRow[i]] = rowData[i]
//           }
//           playerData[playerID]['rating3'] = 'N/A' // add new rating3 column
//         }
//       })
//       .on('end', () => {
//         resolve(lastUpdated)
//       })
//   })
// }

async function readCSV(playerData, idToName) {
  return new Promise(async function (resolve, reject) {
    const parseType = ['', 'int', '', '', 'int', 'float', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']
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

async function writeData(playerData, lastUpdated, done) {
  let dataToWrite = `${new Date(lastUpdated).toDateString().split(' ').slice(1).join(' ')},id,fullName,country,age,rating3,rating2,rating1,KDDiff,maps,rounds,kills,deaths,KDRatio,HSRatio,adr,ratingTop20,ratingYear,clutchesTotal,teams,majorsWon,majorsPlayed,LANsWon,LANsPlayed,MVPs,top20s,top10s,topPlacement\n`
  if (done) {
    dataToWrite = `${new Date().toDateString().split(' ').slice(1).join(' ')},id,fullName,country,age,rating3,rating2,rating1,KDDiff,maps,rounds,kills,deaths,KDRatio,HSRatio,adr,ratingTop20,ratingYear,clutchesTotal,teams,majorsWon,majorsPlayed,LANsWon,LANsPlayed,MVPs,top20s,top10s,topPlacement\n`
  }

  const fields = ["name", "id", "fullName", "country", "age", "rating3", "rating2", "rating1", "KDDiff", "maps", "rounds", "kills", "deaths", "KDRatio", "HSRatio", "adr", "ratingTop20", "ratingYear", "clutchesTotal", "teams", "majorsWon", "majorsPlayed", "LANsWon", "LANsPlayed", "MVPs", "top20s", "top10s", "topPlacement"]


  for (const [id, data] of Object.entries(playerData)) {
    let addString = ''

    for (let i = 0; i < fields.length; i++) {
      const stat = fields[i]
      const statline = data[stat]

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

  if (done)
    console.log(new Date().toLocaleTimeString() + ' - writing to csv (with final date)...')
  else
    console.log(new Date().toLocaleTimeString() + ' - writing to csv...')
  fs.writeFile('data/playerData.csv', dataToWrite, err => {
    if (err) {
      console.error('error writing to file', err)
    }
  })
}


async function main(skip) {
  await loadBrowser();

  const idToName = {}
  const playerData = {}

  let curr_id = 0

  try {
    const lastUpdated = await readCSV(playerData, idToName)
    const updateDate = new Date(lastUpdated)

    const currDate = new Date()
    const currDateArr = [currDate.getFullYear(), currDate.getMonth()+1, currDate.getDate()]
    if (currDateArr[1] < 10) {
      currDateArr[1] = '0' + currDateArr[1]
    }
    if (currDateArr[2] < 10) {
      currDateArr[2] = '0' + currDateArr[2]
    }

    for (const [id, name] of Object.entries(idToName)) {
      if (id < skip) {
        console.log(new Date().toLocaleTimeString() + ' - skipping ' + name + ' id ' + id)
        continue
      }

      console.log(new Date().toLocaleTimeString() + ' - getting stats for ' + name)

      curr_id = parseInt(id)

      let clutchesWon = 0
      for (let i = 0; i < 5; i++) {
        const clutchPage = await getParsedPage('https://www.hltv.org/stats/players/clutches/' + id + `/1on${i+1}/` + name, ['div', 'summary-box'])
        const clutches = clutchPage.find('div', {'class': 'summary-box'}).find('div', {'class': 'value'}).text
        if (!isNaN(clutches)) {
          clutchesWon += parseInt(clutches)
        }
      }
      playerData[id].clutchesTotal = clutchesWon

      const statsPage = await getParsedPage(`https://www.hltv.org/stats/players/${id}/${name}?startDate=2024-01-01&endDate=${currDateArr[0]}-${currDateArr[1]}-${currDateArr[2]}`, ['div', 'stats-row'])
      const ratingType = statsPage.find('div', {'class': 'player-summary-stat-box-data-description-text'})

      if (ratingType !== undefined && ratingType.text.includes('3.0')) {
        const rating = parseFloat(statsPage.findAll('div', {'class': 'player-summary-stat-box-rating-data-text'})[0].text)
        playerData[id].rating3 = rating
        console.log(new Date().toLocaleTimeString() + ' - got rating3 for ' + name + ': ' + rating)
      }

      await writeData(playerData, lastUpdated, false)

    }

    await writeData(playerData, lastUpdated, false)
    console.log(new Date().toLocaleTimeString() + ' - done!')
  }
  catch (err) {
    console.log(`failed loading with error`, err)
    console.log(`retrying with curr_id ${Math.max(curr_id, skip)}...`)
    main(Math.max(curr_id, skip))
  }
}

main(23580);
