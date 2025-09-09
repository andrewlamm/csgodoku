// File to create a completely new csv file with all player data. Has not been tested after changes, so use with caution

const { loadBrowser, readPlayerData, writePlayerData, getInitPlayerData, downloadCountryFlags, getLastMatchForPlayer, updateStatsForPlayer } = require('./retrieve-data-fns.js')

async function main() {
  const browserInfo = await loadBrowser();

  const lastUpdated = new Date(0)

  console.log(new Date().toLocaleTimeString() + ' loading initial players...')
  const { idToName, playerData, countryImages } = await getInitPlayerData(browserInfo)

  await downloadCountryFlags(countryImages)

  try {
    // loading all player data
    for (const [id, name] of Object.entries(idToName)) {
      await updateStatsForPlayer(browserInfo, id, name, lastUpdated, playerData)

      await writePlayerData(playerData, lastUpdated, false)
    }

    await writePlayerData(playerData, lastUpdated, true)
    console.log('done!')
  }
  catch (err) {
    console.log(`failed loading with error`, err)
  }
}

main();
