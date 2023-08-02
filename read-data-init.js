// File to create a completely new csv file with all player data

const JSSoup = require('jssoup').default
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
const { executablePath } = require('puppeteer')
const sharp = require('sharp')

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function downloadImage(url, category, id) {
  await delay(2000)
  const fixedURL = url.replaceAll('&amp;', '&')

  // console.log(fixedURL)

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
      reject(err)
    }
  })
}

async function main() {
  const downloadedCountryImages = {}
  const downloadedTeamImages = new Set()

  const idToName = {}
  const playerData = {}

  const player_list = await getParsedPage('https://www.hltv.org/stats/players', true)
  const players = player_list.find('table', {'class': 'stats-table'} ).find('tbody').findAll('tr')

  console.log(new Date().toLocaleTimeString() + ' loading initial players...')
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
      country: countryElement.attrs.title,
      age: undefined,
      rating2: undefined,
      rating1: parseFloat(player.find('td', {'class': 'ratingCol'}).text),
      KDDiff: parseInt(player.find('td', {'class': 'kdDiffCol'}).text),
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
      topPlacement: undefined,
    }
  })

  console.log(new Date().toLocaleTimeString() + ' - downloading country flags...')
  for (const [country, url] of Object.entries(downloadedCountryImages)) {
    await downloadImage(url, 'country', country)
  }

  let dataToWrite = `${new Date().toDateString().split(' ').slice(1).join(' ')},id,fullName,country,age,rating2,rating1,KDDiff,maps,rounds,kills,deaths,KDRatio,HSRatio,adr,ratingTop20,ratingYear,clutchesTotal,teams,majorsWon,majorsPlayed,LANsWon,LANsPlayed,MVPs,top20s,top10s,topPlacement\n`

  try {
    // loading all player data
    ct = 0
    for (const [id, name] of Object.entries(idToName)) {
      if (ct < 576) {
        console.log('skipping', name)
        ct += 1
        continue
      }
      ct += 1
      console.log(new Date().toLocaleTimeString() + ' - getting stats for ' + name)
      const statsPage = await getParsedPage('https://www.hltv.org/stats/players/' + id + '/' + name)

      if (statsPage.find('img', {'class': 'summaryBodyshot'}) !== undefined) {
        const imageURL = statsPage.find('img', {'class': 'summaryBodyshot'}).attrs.src
        await downloadImage(imageURL.charAt(0) === '/' ? `https://www.hltv.org${imageURL}` : imageURL, 'player', id)
      }
      else if (statsPage.find('img', {'class': 'summarySquare'}) !== undefined) {
        const imageURL = statsPage.find('img', {'class': 'summarySquare'}).attrs.src
        await downloadImage(imageURL.charAt(0) === '/' ? `https://www.hltv.org${imageURL}` : imageURL, 'player', id)
      }

      playerData[id].fullName = statsPage.find('div', {'class': 'summaryRealname'}).text

      playerData[id].age = parseInt(statsPage.find('div', {'class': 'summaryPlayerAge'}).text.split(' ')[0])

      const statsDivs = statsPage.findAll('div', {'class': 'stats-row'})

      const ratingBox = statsDivs[13]
      if (ratingBox.text.includes('2.0')) {
        playerData[id].rating2 = parseFloat(ratingBox.findAll('span')[1].text)
      }
      else {
        playerData[id].rating2 = 'N/A'
      }

      const mapsBox = statsDivs[6]
      playerData[id].maps = parseInt(mapsBox.findAll('span')[1].text)

      const roundsBox = statsDivs[7]
      playerData[id].rounds = parseInt(roundsBox.findAll('span')[1].text)

      const killsBox = statsDivs[0]
      playerData[id].kills = parseInt(killsBox.findAll('span')[1].text)

      const deathsBox = statsDivs[2]
      playerData[id].deaths = parseInt(deathsBox.findAll('span')[1].text)

      const KDRatioBox = statsDivs[3]
      playerData[id].KDRatio = parseFloat(KDRatioBox.findAll('span')[1].text)

      const HSRatioBox = statsDivs[1]
      playerData[id].HSRatio = parseFloat(HSRatioBox.findAll('span')[1].text)

      const adrBox = statsDivs[4]
      playerData[id].adr = parseFloat(adrBox.findAll('span')[1].text)

      const ratingBoxes = statsPage.findAll('div', {'class': 'rating-breakdown'})
      if (ratingBoxes[2].find('div').text === '-') {
        playerData[id].ratingTop20 = 'N/A'
      }
      else {
        playerData[id].ratingTop20 = parseFloat(ratingBoxes[2].find('div').text)
      }

      const careerPage = await getParsedPage('https://www.hltv.org/stats/players/career/' + id + '/' + name)

      const ratingYear = careerPage.find('table', {'class': 'stats-table'}).find('tbody').findAll('tr')
      for (let i = 0; i < ratingYear.length-1; i++) {
        const year = parseInt(ratingYear[i].findAll('td')[0].text)
        const rating = parseFloat(ratingYear[i].findAll('td')[1].find('span').text)
        playerData[id].ratingYear[year] = rating
      }

      let clutchesWon = 0
      for (let i = 0; i < 5; i++) {
        const clutchPage = await getParsedPage('https://www.hltv.org/stats/players/clutches/' + id + `/1on${i+1}/` + name)
        const clutches = parseInt(clutchPage.find('div', {'class': 'summary-box'}).find('div', {'class': 'value'}).text)
        clutchesWon += clutches
      }
      playerData[id].clutchesTotal = clutchesWon

      const profilePage = await getParsedPage('https://www.hltv.org/player/' + id + '/' + name)
      const teamsTable = profilePage.find('table', {'class': 'team-breakdown'}).find('tbody').findAll('tr', {'class': 'team'})

      for (let i = 0; i < teamsTable.length; i++) {
        const teamName = teamsTable[i].find('td', {'class': 'team-name-cell'}).text
        const teamID = parseInt(teamsTable[i].find('td', {'class': 'team-name-cell'}).find('a').attrs.href.split('/')[2])
        playerData[id].teams.add(teamID + '/' + teamName)

        if (!downloadedTeamImages.has(teamID)) {
          const teamImageURL = teamsTable[i].find('td', {'class': 'team-name-cell'}).find('img', {'class': 'team-logo'}).attrs.src
          if (teamImageURL.charAt(0) === '/') {
            await downloadImage(`https://www.hltv.org${teamImageURL}`, 'team', teamID)
          }
          else {
            await downloadImage(teamImageURL, 'team', teamID)
          }

          downloadedTeamImages.add(teamID)
        }
      }

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

      dataToWrite += `${addString}\n`
    }

    fs.writeFile('playerData.csv', dataToWrite, err => {
      if (err) {
        console.error('error writing to file', err)
      }
    })
  }
  catch (err) {
    console.log(`failed loading with error`, err)

    fs.writeFile('playerData.csv', dataToWrite, err => {
      if (err) {
        console.error('error writing to file', err)
      }
    })
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
