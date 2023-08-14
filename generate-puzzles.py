import csv
import random
from prettytable import PrettyTable, ALL

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
STATS = [
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
  with open("playerData.csv", 'r', encoding="utf8") as file:
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

top_teams = ['8008/Grayhound', '10503/OG', '7059/X', '11585/IHC', '7461/Copenhagen Flames', '6548/?', '7613/Red Reserve', '6902/GODSENT', '6651/Gambit', '10150/CR4ZY', '5310/HellRaisers', '8362/MAD Lions', '4991/fnatic', '4869/ENCE', '10948/Extra Salt', '5752/Cloud9', '9928/GamerLegion', '5996/TSM', '10577/SINNERS', '11616/Players', '10276/Finest', '10399/Evil Geniuses', '6375/Vexed', '7801/Ghost', '7175/Heroic', '4602/Tricked', '5973/Liquid', '7718/Movistar Riders', '5995/G2', '4773/paiN', '11595/Outsiders', '8513/Windigo', '11309/00NATION', '10831/Entropiq', '6134/Kinguin', '6137/SK', '4623/fnatic', '4863/TYLOO', '5988/FlipSid3', '6667/FaZe', '11066/Fiend', '8135/FORZE', '11811/Monte', '4674/LDLC', '6978/Singularity', '7244/K23', '9455/Imperial', '10606/c0ntact', '9215/MIBR', '6637/ex-Titan', '10514/Gen.G', '6680/Echo Fox', '8637/Sprout', '8068/AGO', '4791/Immunity', '5974/CLG', '7533/North', '9996/9z', '6372/CSGL', '7020/Spirit', '7557/Misfits', '11148/Akuma', '7367/Quantum Bellator Fire', '7701/Imperial', '5005/Complexity', '9085/Chaos', '6615/OpTic', '6211/Renegades', '11251/Eternal Fire', '9183/Winstrike', '11501/HEET', '5929/Space Soldiers', '6673/NRG', '8481/Valiance', '10671/FunPlus Phoenix', '4555/Virtus.pro', '6094/Vega Squadron', '5422/Dignitas', '5284/Titan', '8305/DreamEaters', '10386/SKADE', '4608/Natus Vincere', '5991/Envy', '11419/ECSTATIC', '8474/100 Thieves', '6290/Luminosity', '9565/Vitality', '5395/PENTA', '9806/Apeks', '6959/MK', '6226/E-frag.net', '9943/ATK', '6118/Tempo Storm', '4688/Epsilon', '7532/BIG', '11164/Into the Breach', '6773/VG.CyberZen', '10278/9INE', '4411/Ninjas in Pyjamas', '7865/HAVU', '6665/Astralis', '8297/FURIA', '11518/Bad News Eagles', '4494/MOUZ', '7010/Immortals', '6292/Conquest', '5378/Virtus.pro', '8120/AVANGAR']

def preprocess_data():
  for player_id in player_data:
    for team in player_data[player_id]['teams']:
      team_name = team.split('/')[1]
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
      team1 = top_teams[i].split('/')[1]
      team2 = top_teams[j].split('/')[1]
      if len(team_players[team1].intersection(team_players[team2])) >= MIN_GRID: # guarantees multiple players in grid
        partner_teams[team1].add(team2)
        partner_teams[team2].add(team1)

  # # any team
  # for i in range(len(teams)):
  #   for j in range(i+1, len(teams)):
  #     if len(team_players[teams[i]].intersection(team_players[teams[j]])) > 0:
  #       partner_teams[teams[i]].add(teams[j])
  #       partner_teams[teams[j]].add(teams[i])

def convert_clue(clue):
  if clue[0] == 'team':
    return ['team', random.choice(name_to_id[clue[1]])]
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

def generate_puzzle():
  while True:
    puzzle = [None, None, None, None, None, None]
    board = [None, None, None, None, None, None, None, None, None]

    init_team = random.choice(top_teams).split('/')[1]
    # init_team = random.choice(teams) # any team
    top_row_teams_count = None
    if len(partner_teams[init_team]) < 2:
      continue
    elif len(partner_teams[init_team]) == 2:
      top_row_teams_count = 2
    else:
      top_row_teams_count = 2 if random.random() < 0.75 else 3

    puzzle[3] = ('team', init_team)

    top_row = random.sample(list(partner_teams[init_team]), top_row_teams_count)
    if top_row_teams_count == 2:
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
    puzzle[1] = ('team', top_row[1])
    puzzle[4] = ('team', left_col[0])

    if top_row_teams_count == 2:
      random_stat = random.choice(STATS)
      if random_stat[0] == 'country':
        puzzle[2] = ('country', random.choice(list(country_set)))
      elif random_stat[0] == 'ratingYear':
        puzzle[2] = ('ratingYear', [random.choice(random_stat[1][0]), random.choice(random_stat[1][1])])
      else:
        puzzle[2] = (random_stat[0], random.choice(random_stat[1]))
    else:
      puzzle[2] = ('team', top_row[2])

    if left_col_teams_count == 1:
      random_stat = random.choice(STATS)
      if random_stat[0] == 'country':
        puzzle[5] = ('country', random.choice(list(country_set)))
      elif random_stat[0] == 'ratingYear':
        puzzle[5] = ('ratingYear', [random.choice(random_stat[1][0]), random.choice(random_stat[1][1])])
      else:
        puzzle[5] = (random_stat[0], random.choice(random_stat[1]))
    else:
      puzzle[5] = ('team', left_col[1])

    # kind of a naive check for dupes xd
    clues = set()
    dupe_check = False
    for i in range(6):
      if puzzle[i][0] == 'team':
        team_name = puzzle[i][1]
        if team_name in clues:
          dupe_check = True
        clues.add(team_name)
      else:
        if puzzle[i][0] in clues:
          dupe_check = True
        clues.add(puzzle[i][0])

    if dupe_check:
      continue

    # code generates all possible player set
    # print('attempting to solve', puzzle)

    all_poss_players = []
    for pos in range(9):
      clue_pos = PUZZLES_GRID[pos]
      clue1 = puzzle[clue_pos[0]]
      clue2 = puzzle[clue_pos[1]]

      all_poss_players.append(generate_player_set(clue1, clue2))

    ans = solve_puzzle(puzzle, board, 0, set(), all_poss_players)
    if ans is not None:
      puzzle_list = [convert_clue(elm) for elm in puzzle]
      # for elm in puzzle_list:
      #   if elm[0] == 'team':
      #     elm[1] = elm[1][elm[1].index('/')+1:]
      return puzzle_list, ans

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
