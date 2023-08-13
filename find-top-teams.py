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

prev_top_teams_list = []
prev_top_teams = set(prev_top_teams_list)

all_teams = set()
top_teams = set()

THRESHOLD = 20

def read_data():
  with open("playerData.csv", 'r', encoding="utf8") as file:
    csvreader = csv.reader(file)
    top_row = next(csvreader)

    for row in csvreader:
      team_list = set(eval(row[18]))
      for team in team_list:
        all_teams.add(team)

read_data()

team_count = 0
for team in all_teams:
  print('loading team ' + team + ' (team ' + str(team_count+1) + ' of ' + str(len(all_teams)) + ')')
  team_count += 1

  # uncomment code if want to cache teams for faster code
  # if team in prev_top_teams:
  #   top_teams.add(team)
  #   continue

  team_id = team.split('/')[0]

  team_page = get_parsed_page('https://www.hltv.org/team/' + team_id + '/a')

  if team_page.find('div', {'class': 'team-chart-container'}) is None:
    # whoops broken link, shouldnt happen ??
    print('skipping team')
    continue

  if len(team_page.find('div', {'class': 'team-chart-container'}).find_all('span', {'class': 'value'})) > 1:
    rank = int(team_page.find('div', {'class': 'team-chart-container'}).find_all('span', {'class': 'value'})[1].text[1:])

    if rank < THRESHOLD:
      top_teams.add(team)

print(list(top_teams))
