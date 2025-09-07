// File to update current playerData.csv file

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

function wait(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, ms, 'TIMED_OUT');
  })
}

async function downloadImage(url, category, id) {
  await delay(2000)
  const fixedURL = url.replaceAll('&amp;', '&')

  if (fixedURL.includes('player_silhouette.png') || fixedURL.includes('placeholder.svg')) {
    // skip downloading image
    return
  }
  else {
    const picture = await (await fetch(fixedURL)).blob()
    const arrayBuffer = await picture.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    sharp(buffer).png().toFile(`static/images/${category}/${id}.png`, (err, info) => {
      if (err) console.log(err)
    })

    // fs.writeFile(`static/images/${category}/${id}.png`, buffer, err => {
    //   if (err) console.log(err)
    // })
  }
}

async function getTeamImage(url) {
  await delay(2000)
  if (url === '6548/?')
    url = '6548/-'

  const page = await getParsedPage(`https://www.hltv.org/stats/teams/${url}`, ['div', 'context-item'])
  // const soupPage = new JSSoup(page)
  const imageURL = page.find('div', {'class': 'context-item'}).find('img').attrs.src
  if (imageURL === undefined) {
    console.log('retrying bc image url doesnt exist...')
    await delay(5000)
    getTeamImage(url)
  }
  else {
    const id = url.split('/')[0]

    downloadImage(imageURL.charAt(0) === '/' ? `https://www.hltv.org${imageURL}` : imageURL, 'team', id)
  }
}

async function getPlayerProfile(url) {
  await delay(2000)
  const page = await (await fetch(url)).text()
  return new JSSoup(page)
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
    if (request.resourceType() === 'fetch' || request.resourceType() === 'image' || request.resourceType() === 'media' || request.resourceType() === 'font' || request.resourceType() === 'websocket' || request.resourceType() === 'manifest' || request.resourceType() === 'fetch' || request.resourceType() === 'other' || (request.resourceType() === 'document' && !request.url().includes('hltv')) || (request.resourceType() === 'script' && !request.url().includes('hltv'))) {
      request.abort()
    } else {
      request.continue()
    }
  })
}

async function getParsedPageHelper(url, findElement, loadAllPlayers=false) {
  return new Promise(async function (resolve, reject) {
    // await delay(2000)

    console.log(new Date().toLocaleTimeString() + ' - getting page', url)

    try {
      console.log(new Date().toLocaleTimeString() + ' - go to page', url)
      await Promise.race([
        browserPage.goto(url, { waitUntil: 'domcontentloaded' }),
        new Promise(resolve => setTimeout(resolve, 10000)) // 10s fallback
      ]);
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
        // console.log(new Date().toLocaleTimeString() + ' - getting page completed', url)
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
        // console.log(new Date().toLocaleTimeString() + ' - getting page completed', url)
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

  const downloadedCountryImages = {}
  const downloadTeamLinks = new Set()

  const idToName = {}
  const playerData = {}
  const playerCache = {}

  let curr_id = 0

  try {
    const player_list = await getParsedPage('https://www.hltv.org/stats/players', ['table', 'stats-table'], true)
    const players = player_list.find('table', {'class': 'stats-table'} ).find('tbody').findAll('tr')

    players.map(player => {
      const playerName = player.find('td', {'class': 'playerCol'}).text
      const playerID = parseInt(player.find('td', {'class': 'playerCol'}).find('a').attrs.href.split('/')[3])

      const countryElement = player.find('td', {'class': 'playerCol'}).find('img')
      downloadedCountryImages[countryElement.attrs.title] = `https://www.hltv.org${countryElement.attrs.src}`

      idToName[playerID] = playerName
      playerData[playerID] = {
        name: playerName,
        id: playerID,
        fullName: undefined,
        country: undefined,
        age: undefined,
        rating2: 'N/A',
        rating1: parseFloat(player.find('td', {'class': 'ratingCol'}).text),
        KDDiff: undefined,
        maps: undefined,
        rounds: undefined,
        kills: undefined,
        deaths: undefined,
        KDRatio: undefined,
        HSRatio: undefined,
        adr: undefined,
        ratingTop20: undefined,
        ratingYear: {},
        clutchesTotal: undefined,
        teams: new Set(),
        majorsWon: undefined,
        majorsPlayed: undefined,
        LANsWon: undefined,
        LANsPlayed: undefined,
        MVPs: undefined,
        top20s: undefined,
        top10s: undefined,
        topPlacement: 'N/A',
      }

      const playerCells = player.findAll('td')
      playerCache[playerID] = {
        maps: parseInt(playerCells[2].text),
        rounds: parseInt(playerCells[3].text),
        KDDiff: parseInt(playerCells[4].text),
      }
    })

    console.log(new Date().toLocaleTimeString() + ' - downloading country flags...')
    for (const [country, url] of Object.entries(downloadedCountryImages)) {
      if (fs.existsSync(`static/images/country/${country}.png`)) {
        // console.log(new Date().toLocaleTimeString() + ' - skipping ' + country)
      }
      else {
        console.log(new Date().toLocaleTimeString() + ' - downloading ' + country)
        await downloadImage(url, 'country', country)
      }
    }

    // now read csv file
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

    // loading all player data
    for (const [id, name] of Object.entries(idToName)) {
      // console.log(id, skip)
      if (id < skip) {
        console.log(new Date().toLocaleTimeString() + ' - skipping ' + name + ' id ' + id)
        continue
      }
      curr_id = parseInt(id)
      if (playerData[id] === undefined || playerCache[id] === undefined || playerCache[id].maps !== playerData[id].maps || playerCache[id].rounds !== playerData[id].rounds || playerCache[id].KDDiff !== playerData[id].KDDiff) {
        console.log(new Date().toLocaleTimeString() + ' - getting stats for ' + name)

        const profileMatchesPage = await getPlayerProfile('https://www.hltv.org/player/' + id + '/a#tab-matchesBox')
        let lastMatch = new Date()
        if (profileMatchesPage.find('tr', {'class': 'team-row'}) !== undefined) {
          lastMatch = new Date(parseInt(profileMatchesPage.find('tr', {'class': 'team-row'}).find('td', {'class': 'date-cell'}).find('span').attrs['data-unix']))
        }

        if (lastMatch < updateDate && playerData[id].rounds !== "N/A") {
          // no need to update
          console.log(new Date().toLocaleTimeString() + ' - no new matches, skipping ' + name)
        }
        else {
          const statsPage = await getParsedPage('https://www.hltv.org/stats/players/' + id + '/' + name, ['div', 'stats-row'])

          const statsDivs = statsPage.findAll('div', {'class': 'stats-row'})

          let mapsBox = undefined
          let playerMaps = undefined
          let roundsBox = undefined
          let playerRounds = undefined
          let killsBox = undefined
          let playerKills = undefined
          let deathsBox = undefined
          let playerDeaths = undefined

          if (statsDivs.length === 10) {
            mapsBox = statsDivs[4]
            playerMaps = parseInt(mapsBox.findAll('span')[1].text)

            roundsBox = statsDivs[5]
            playerRounds = parseInt(roundsBox.findAll('span')[1].text)

            killsBox = statsDivs[0]
            playerKills = parseInt(killsBox.findAll('span')[1].text)

            deathsBox = statsDivs[2]
            playerDeaths = parseInt(deathsBox.findAll('span')[1].text)
          }
          else {
            mapsBox = statsDivs[6]
            playerMaps = parseInt(mapsBox.findAll('span')[1].text)

            roundsBox = statsDivs[7]
            playerRounds = parseInt(roundsBox.findAll('span')[1].text)

            killsBox = statsDivs[0]
            playerKills = parseInt(killsBox.findAll('span')[1].text)

            deathsBox = statsDivs[2]
            playerDeaths = parseInt(deathsBox.findAll('span')[1].text)
          }

          if (playerData[id].maps === playerMaps && playerData[id].rounds === playerRounds && playerData[id].kills === playerKills && playerData[id].deaths === playerDeaths) {
            console.log(new Date().toLocaleTimeString() + ' - justkidding, skipping ' + name)
          }
          else {
            playerData[id].maps = playerMaps
            playerData[id].rounds = playerRounds
            playerData[id].kills = playerKills
            playerData[id].deaths = playerDeaths

            playerData[id].KDDiff = playerData[id].kills - playerData[id].deaths

            if (statsPage.find('img', {'class': 'player-summary-stat-box-left-bodyshot'}) !== undefined) {
              const imageURL = statsPage.find('img', {'class': 'player-summary-stat-box-left-bodyshot'}).attrs.src
              await downloadImage(imageURL.charAt(0) === '/' ? `https://www.hltv.org${imageURL}` : imageURL, 'player', id)
            }
            else if (statsPage.find('img', {'class': 'summarySquare'}) !== undefined) {
              const imageURL = statsPage.find('img', {'class': 'summarySquare'}).attrs.src
              await downloadImage(imageURL.charAt(0) === '/' ? `https://www.hltv.org${imageURL}` : imageURL, 'player', id)
            }

            playerData[id].fullName = statsPage.find('div', {'class': 'player-summary-stat-box-left-player-name'}).text

            playerData[id].age = parseInt(statsPage.find('div', {'class': 'player-summary-stat-box-left-player-age'}).text.split(' ')[0])
            if (isNaN(playerData[id].age)) {
              playerData[id].age = 'N/A'
            }

            playerData[id].country = statsPage.find('div', {'class': 'player-summary-stat-box-left-flag'}).find('img').attrs.title

            const ratingNumber = parseFloat(statsPage.find('div', {'class': 'player-summary-stat-box-rating-data-text'}).text)
            const ratingText = statsPage.find('div', {'class': 'player-summary-stat-box-data-description-text'}).text
            if (ratingText.includes('3.0')) {
              playerData[id].rating3 = ratingNumber
              playerData[id].rating2 = 'N/A'
            }
            else if (ratingText.includes('2.0')) {
              playerData[id].rating2 = ratingNumber
            }
            else {
              playerData[id].rating2 = 'N/A'
              playerData[id].rating1 = ratingNumber
            }

            const rating3Page = await getParsedPage(`https://www.hltv.org/stats/players/${id}/${name}?startDate=2024-01-01&endDate=${currDateArr[0]}-${currDateArr[1]}-${currDateArr[2]}`, ['div', 'stats-row'])
            const rating3Type = rating3Page.find('div', {'class': 'player-summary-stat-box-data-description-text'})

            if (rating3Type !== undefined && rating3Type.text.includes('3.0')) {
              const rating = parseFloat(rating3Page.findAll('div', {'class': 'player-summary-stat-box-rating-data-text'})[0].text)
              playerData[id].rating3 = rating
            }

            const KDRatioBox = statsDivs[3]
            playerData[id].KDRatio = parseFloat(KDRatioBox.findAll('span')[1].text)

            const HSRatioBox = statsDivs[1]
            playerData[id].HSRatio = parseFloat(HSRatioBox.findAll('span')[1].text)

            const adrBox = statsDivs[4]
            playerData[id].adr = statsDivs.length === 10 ? 'N/A' : parseFloat(adrBox.findAll('span')[1].text)

            const ratingBoxes = statsPage.findAll('div', {'class': 'rating-breakdown'})
            if (ratingBoxes[2].find('div').text === '-') {
              playerData[id].ratingTop20 = 'N/A'
            }
            else {
              playerData[id].ratingTop20 = parseFloat(ratingBoxes[2].find('div').text)
            }

            const careerPage = await getParsedPage('https://www.hltv.org/stats/players/career/' + id + '/' + name, ['table', 'stats-table'])

            const ratingYear = careerPage.find('table', {'class': 'stats-table'}).find('tbody').findAll('tr')
            for (let i = 0; i < ratingYear.length; i++) {
              if (isNaN(ratingYear[i].findAll('td')[0].text)) {
                // not a number (probably last 3 months text)
                continue
              }
              const year = parseInt(ratingYear[i].findAll('td')[0].text)
              const rating = parseFloat(ratingYear[i].findAll('td')[1].find('span').text)
              playerData[id].ratingYear[year] = rating
            }

            let clutchesWon = 0
            for (let i = 0; i < 5; i++) {
              const clutchPage = await getParsedPage('https://www.hltv.org/stats/players/clutches/' + id + `/1on${i+1}/` + name, ['div', 'summary-box'])
              const clutches = clutchPage.find('div', {'class': 'summary-box'}).find('div', {'class': 'value'}).text
              if (!isNaN(clutches)) {
                clutchesWon += parseInt(clutches)
              }
            }
            playerData[id].clutchesTotal = clutchesWon

            let matchesPage = undefined
            if (playerData[id].majorsWon === undefined || playerData[id].majorsWon === "N/A") {
              // completely new player
              console.log('new player')
              matchesPage = await getParsedPage('https://www.hltv.org/stats/players/matches/' + id + '/' + name, ['table', 'stats-table'], true)
            }
            else {
              const updateDate = new Date(lastUpdated)
              updateDate.setDate(updateDate.getDate() - 1)
              const updateDateArr = [updateDate.getFullYear(), updateDate.getMonth()+1, updateDate.getDate()]
              if (updateDateArr[1] < 10) {
                updateDateArr[1] = '0' + updateDateArr[1]
              }
              if (updateDateArr[2] < 10) {
                updateDateArr[2] = '0' + updateDateArr[2]
              }

              matchesPage = await getParsedPage(`https://www.hltv.org/stats/players/matches/${id}/${name}?startDate=${updateDateArr[0]}-${updateDateArr[1]}-${updateDateArr[2]}&endDate=${currDateArr[0]}-${currDateArr[1]}-${currDateArr[2]}`, ['table', 'stats-table'])
            }
            const matchesTable = matchesPage.find('table', {'class': 'stats-table'}).find('tbody').findAll('tr')

            for (let i = 0; i < matchesTable.length; i++) {
              const matchDate = parseInt(matchesTable[i].findAll('td')[0].find('div', {'class': 'time'}).attrs['data-unix'])
              if (new Date(matchDate) < updateDate && playerData[id].majorsWon !== "N/A" && playerData[id].majorsWon !== undefined) {
                // old match, no need to update
                break
              }

              const teamURL = matchesTable[i].findAll('td')[1].find('a').attrs.href
              const teamID = parseInt(teamURL.split('/')[3])
              // const teamURLName = teamURL.split('/')[4]
              const teamURLName = "a" // doesnt matter i think
              const teamName = matchesTable[i].findAll('td')[1].find('a').text.replaceAll('&amp;', '&')

              playerData[id].teams.add(teamID + '/' + teamName)

              if (!downloadTeamLinks.has(teamID + '/' + teamName)) {
                await getTeamImage(teamID + '/' + teamURLName)

                downloadTeamLinks.add(teamID + '/' + teamName)
              }
            }

            const profilePage = await getParsedPage('https://www.hltv.org/player/' + id + '/' + name, ['div', 'playerProfile'])
            // const teamsTable = profilePage.find('table', {'class': 'team-breakdown'}).find('tbody').findAll('tr', {'class': 'team'})

            // for (let i = 0; i < teamsTable.length; i++) {
            //   const teamName = teamsTable[i].find('td', {'class': 'team-name-cell'}).text
            //   const teamID = parseInt(teamsTable[i].find('td', {'class': 'team-name-cell'}).find('a').attrs.href.split('/')[2])
            //   playerData[id].teams.add(teamID + '/' + teamName)

            //   if (!downloadTeamLinks.has(teamID + '/' + teamName)) {
            //     await getTeamImage(teamID + '/' + teamName)

            //     downloadTeamLinks.add(teamID + '/' + teamName)
            //   }
            // }

            if (profilePage.find('div', {'id': 'majorAchievement'}) !== undefined) {
              const majorAchievements = profilePage.find('div', {'id': 'majorAchievement'}).findAll('div', {'class': 'highlighted-stat'})
              playerData[id].majorsWon = parseInt(majorAchievements[0].find('div', {'class': 'stat'}).text)
              playerData[id].majorsPlayed = parseInt(majorAchievements[1].find('div', {'class': 'stat'}).text)
            }
            else {
              playerData[id].majorsWon = 0
              playerData[id].majorsPlayed = 0
            }

            if (profilePage.find('div', {'id': 'lanAchievement'}) !== undefined) {
              const LANAchievements = profilePage.find('div', {'id': 'lanAchievement'}).findAll('div', {'class': 'highlighted-stat'})
              playerData[id].LANsWon = parseInt(LANAchievements[0].find('div', {'class': 'stat'}).text)
              playerData[id].LANsPlayed = parseInt(LANAchievements[1].find('div', {'class': 'stat'}).text)
            }
            else {
              playerData[id].LANsWon = 0
              playerData[id].LANsPlayed = 0
            }

            if (profilePage.find('div', {'class': 'mvp-section'}) !== undefined) {
              const MVPs = profilePage.find('div', {'class': 'mvp-section'}).findAll('tr', {'class': 'trophy-row'})
              playerData[id].MVPs = MVPs.length
            }
            else {
              playerData[id].MVPs = 0
            }

            if (profilePage.find('div', {'class': 'top20-section'}) !== undefined) {
              const top20s = profilePage.find('div', {'class': 'top20-section'}).findAll('tr', {'class': 'trophy-row'})
              playerData[id].top20s = top20s.length

              let top10s = 0
              let minPlacement = 20
              top20s.map(top20 => {
                const placement = parseInt(top20.find('div', {'class': 'trophy-event'}).text.split(' ')[0].substring(1))
                if (placement <= 10)
                  top10s++
                minPlacement = Math.min(minPlacement, placement)
              })
              playerData[id].top10s = top10s

              if (top20s.length > 0)
                playerData[id].topPlacement = minPlacement
            }
            else {
              playerData[id].top20s = 0
              playerData[id].top10s = 0
              playerData[id].topPlacement = 'N/A'
            }
          }
        }
      }
      else {
        console.log('skipping ' + name)
      }

      await writeData(playerData, lastUpdated, false)
    }

    await writeData(playerData, lastUpdated, true)

    // console.log(new Date().toLocaleTimeString() + ' - writing to csv (with final date)...')
    // fs.writeFile('data/playerData.csv', dataToWrite, err => {
    //   if (err) {
    //     console.error('error writing to file', err)
    //   }
    // })

    console.log(new Date().toLocaleTimeString() + ' - done!')
  }
  catch (err) {
    console.log(`failed loading with error`, err)
    console.log(`retrying with curr_id ${Math.max(curr_id, skip)}...`)
    main(Math.max(curr_id, skip))
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

main(0)
