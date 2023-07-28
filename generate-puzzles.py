import csv
import random

player_data = {}
date_updated = None

team_players = {}
partner_teams = {}
teams = []
preferable_teams = []

PUZZLES_GRID = [(0, 3), (1, 3), (2, 3), (0, 4), (1, 4), (2, 4), (0, 5), (1, 5), (2, 5)]
STATS = [
  ('country', None),
  ('age', [20, 25, 30]),
  ('rating2', [1.1, 1.2]),
  ('rating1', [1.1, 1.2]),
  ('maps', [1000, 2000, 3000]),
  ('rounds', [20000, 30000, 40000]),
  ('kills', [10000, 20000, 30000]),
  ('deaths', [10000, 20000, 30000]),
  ('ratingTop20', [1.1, 1.2]),
  ('ratingYear', [[2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022], [1.1, 1.2]]),
  ('clutchesTotal', [250, 500, 600]),
  ('majorsWon', [1, 2]),
  ('majorsPlayed', [1, 4, 8]),
  ('LANsWon', [1, 5, 10]),
  ('MVPs', [1, 3, 5, 10]),
  ('top20s', [1, 3, 5, 10]),
  ('top10s', [1, 3, 5]),
  ('topPlacement', [1, 5, 10, 20])
]

def read_data():
  with open("playerData.csv", 'r', encoding="utf8") as file:
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
        partner_teams[team] = set()
        teams.append(team)
      team_players[team].add(player_id)

  # find the tuple of teams that work
  for i in range(len(teams)):
    for j in range(i+1, len(teams)):
      if len(team_players[teams[i]].intersection(team_players[teams[j]])) > 0:
        partner_teams[teams[i]].add(teams[j])
        partner_teams[teams[j]].add(teams[i])

def generate_player_set(clue1, clue2):
  clue1_possible = set()
  clue2_possible = set()

  if clue1[0] == 'team':
    for player in team_players[clue1[1]]:
      clue1_possible.add(player)
  else:
    # TODO: skip for now
    pass

  if clue2[0] == 'team':
    for player in team_players[clue2[1]]:
      clue2_possible.add(player)
  else:
    # TODO: skip for now
    pass

  return clue1_possible.intersection(clue2_possible)

def solve_puzzle(puzzle, curr_board, curr_spot, player_set):
  if curr_spot >= 9:
    return curr_board

  clue_pos = PUZZLES_GRID[curr_spot]
  clue1 = puzzle[clue_pos[0]]
  clue2 = puzzle[clue_pos[1]]

  possible_players = generate_player_set(clue1, clue2)

  for player in possible_players:
    if player in player_set:
      continue
    player_set_dup = player_set.copy()
    curr_board_dup = curr_board.copy()
    player_set_dup.add(player)
    curr_board_dup[curr_spot] = player_data[player]['name']

    ans = solve_puzzle(puzzle, curr_board_dup, curr_spot+1, player_set_dup)
    if ans is not None:
      return ans

  return None

def generate_puzzle():
  while True:
    puzzle = [None, None, None, None, None, None]
    board = [None, None, None, None, None, None, None, None, None]
    clues = set()

    init_team = random.choice(teams)
    if len(partner_teams[init_team]) < 3:
      continue
    puzzle[3] = ('team', init_team)
    clues.add(init_team)

    top_row = random.sample(list(partner_teams[init_team]), 3)
    intersect = partner_teams[top_row[0]].intersection(partner_teams[top_row[1]]).intersection(partner_teams[top_row[2]])
    intersect.remove(init_team)

    if len(intersect) < 2:
      continue

    left_col = random.sample(list(intersect), 2)

    puzzle[0] = ('team', top_row[0])
    puzzle[1] = ('team', top_row[1])
    puzzle[2] = ('team', top_row[2])

    puzzle[4] = ('team', left_col[0])
    puzzle[5] = ('team', left_col[1])

    print('attempting to solve', puzzle)
    ans = solve_puzzle(puzzle, board, 0, set())
    if ans is not None:
      return puzzle, ans

read_data()
preprocess_data()

print(generate_puzzle())
