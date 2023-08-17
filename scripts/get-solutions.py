import importlib
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from prettytable import PrettyTable, ALL
import argparse
from datetime import datetime
import time
import csv

parser = argparse.ArgumentParser()
parser.add_argument('-d', '--date', type=int, help='puzzle date # to use')
# parser.add_argument('-i', '--index', type=int, help='puzzle index # in database')
parser.add_argument('-f', '--fromDay', type=int, help="use the puzzle N days from now (negative to go backwards)")
# parser.add_argument('--table', action='store_true', help='print the puzzle in the form of a table')
args = parser.parse_args()

load_dotenv()

client = MongoClient(os.getenv("MONGO_DB_URL"))
db = client["csgodoku"]["game"]

page = db.find_one({ "_id": "puzzleList" })
db_puzzles = page['puzzles']

# time stuff
TIME_OFFSET = 1690855200
diff = int(time.time()) - TIME_OFFSET
DAY_COUNTER = diff // 86400

puzzle_index = None
if args.date is not None:
  puzzle_index = args.date
elif args.fromDay is not None:
  puzzle_index = DAY_COUNTER + args.fromDay
else:
  puzzle_index = DAY_COUNTER
puzzle_datetime = datetime.fromtimestamp(TIME_OFFSET + puzzle_index * 86400 + 7200)
puzzle_date = puzzle_datetime.strftime('%Y-%m-%d')

if puzzle_index < 0 or puzzle_index >= len(db_puzzles):
  print('ERROR: puzzle index out of range')
  exit()

player_data = {}
date_updated = None
team_players = {}
partner_teams = {}
teams = []

PUZZLES_GRID = [(0, 3), (1, 3), (2, 3), (0, 4), (1, 4), (2, 4), (0, 5), (1, 5), (2, 5)]

def read_data():
  with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'playerData.csv'), 'r', encoding="utf8") as file:
    csvreader = csv.reader(file)
    top_row = next(csvreader)
    parse_type = ['', 'int', '', '', 'int', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']

    date_updated = top_row[0]

    for row in csvreader:
      player_id = int(row[1])
      player_data[player_id] = { 'name': row[0] }

      for i in range(1, len(row)):
        if row[i] == 'undefined' or row[i] == 'N/A':
          player_data[player_id][top_row[i]] = None
        elif parse_type[i] == 'int':
          player_data[player_id][top_row[i]] = int(row[i])
        elif parse_type[i] == 'float':
          player_data[player_id][top_row[i]] = float(row[i])
        elif parse_type[i] == 'set':
          team_list = eval(row[i])
          player_data[player_id][top_row[i]] = set(team_list)
        elif parse_type[i] == 'dictionary':
          rating_dictionary = eval(row[i])
          player_data[player_id][top_row[i]] = {}
          for key in rating_dictionary:
            player_data[player_id][top_row[i]][int(key)] = float(rating_dictionary[key])
        else:
          player_data[player_id][top_row[i]] = row[i]

def preprocess_data():
  for player_id in player_data:
    for team in player_data[player_id]['teams']:
      team_name = team.split('/')[1]
      if team_name not in team_players:
        team_players[team_name] = set()
        partner_teams[team_name] = set()
        teams.append(team_name)
      team_players[team_name].add(player_id)

      # if team_name not in name_to_id:
      #   name_to_id[team_name] = []
      # name_to_id[team_name].append(team)

def generate_player_set(clue1, clue2):
  clue1_possible = set()
  clue2_possible = set()

  if clue1[0] == 'team':
    for player in team_players[clue1[1]]:
      clue1_possible.add(player)
  elif clue1[0] == 'country':
    for player in player_data:
      if player_data[player]['country'] == clue1[1]:
        clue1_possible.add(player)
  elif clue1[0] == 'ratingYear':
    year = clue1[1][0]
    rating = clue1[1][1]
    for player in player_data:
      if year in player_data[player]['ratingYear'] and player_data[player]['ratingYear'][year] >= rating:
        clue1_possible.add(player)
  elif clue1[0] == 'topPlacement':
    for player in player_data:
      if player_data[player]['topPlacement'] is not None and player_data[player]['topPlacement'] <= clue1[1]:
        clue1_possible.add(player)
  else:
    for player in player_data:
      if player_data[player][clue1[0]] is not None and player_data[player][clue1[0]] >= clue1[1]:
        clue1_possible.add(player)

  if clue2[0] == 'team':
    for player in team_players[clue2[1]]:
      clue2_possible.add(player)
  elif clue2[0] == 'country':
    for player in player_data:
      if player_data[player]['country'] == clue2[1]:
        clue2_possible.add(player)
  elif clue2[0] == 'ratingYear':
    year = clue2[1][0]
    rating = clue2[1][1]
    for player in player_data:
      if year in player_data[player]['ratingYear'] and player_data[player]['ratingYear'][year] >= rating:
        clue2_possible.add(player)
  elif clue2[0] == 'topPlacement':
    for player in player_data:
      if player_data[player]['topPlacement'] is not None and player_data[player]['topPlacement'] <= clue2[1]:
        clue2_possible.add(player)
  else:
    for player in player_data:
      if player_data[player][clue2[0]] is not None and player_data[player][clue2[0]] >= clue2[1]:
        clue2_possible.add(player)

  return clue1_possible.intersection(clue2_possible)

def all_possible_players(puzzle):
  all_poss_players = []
  for pos in range(9):
    clue_pos = PUZZLES_GRID[pos]
    clue1 = puzzle[clue_pos[0]]
    clue2 = puzzle[clue_pos[1]]

    all_poss_players.append(generate_player_set(clue1, clue2))

  return all_poss_players

def convert_clue(clue):
  if clue[0] == 'team':
    return [clue[0], clue[1].split('/')[1]]
  return clue

def convert_possible_player_set(poss_players):
  poss_player_names = []
  for player in poss_players:
    poss_player_names.append(player_data[player]['name'])
  poss_string = ''
  for name in poss_player_names:
    poss_string += '\n' + name
  return poss_string

read_data()
preprocess_data()

puzzle = db_puzzles[puzzle_index]
puzzle = [convert_clue(clue) for clue in puzzle]
poss_players = all_possible_players(puzzle)
poss_players = [convert_possible_player_set(poss_player) for poss_player in poss_players]

print('puzzle ' + str(puzzle_index) + ' (' + puzzle_date + ')')
table = PrettyTable()
table.header = False
table.hrules = ALL

table.add_row([''] + puzzle[:3])
table.add_row([puzzle[3]] + poss_players[:3])
table.add_row([puzzle[4]] + poss_players[3:6])
table.add_row([puzzle[5]] + poss_players[6:9])

print(table)
