// File to update current playerData.csv file. Has not been tested after changes, so use with caution
const { getParsedPage, loadBrowser, readPlayerData, writePlayerData, getLastMatchForPlayer, updateStatsForPlayer } = require('./retrieve-data-fns.js')

async function main() {
  const browserPage = await loadBrowser();

  try {
    const idToName = {}
    const playerData = {}

    // now read csv file
    const lastUpdated = await readPlayerData(playerData, idToName)

    const currDate = new Date()
    currDate.setDate(currDate.getDate() + 1)
    const currDateArr = [currDate.getFullYear(), currDate.getMonth()+1, currDate.getDate()]
    if (currDateArr[1] < 10) {
      currDateArr[1] = '0' + currDateArr[1]
    }
    if (currDateArr[2] < 10) {
      currDateArr[2] = '0' + currDateArr[2]
    }

    const updateDate = new Date(lastUpdated)
    updateDate.setDate(updateDate.getDate() - 1)
    const updateDateArr = [updateDate.getFullYear(), updateDate.getMonth()+1, updateDate.getDate()]
    if (updateDateArr[1] < 10) {
      updateDateArr[1] = '0' + updateDateArr[1]
    }
    if (updateDateArr[2] < 10) {
      updateDateArr[2] = '0' + updateDateArr[2]
    }

    const matchLinks = new Set()
    const playerIds = new Set()

    let offset = 0

    while (true) {
      console.log(`loading matches with offset ${offset}...`)
      const matchesPage = await getParsedPage(browserPage, `https://www.hltv.org/stats/matches?startDate=${updateDateArr[0]}-${updateDateArr[1]}-${updateDateArr[2]}&endDate=${currDateArr[0]}-${currDateArr[1]}-${currDateArr[2]}&offset=${offset}`, ['table', 'matches-table'])

      // .first finds the first link of the match (removing redundant work)
      const matchResults = matchesPage.find('table', {'class': 'matches-table'}).find('tbody').findAll('tr', {'class': 'first'})

      if (matchResults.length === 0) {
        break
      }

      for (let i = 0; i < matchResults.length; i++) {
        const matchLink = matchResults[i].find('td', {'class': 'date-col'}).find('a').attrs.href
        matchLinks.add(matchLink)
      }

      offset += 50
    }

    for (const matchLink of matchLinks) {
      console.log(`${new Date().toLocaleTimeString()} - loading match ${matchLink}...`)
      const matchPage = await getParsedPage(browserPage, `https://www.hltv.org${matchLink}`, ['table', 'stats-table'])
      const players = matchPage.findAll('td', {'class': 'st-player'})

      for (let i = 0; i < players.length; i++) {
        const playerLink = players[i].find('a').attrs.href.split('/')
        const playerId = playerLink[3]

        // console.log(`adding playerID ${playerId}...`)
        playerIds.add(parseInt(playerId))
      }
    }

    let count = 1
    for (const id of playerIds) {
      console.log(`${new Date().toLocaleTimeString()} - getting stats for ID ${id} (${count} of ${playerIds.size})...`)
      count += 1

      if (playerData[id] === undefined) {
        playerData[id] = {
          name: "UNKNOWN_PLAYER",
          id: id,
          fullName: undefined,
          country: undefined,
          age: undefined,
          rating3: 'N/A',
          rating2: 'N/A',
          rating1: 'N/A',
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
      }

      await updateStatsForPlayer(browserPage, id, idToName[id] || "UNKNOWN_PLAYER", lastUpdated, playerData)

      await writePlayerData(playerData, lastUpdated, false)
    }

    await writePlayerData(playerData, lastUpdated, true)
    console.log(new Date().toLocaleTimeString() + ' - done!')
  }
  catch (err) {
    console.log(`failed loading with error`, err)
  }
}

main()
