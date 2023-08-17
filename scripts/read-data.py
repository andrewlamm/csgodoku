# does not work properly - selenium tabs do not close properly and the program is ~2x slower than the js version

from selenium import webdriver
from selenium_stealth import stealth
import undetected_chromedriver as uc
import time
from datetime import date
from bs4 import BeautifulSoup
import traceback

def get_parsed_page(url):
  # print('getting', time.strftime("%H:%M:%S", time.localtime()))
  time.sleep(2)

  driver = uc.Chrome(headless=True, version_main = 108)

  driver.get(url)

  html = driver.page_source

  driver.quit()

  page = '<html><body>' + html[html.index('<div class="navbar">'):]

  # print('end', time.strftime("%H:%M:%S", time.localtime()))

  return BeautifulSoup(page, 'html.parser')

name_to_id = {}
player_data = {}

player_list = get_parsed_page('https://www.hltv.org/stats/players')
players = player_list.find('table', class_='stats-table').find('tbody').find_all('tr')

for player in players:
  player_name = player.find('td', class_='playerCol').text
  player_id = int(player.find('td', class_='playerCol').find('a')['href'].split('/')[3])

  name_to_id[player_name] = player_id
  player_data[player_id] = {
    'name': player_name,
    'id': player_id,
    'full_name': None,
    'country': player.find('td', class_='playerCol').find('img').attrs['title'],
    'age': None,
    'rating2': None,
    'rating1': float(player.find('td', class_='ratingCol').text),
    'KD_diff': int(player.find('td', class_='kdDiffCol').text),
    'maps': None,
    'rounds': None,
    'kills': None,
    'deaths': None,
    'KD_ratio': None,
    'HS_ratio': None,
    'adr': None,
    'rating_top20': None,
    'rating_year': {},
    'clutches_total': None,
    'teams': set(),
    'majors_won': None,
    'majors_played': None,
    'LANs_won': None,
    'LANs_played': None,
    'MVPs': None,
    'top20s': None,
    'top10s': None,
    'top_placement': None,
  }

data_to_write = date.today().strftime("%B %d %Y") + ',id,fullName,country,age,rating2,rating1,KDDiff,maps,rounds,kills,deaths,KDRatio,HSRatio,adr,ratingTop20,ratingYear,clutchesTotal,teams,majorsWon,majorsPlayed,LANsWon,LANsPlayed,MVPs,top20s,top10s,topPlacement\n'

try:
  for player_name in name_to_id:
    player_id = int(name_to_id[player_name])
    print(time.strftime("%H:%M:%S", time.localtime()) + ' - reading data for ' + player_name + '...')
    stats_page = get_parsed_page('https://www.hltv.org/stats/players/' + str(player_id) + '/' + player_name)

    # TODO: download picture of player

    player_data[player_id]['full_name'] = stats_page.find('div', class_='summaryRealname').text.strip()
    player_data[player_id]['age'] = int(stats_page.find('div', class_='summaryPlayerAge').text.split(' ')[0])

    stats_divs = stats_page.find_all('div', class_='stats-row')

    rating_box = stats_divs[13]
    if '2.0' in rating_box.text:
      player_data[player_id]['rating2'] = float(rating_box.findAll('span')[1].text)
    else:
      player_data[player_id]['rating2'] = 'N/A'

    maps_box = stats_divs[6]
    player_data[player_id]['maps'] = int(maps_box.findAll('span')[1].text)

    rounds_box = stats_divs[7]
    player_data[player_id]['rounds'] = int(rounds_box.findAll('span')[1].text)

    kills_box = stats_divs[0]
    player_data[player_id]['kills'] = int(kills_box.findAll('span')[1].text)

    deaths_box = stats_divs[2]
    player_data[player_id]['deaths'] = int(deaths_box.findAll('span')[1].text)

    kd_ratio_box = stats_divs[3]
    player_data[player_id]['KD_ratio'] = float(kd_ratio_box.findAll('span')[1].text)

    hs_ratio_box = stats_divs[1]
    player_data[player_id]['HS_ratio'] = float(hs_ratio_box.findAll('span')[1].text[:-1])

    adr_box = stats_divs[4]
    player_data[player_id]['adr'] = float(adr_box.findAll('span')[1].text)

    rating_boxes = stats_page.find_all('div', class_='rating-breakdown')
    player_data[player_id]['rating_top20'] = float(rating_boxes[2].find('div').text)

    career_page = get_parsed_page('https://www.hltv.org/stats/players/career/' + str(name_to_id[player_name]) + '/' + player_name)

    rating_year = career_page.find('table', class_='stats-table').find('tbody').find_all('tr')
    for i in range(len(rating_year)-1):
      year = int(rating_year[i].find_all('td')[0].text)
      rating = float(rating_year[i].find_all('td')[1].find('span').text)
      player_data[player_id]['rating_year'][year] = rating

    clutches_won = 0
    for i in range(5):
      clutch_page = get_parsed_page('https://www.hltv.org/stats/players/clutches/' + str(name_to_id[player_name]) + '/1on' + str(i+1) + '/' + player_name)
      clutches = int(clutch_page.find('div', class_='summary-box').find('div', class_='value').text)
      clutches_won += clutches
    player_data[player_id]['clutches_total'] = clutches_won

    profile_page = get_parsed_page('https://www.hltv.org/player/' + str(name_to_id[player_name]) + '/' + player_name)

    teams_table = profile_page.find('table', class_='team-breakdown').find('tbody').find_all('tr', class_='team')

    for team in teams_table:
      # TODO: download team logos
      team_name = team.find('td', class_='team-name-cell').text.strip()
      player_data[player_id]['teams'].add(team_name)

    if profile_page.find('div', id='majorAchievement') is not None:
      major_achievements = profile_page.find('div', id='majorAchievement').find_all('div', class_='highlighted-stat')
      player_data[player_id]['majors_won'] = int(major_achievements[0].find('div', class_='stat').text)
      player_data[player_id]['majors_played'] = int(major_achievements[1].find('div', class_='stat').text)
    else:
      player_data[player_id]['majors_won'] = 0
      player_data[player_id]['majors_played'] = 0

    if profile_page.find('div', id='lanAchievement') is not None:
      lan_achievements = profile_page.find('div', id='lanAchievement').find_all('div', class_='highlighted-stat')
      player_data[player_id]['LANs_won'] = int(lan_achievements[0].find('div', class_='stat').text)
      player_data[player_id]['LANs_played'] = int(lan_achievements[1].find('div', class_='stat').text)
    else:
      player_data[player_id]['LANs_won'] = 0
      player_data[player_id]['LANs_played'] = 0

    if profile_page.find('div', class_='mvp-section') is not None:
      mvps = profile_page.find('div', class_='mvp-section').find_all('tr', class_='trophy-row')
      player_data[player_id]['MVPs'] = len(mvps)
    else:
      player_data[player_id]['MVPs'] = 0

    if profile_page.find('div', class_='top20-section') is not None:
      top20s = profile_page.find('div', class_='top20-section').find_all('tr', class_='trophy-row')
      player_data[player_id]['top20s'] = len(top20s)

      top10s = 0
      min_placement = 20
      for top20 in top20s:
        placement = int(top20.find('div', class_='trophy-event').text.split(' ')[0][1:])
        if placement <= 10:
          top10s += 1
        min_placement = min(min_placement, placement)

      player_data[player_id]['top10s'] = top10s
      if len(top20s) > 0:
        player_data[player_id]['top_placement'] = min_placement
      else:
        player_data[player_id]['top_placement'] = 'N/A'
    else:
      player_data[player_id]['top20s'] = 0
      player_data[player_id]['top10s'] = 0
      player_data[player_id]['top_placement'] = 'N/A'

    add_string = ''
    for key in player_data[player_id]:
      if key == 'teams':
        add_string += '"' + str(list(player_data[player_id][key])).replace('"', '""') + '",'
      elif key == 'rating_year':
        add_string += '"' + str(player_data[player_id][key]).replace('"', '""') + '",'
      else:
        add_string += str(player_data[player_id][key]) + ','
    data_to_write += add_string + '\n'

  f = open('playerDataPy.csv', 'w')
  f.write(data_to_write)
  f.close()

except Exception as e:
  print('error while reading data: ' + traceback.format_exc())

  f = open('playerDataPy.csv', 'w')
  f.write(data_to_write)
  f.close()
