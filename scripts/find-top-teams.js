// script is used to filter out the teams that have been top 30 (for generating puzzles)
// prints out all teams that have been at least top 30 in some point in time
const fs = require('fs').promises
const fsold = require('fs')
const csv = require('csv-parser')

const { loadBrowser, getParsedPage } = require('./retrieve-data-fns.js')

async function readCSV(allTeams) {
  return new Promise(async function (resolve, reject) {
    fsold.createReadStream('data/playerData.csv')
    .pipe(csv())
    .on('headers', (headers) => {

    })
    .on('data', (row) => {
      const rowData = Object.values(row)
      const teamList = JSON.parse(rowData[19])

      for (let i = 0; i < teamList.length; i++) {
        allTeams.add(teamList[i])
      }
    })
    .on('end', () => {
      resolve(0)
    })
  })
}

async function main() {
  const browserInfo = await loadBrowser();

  const THRESHOLDS = [30, 20, 10]

  const data = await fs.readFile('data/all-teams.txt', 'utf8')
  const prevAllTeamsList = JSON.parse(data)
  let prevAllTeams = new Set(prevAllTeamsList)

  const prevTopTeams = {}
  const topTeams = {}

  for (const THRESHOLD of THRESHOLDS) {
    const prevTopTeamsList = JSON.parse(await fs.readFile('data/top-' + THRESHOLD + '-teams.txt', 'utf8'))
    prevTopTeams[THRESHOLD] = new Set(prevTopTeamsList)
    topTeams[THRESHOLD] = new Set(prevTopTeamsList)
  }

  const allTeams = new Set()

  await readCSV(allTeams)

  let teamCount = 1
  for (const team of allTeams) {
    console.log('loading team ' + team + ' (team ' + teamCount + ' of ' + allTeams.size + ')')
    teamCount += 1

    if (prevTopTeams[THRESHOLDS[THRESHOLDS.length - 1]].has(team)) {
      // team has already been processed, skip
      console.log('already processed team, skip')
      continue
    }

    const teamId = team.split('/')[0]
    const teamPage = await getParsedPage(browserInfo, 'https://www.hltv.org/team/' + teamId + '/a', ['div', 'team-chart-container'])

    if (teamPage.find('div', {'class': 'team-chart-container'}) === undefined) {
      // whoops broken link, shouldnt happen ??
      console.log('skipping team')
      continue
    }

    if (teamPage.find('div', {'class': 'team-chart-container'}).findAll('span', {'class': 'value'}).length > 1) {
      const rank = parseInt(teamPage.find('div', {'class': 'team-chart-container'}).findAll('span', {'class': 'value'})[1].text.substring(1))

      for (const THRESHOLD of THRESHOLDS) {
        if (rank <= THRESHOLD) {
          topTeams[THRESHOLD].add(team)
        }
      }
    }
  }

  console.log('writing to all teams file')
  const allTeamsList = Array.from(allTeams)
  allTeamsList.sort()
  await fs.writeFile('data/all-teams.txt', JSON.stringify(allTeamsList))

  for (const THRESHOLD of THRESHOLDS) {
    console.log('writing to top ' + THRESHOLD + ' teams file')
    const topTeamsList = Array.from(topTeams[THRESHOLD])
    topTeamsList.sort()
    await fs.writeFile('data/top-' + THRESHOLD + '-teams.txt', JSON.stringify(topTeamsList))
  }

  await browserInfo.browser.close()
}

main()
