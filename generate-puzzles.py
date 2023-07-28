import csv

player_data = {}
date_updated = None

team_players = {}

grid = [[((0, 3), (1, 3), (2, 3))], [(0, 4), (1, 4), (2, 4)], [(0, 5), (1, 5), (2, 5)]]
STATS = [('country', None), ('age', [20, 25, 30]), ('rating2', [1.1, 1.2]), ('rating1', [1.1, 1.2]), ('maps', [1000, 2000, 3000]), ('rounds', [20000, 30000, 40000]), ('kills', [10000, 20000, 30000]), ('deaths', [10000, 20000, 30000]), ('ratingTop20')]

def read_data():
  with open("playerData.csv", 'r') as file:
    csvreader = csv.reader(file)
    top_row = next(csvreader)
    parse_type = ['', 'int', '', '', 'int', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']

    date_updated = top_row[0]

    for row in csvreader:
      player_id = int(row[1])
      player_data[player_id] = { 'name': row[0] }

      for i in range(1, len(row)-1):
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
      if team not in team_players:
        team_players[team] = set()
      team_players[team].add(player_id)

def generate_puzzle():
  pass

read_data()
