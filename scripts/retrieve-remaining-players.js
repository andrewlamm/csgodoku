// This script takes all the top teams and retrieves the players that are missing from the csv file

const fs = require('fs')

const { getParsedPage, loadBrowser, readPlayerData, writePlayerData, getInitPlayerData, downloadCountryFlags, getLastMatchForPlayer, updateStatsForPlayer } = require('./retrieve-data-fns.js')

async function getTopTeams() {
  return new Promise(async function (resolve, reject) {
    fs.readFile('data/top-30-teams.txt', 'utf8', function (err, data) {
      if (err) {
        console.log('failed to read top teams file')
        reject(err)
      }

      const topTeams = JSON.parse(data)
      resolve(topTeams)
    })
  })
}

async function main() {
  const browserPage = await loadBrowser()

  try {
    const { idToName, playerData, playerTableData, countryImages } = await getInitPlayerData(browserPage)

    const lastUpdated = await readPlayerData(playerData, idToName)
    const topTeams = await getTopTeams()

    for (let i = 0; i < topTeams.length; i++) {
      const teamName = topTeams[i]
      console.log(new Date().toLocaleTimeString(), ' - retrieving data for team', teamName, `(team ${i+1} of ${topTeams.length})`)
      const teamID = teamName.substring(0, teamName.lastIndexOf('/'))

      const teamPage = await getParsedPage(browserPage, `https://www.hltv.org/stats/teams/${teamID}/a`, ['div', 'teammate'])
      const teamPlayers = teamPage.findAll('div', {'class': 'teammate'})

      for (let j = 0; j < teamPlayers.length; j++) {
        const player = teamPlayers[j]
        if (player.find('a') !== undefined) {
          const playerLink = player.find('a').attrs.href.split('/')

          const id = playerLink[playerLink.length - 2]
          const name = player.find('a').text

          if (playerData[id] === undefined) {
            console.log(new Date().toLocaleTimeString(), ' - getting stats for', `${id}/${name}`)

            playerData[id] = {
              name: name,
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

            await updateStatsForPlayer(browserPage, id, name, lastUpdated, playerData)

            await writePlayerData(playerData, lastUpdated, false)
          }
        }
      }
    }

    await writePlayerData(playerData, lastUpdated, true)
    console.log(new Date().toLocaleTimeString() + ' - done!')
  }
  catch (err) {
    console.log('failed with error', err)
  }
}

main()
