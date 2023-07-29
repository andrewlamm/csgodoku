# script is used to filter out the teams that have been top 30 (for generating puzzles)
# prints out all teams that have been at least top 30 in some point in time

from bs4 import BeautifulSoup
import csv
import time
import requests

def get_parsed_page(url):
	headers = {
		"referer": "https://www.hltv.org/stats",
		"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
	}

	time.sleep(1)

	res = requests.get(url, headers=headers)

	return BeautifulSoup(res.text, 'html.parser')

all_teams = set()
top30_teams = set()

def read_data():
  with open("playerData.csv", 'r', encoding="utf8") as file:
    csvreader = csv.reader(file)
    top_row = next(csvreader)

    for row in csvreader:
      team_list = set(eval(row[18]))
      for team in team_list:
        all_teams.add(team)

read_data()

for team in all_teams:
  print('loading team ' + team)
  if team == '6548/?':
    team = '6548/-'
  team_page = get_parsed_page('https://www.hltv.org/team/' + team)
  if len(team_page.find('div', {'class': 'team-chart-container'}).find_all('span', {'class': 'value'})) > 1:
    rank = int(team_page.find('div', {'class': 'team-chart-container'}).find_all('span', {'class': 'value'})[1].text[1:])

    if rank < 30:
      top30_teams.add(team)

  if team == '6548/-':
    team = '6548/?'

print(list(top30_teams))
