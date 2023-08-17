# script is used to filter out the teams that have been top 30 (for generating puzzles)
# prints out all teams that have been at least top 30 in some point in time

from bs4 import BeautifulSoup
import csv
import time
import requests
import os
import ast
import json

def get_parsed_page(url):
	headers = {
		"referer": "https://www.hltv.org/stats",
		"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
	}

	time.sleep(1)

	res = requests.get(url, headers=headers)

	return BeautifulSoup(res.text, 'html.parser')

prev_top_teams_list = []
prev_all_teams_list = []

top_teams_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'top-teams.txt')
all_teams_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'all-teams.txt')
if os.path.exists(top_teams_path):
  # previous data exists, load it
  with open(top_teams_path, 'r', encoding="utf8") as file:
    file_string = file.read()
    prev_top_teams_list = ast.literal_eval(file_string)
  with open(all_teams_path, 'r', encoding="utf8") as file:
    file_string = file.read()
    prev_all_teams_list = ast.literal_eval(file_string)

prev_all_teams = set(prev_all_teams_list)
prev_top_teams = set(prev_top_teams_list)

all_teams = set()
top_teams = set(prev_top_teams_list)

THRESHOLD = 20

def read_data():
  with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'playerData.csv'), 'r', encoding="utf8") as file:
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

  if team in prev_all_teams:
    # team has already been processed, skip
    print('already processed team, skip')
    continue

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

f = open(top_teams_path, 'w', encoding="utf8")
f.write(json.dumps(list(top_teams)))
f.close()

f = open(all_teams_path, 'w', encoding="utf8")
f.write(json.dumps(list(all_teams)))
f.close()
