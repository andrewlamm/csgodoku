// script is used to filter out the teams that have been top 30 (for generating puzzles)
// prints out all teams that have been at least top 30 in some point in time

const JSSoup = require('jssoup').default
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs').promises
const fsold = require('fs')
const csv = require('csv-parser')

puppeteer.use(StealthPlugin())

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getParsedPageHelper(url, findElement, loadAllPlayers=false) {
  return new Promise(async function (resolve, reject) {
    // console.log(new Date().toLocaleTimeString() + ' - getting page', url)
    let browser = undefined

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--disable-dev-shm-usage'],
        executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome' // UPDATE THIS TO YOUR CHROME PATH
      })

      const browserPage = await browser.newPage()

      await browserPage.setRequestInterception(true)

      browserPage.on('request', async request => {
        if (request.resourceType() === 'fetch' || request.resourceType() === 'image' || request.resourceType() === 'media' || request.resourceType() === 'font' || request.resourceType() === 'websocket' || request.resourceType() === 'manifest' || request.resourceType() === 'other' || request.resourceType() === 'script' && !request.url().includes('hltv')) {
          request.abort()
        } else {
          request.continue()
        }
      })

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
      browser.close()
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
        browser.close()
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

async function readCSV(allTeams) {
  return new Promise(async function (resolve, reject) {
    fsold.createReadStream('data/playerData.csv')
    .pipe(csv())
    .on('headers', (headers) => {

    })
    .on('data', (row) => {
      const rowData = Object.values(row)
      const teamList = JSON.parse(rowData[18])

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
    const teamPage = await getParsedPage('https://www.hltv.org/team/' + teamId + '/a', ['div', 'team-chart-container'])

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
}
main()

