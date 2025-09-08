// File to update current playerData.csv file. Has not been tested after changes, so use with caution
const { loadBrowser, readPlayerData, writePlayerData, getInitPlayerData, downloadCountryFlags, getLastMatchForPlayer, updateStatsForPlayer } = require('./retrieve-data-fns.js')

async function main(skip) {
  const browserPage = await loadBrowser();

  let currId = 0

  try {
    const { idToName, playerData, playerTableData, countryImages } = await getInitPlayerData(browserPage)

    await downloadCountryFlags(countryImages)

    // now read csv file
    const lastUpdated = await readPlayerData(playerData, idToName)
    const updateDate = new Date(lastUpdated)

    // loading all player data
    for (const [id, name] of Object.entries(idToName)) {
      // console.log(id, skip)
      if (id < skip) {
        console.log(new Date().toLocaleTimeString() + ' - skipping ' + name + ' id ' + id)
        continue
      }
      currId = parseInt(id)
      if (playerData[id] === undefined || playerTableData[id] === undefined || playerTableData[id].maps !== playerData[id].maps || playerTableData[id].rounds !== playerData[id].rounds || playerTableData[id].KDDiff !== playerData[id].KDDiff) {
        console.log(new Date().toLocaleTimeString() + ' - getting stats for ' + name)

        const lastMatch = getLastMatchForPlayer(id)

        if (lastMatch < updateDate && playerData[id].rounds !== "N/A") {
          // no need to update
          console.log(new Date().toLocaleTimeString() + ' - no new matches, skipping ' + name)
        }
        else {
          await updateStatsForPlayer(browserPage, id, name, lastUpdated, playerData)
        }
      }
      else {
        console.log('skipping ' + name)
      }

      await writePlayerData(playerData, lastUpdated, false)
    }

    await writePlayerData(playerData, lastUpdated, true)

    console.log(new Date().toLocaleTimeString() + ' - done!')
  }
  catch (err) {
    console.log(`failed loading with error`, err)
    console.log(`retrying with currId ${Math.max(currId, skip)}...`)
    main(Math.max(currId, skip))
  }
}

main(0)
