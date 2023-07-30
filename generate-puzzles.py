import csv
import random
from prettytable import PrettyTable, ALL

player_data = {}
date_updated = None

team_players = {}
partner_teams = {}
teams = []
preferable_teams = []
country_set = set()

PUZZLES_GRID = [(0, 3), (1, 3), (2, 3), (0, 4), (1, 4), (2, 4), (0, 5), (1, 5), (2, 5)]
STATS = [
  ('country', country_set),
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

top_30_teams = ['11595/Outsiders', '7718/Movistar Riders', '6472/Rebels', '4548/CPH Wolves', '4602/Tricked', '6372/CSGL', '11837/Fluxo', '8481/Valiance', '4991/fnatic', '6548/?', '6133/Orbit', '10948/Extra Salt', '11251/Eternal Fire', '4688/Epsilon', '11283/Falcons', '6010/Chiefs', '6669/Binary Dragons', '8135/FORZE', '7801/Ghost', '4468/x6tence', '5310/HellRaisers', '9211/LeftOut', '8120/AVANGAR', '10606/c0ntact', '5378/Virtus.pro', '9888/New England Whalers', '11148/Akuma', '11419/ECSTATIC', '9572/ex-Space Soldiers', '7020/Spirit', '8008/Grayhound', '10621/1WIN', '7354/MVP PK', '11811/Monte', '7169/fnatic Academy', '6686/AGG', '10020/Aristocracy', '4559/Millenium', '4869/ENCE', '10150/CR4ZY', '5596/Platinium', '6773/VG.CyberZen', '11861/Aurora', '4477/Publiclir.se', '4791/Immunity', '6132/Method', '5974/CLG', '5435/gBots', '7613/Red Reserve', '11616/Players', '7157/Rogue', '6405/Orgless', '5991/Envy', '10276/Finest', '6220/Epiphany Bolt', '10304/Triumph', '9183/Winstrike', '10671/FunPlus Phoenix', '10831/Entropiq', '8113/Sharks', '6619/INTZ', '4501/ALTERNATE aTTaX', '4674/LDLC', '7726/Swole Patrol', '6375/Vexed', '4682/RCTIC', '8068/AGO', '6137/SK', '7106/eUnited', '4608/Natus Vincere', '5158/Bravado', '4494/MOUZ', '6641/Obey.Alliance', '11085/ex-Winstrike', '6978/Singularity', '4413/Lemondogs', '6134/Kinguin', '7532/BIG', '7168/Crowns', '6855/Fragsters', '10164/Riot Squad', '5906/Torqued', '10399/Evil Geniuses', '6301/Splyce', '11501/HEET', '6736/Selfless', '11164/Into the Breach', '9481/x6tence Galaxy', '9806/Apeks', '7865/HAVU', '10278/9INE', '7367/Quantum Bellator Fire', '9928/GamerLegion', '6673/NRG', '11514/Rare Atom', '10386/SKADE', '10697/BLINK', '7244/K23', '8669/Espada', '10851/Wings Up', '9862/devils.one', '8772/Syman', '10096/EXTREMUM', '10567/SAW', '7557/Misfits', '7059/X', '10514/Gen.G', '6503/CyberZen', '9085/Chaos', '5454/SKDC', '11003/DBL PONEY', '5599/Dobry&amp;Gaming', '6724/Preparation', '6407/DenDD', '4411/Ninjas in Pyjamas', '11309/00NATION', '4555/Virtus.pro', '5973/Liquid', '4773/paiN', '6469/eXplosive', '11119/EPG Family', '6386/Winterfox', '8474/100 Thieves', '6597/Quest', '6211/Renegades', '6665/Astralis', '7124/passions', '8297/FURIA', '6947/TeamOne', '6094/Vega Squadron', '6248/TheMongolz', '7461/Copenhagen Flames', '5929/Space Soldiers', '9996/9z', '6651/Gambit', '5988/FlipSid3', '6667/FaZe', '7533/North', '6226/E-frag.net', '9565/Vitality', '5995/G2', '6685/Ancient', '6045/LDLC White', '11066/Fiend', '4863/TYLOO', '8513/Windigo', '7234/Endpoint', '7969/Nemiga', '9455/Imperial', '6745/eXtatus', '4914/3DMAX', '12000/500', '6290/Luminosity', '8362/MAD Lions', '6668/FLuffy Gangsters', '9976/Gambit Youngsters', '11518/Bad News Eagles', '6902/GODSENT', '10426/Wisla Krakow', '6334/Games Academy', '10421/Hard Legion', '8452/Seed', '4623/fnatic', '11585/IHC', '5395/PENTA', '7331/iGame.com', '5005/Complexity', '6118/Tempo Storm', '7175/Heroic', '8346/Heretics', '10994/O PLANO', '6959/MK', '8963/Lyngby Vikings', '7606/ViCi', '11665/ex-MAD Lions', '7010/Immortals', '5284/Titan', '5996/TSM', '5422/Dignitas', '6680/Echo Fox', '8305/DreamEaters', '8668/ORDER', '6615/OpTic', '6408/Arcade', '8637/Sprout', '8813/Illuminar', '6474/MVP Project', '10503/OG', '10577/SINNERS', '9943/ATK', '9215/MIBR', '7701/Imperial', '5752/Cloud9', '6191/Enemy', '11176/MOUZ NXT', '6292/Conquest']

def preprocess_data():
  for player_id in player_data:
    for team in player_data[player_id]['teams']:
      if team not in team_players:
        team_players[team] = set()
        partner_teams[team] = set()
        teams.append(team)
      team_players[team].add(player_id)

    country_set.add(player_data[player_id]['country'])

  # find partner teams
  for i in range(len(top_30_teams)):
    for j in range(i+1, len(top_30_teams)):
      if len(team_players[top_30_teams[i]].intersection(team_players[top_30_teams[j]])) > 0:
        partner_teams[top_30_teams[i]].add(top_30_teams[j])
        partner_teams[top_30_teams[j]].add(top_30_teams[i])

  # # any team
  # for i in range(len(teams)):
  #   for j in range(i+1, len(teams)):
  #     if len(team_players[teams[i]].intersection(team_players[teams[j]])) > 0:
  #       partner_teams[teams[i]].add(teams[j])
  #       partner_teams[teams[j]].add(teams[i])

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

    init_team = random.choice(top_30_teams)
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
        if puzzle[i][1] in clues:
          dupe_check = True
        clues.add(puzzle[i][1])
      else:
        if puzzle[i][0] in clues:
          dupe_check = True
        clues.add(puzzle[i][0])

    if dupe_check:
      continue

    # print('attempting to solve', puzzle)
    ans = solve_puzzle(puzzle, board, 0, set())
    if ans is not None:
      puzzle_list = [list(elm) for elm in puzzle]
      # for elm in puzzle_list:
      #   if elm[0] == 'team':
      #     elm[1] = elm[1][elm[1].index('/')+1:]
      return puzzle_list, ans

def generate_puzzles(num_puzzles=10):
  puzzles = []
  for i in range(num_puzzles):
    puzzle, ans = generate_puzzle()
    puzzles.append(puzzle)

    table = PrettyTable()
    table.header = False
    table.hrules=ALL
    table.add_row([''] + puzzle[:3])
    table.add_row([puzzle[3]] + ans[:3])
    table.add_row([puzzle[4]] + ans[3:6])
    table.add_row([puzzle[5]] + ans[6:9])
    print(table)

  return puzzles

read_data()
preprocess_data()

puzzles = generate_puzzles(1)
print(puzzles[0])
# print(teams)
