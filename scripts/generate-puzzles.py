import csv
import random
from prettytable import PrettyTable, ALL
import os
import ast

player_data = {}
date_updated = None

team_players = {}
partner_teams = {}
name_to_id = {}
teams = []
preferable_teams = []
country_set = set()

MIN_GRID = 5 # min player in grid

PUZZLES_GRID = [(0, 3), (1, 3), (2, 3), (0, 4), (1, 4), (2, 4), (0, 5), (1, 5), (2, 5)]
PUZZLE_TO_GRID = [[0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 1, 2], [3, 4, 5], [6, 7, 8]]
STATS = [
  ('country', country_set), # skew the dataset lmao
  ('country', country_set),
  ('country', country_set),
  ('country', country_set),
  ('country', country_set),
  ('country', country_set),
  ('age', [30, 35, 40]),
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

# read top teams from file
top_teams = []
with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'top-teams.txt'), 'r', encoding="utf8") as file:
  file_string = file.read()
  top_teams = ast.literal_eval(file_string)

def get_team_name(team):
  return team[team.index('/')+1:]

def preprocess_data():
  for player_id in player_data:
    for team in player_data[player_id]['teams']:
      team_name = get_team_name(team)
      if team_name not in team_players:
        team_players[team_name] = set()
        partner_teams[team_name] = set()
        teams.append(team_name)
      team_players[team_name].add(player_id)

      if team_name not in name_to_id:
        name_to_id[team_name] = []
      name_to_id[team_name].append(team)

    country_set.add(player_data[player_id]['country'])

  # find partner teams
  for i in range(len(top_teams)):
    for j in range(i+1, len(top_teams)):
      # if len(team_players[top_teams[i]].intersection(team_players[top_teams[j]])) > 0:
      team1 = get_team_name(top_teams[i])
      team2 = get_team_name(top_teams[j])
      if len(team_players[team1].intersection(team_players[team2])) >= MIN_GRID: # guarantees multiple players in grid
        partner_teams[team1].add(team2)
        partner_teams[team2].add(team1)

  # # any team
  # for i in range(len(teams)):
  #   for j in range(i+1, len(teams)):
  #     if len(team_players[teams[i]].intersection(team_players[teams[j]])) > 0:
  #       partner_teams[teams[i]].add(teams[j])
  #       partner_teams[teams[j]].add(teams[i])

def convert_clue(clue, puzzleIdx, poss_players):
  if clue[0] == 'team':
    team_count = {}
    for team in name_to_id[clue[1]]:
      team_count[team] = 0
      for ind in PUZZLE_TO_GRID[puzzleIdx]:
        for player in poss_players[ind]:
          if team in player_data[player]['teams']:
            team_count[team] += 1
    return ['team', max(team_count, key=lambda key: team_count[key])]
  return list(clue)

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

def solve_puzzle(puzzle, curr_board, curr_spot, player_set, all_possible_players):
  if curr_spot >= 9:
    return curr_board

  possible_players = all_possible_players[curr_spot]
  if len(possible_players) < MIN_GRID: # guarantees multiple players in grid
    return None

  for player in possible_players:
    if player in player_set:
      continue
    player_set_dup = player_set.copy()
    curr_board_dup = curr_board.copy()
    player_set_dup.add(player)
    curr_board_dup[curr_spot] = player_data[player]['name']

    ans = solve_puzzle(puzzle, curr_board_dup, curr_spot+1, player_set_dup, all_possible_players)
    if ans is not None:
      return ans

  return None

def gen_random_stat():
  random_stat = random.choice(STATS)
  if random_stat[0] == 'country':
    return ('country', random.choice(list(country_set)))
  elif random_stat[0] == 'ratingYear':
    return ('ratingYear', [random.choice(random_stat[1][0]), random.choice(random_stat[1][1])])
  else:
    return (random_stat[0], random.choice(random_stat[1]))

def puzzle_has_duplicate_clues(puzzle):
  # kind of a naive check for dupes xd
  clues = set()
  dupe_check = False
  for i in range(6):
    if puzzle[i] is None:
      continue

    if puzzle[i][0] == 'team':
      team_name = puzzle[i][1]
      if team_name in clues:
        dupe_check = True
      clues.add(team_name)
    else:
      if puzzle[i][0] in clues:
        dupe_check = True
      clues.add(puzzle[i][0])

  return dupe_check

def generate_puzzle():
  while True:
    puzzle = [None, None, None, None, None, None]
    board = [None, None, None, None, None, None, None, None, None]

    init_team = get_team_name(random.choice(top_teams))
    # init_team = random.choice(teams) # any team
    top_row_teams_count = None
    if len(partner_teams[init_team]) < 1:
      continue
    elif len(partner_teams[init_team]) == 1:
      top_row_teams_count = 1
    elif len(partner_teams[init_team]) == 2:
      top_row_teams_count = 2
    else:
      top_row_teams_count = 3 if random.random() < 0.25 else 2 if random.random() < 0.7 else 1

    puzzle[3] = ('team', init_team)

    top_row = random.sample(list(partner_teams[init_team]), top_row_teams_count)
    if top_row_teams_count == 1:
      intersect = partner_teams[top_row[0]]
    elif top_row_teams_count == 2:
      intersect = partner_teams[top_row[0]].intersection(partner_teams[top_row[1]])
    else:
      intersect = partner_teams[top_row[0]].intersection(partner_teams[top_row[1]]).intersection(partner_teams[top_row[2]])

    intersect.remove(init_team)

    left_col_teams_count = None
    # if len(intersect) < 1:
    #   continue
    # elif len(intersect) == 1:
    #   continue
    # else:
    #   left_col_teams_count = 2
    if len(intersect) < 1:
      continue
    elif len(intersect) == 1:
      left_col_teams_count = 1
    else:
      left_col_teams_count = 1 if random.random() < 0.5 else 2

    left_col = random.sample(list(intersect), left_col_teams_count)

    puzzle[0] = ('team', top_row[0])
    puzzle[4] = ('team', left_col[0])

    if top_row_teams_count != 1:
      puzzle[1] = ('team', top_row[1])
    if top_row_teams_count == 3:
      puzzle[2] = ('team', top_row[2])
    if left_col_teams_count != 1:
      puzzle[5] = ('team', left_col[1])

    if puzzle_has_duplicate_clues(puzzle):
      continue

    # We have a valid set of teams, now fill in the rest of the stats, retry this 100 times if we make an invalid set
    stat_tries = 0

    while stat_tries < 100:
      if top_row_teams_count == 1:
        puzzle[1] = gen_random_stat()
      if top_row_teams_count <= 2:
        puzzle[2] = gen_random_stat()
      if left_col_teams_count == 1:
        puzzle[5] = gen_random_stat()

      if puzzle_has_duplicate_clues(puzzle):
        stat_tries += 1
        continue

      # code generates all possible player set
      print('attempting to solve', puzzle)

      all_poss_players = []
      for pos in range(9):
        clue_pos = PUZZLES_GRID[pos]
        clue1 = puzzle[clue_pos[0]]
        clue2 = puzzle[clue_pos[1]]

        all_poss_players.append(generate_player_set(clue1, clue2))

      ans = solve_puzzle(puzzle, board, 0, set(), all_poss_players)
      if ans is not None:
        puzzle_list = [convert_clue(elm, ind, all_poss_players) for ind, elm in enumerate(puzzle)]
        # for elm in puzzle_list:
        #   if elm[0] == 'team':
        #     elm[1] = elm[1][elm[1].index('/')+1:]
        return puzzle_list, ans
      stat_tries += 1

def generate_puzzles(print_table=True, num_puzzles=10):
  puzzles = []
  for i in range(num_puzzles):
    print('generating puzzle', i+1)
    puzzle, ans = generate_puzzle()
    puzzles.append(puzzle)

    table = PrettyTable()
    table.header = False
    table.hrules=ALL
    table.add_row([''] + puzzle[:3])
    table.add_row([puzzle[3]] + ans[:3])
    table.add_row([puzzle[4]] + ans[3:6])
    table.add_row([puzzle[5]] + ans[6:9])
    if print_table:
      print(table)

  return puzzles

read_data()
preprocess_data()

# puzzles = generate_puzzles(True, 1)
# print(puzzles[0])
# print(teams)
