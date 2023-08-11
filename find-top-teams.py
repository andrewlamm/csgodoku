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

prev_top_teams_list = ['11595/Outsiders', '7718/Movistar Riders', '6472/Rebels', '4548/CPH Wolves', '4602/Tricked', '6372/CSGL', '11837/Fluxo', '8481/Valiance', '4991/fnatic', '6548/?', '6133/Orbit', '10948/Extra Salt', '11251/Eternal Fire', '4688/Epsilon', '11283/Falcons', '6010/Chiefs', '6669/Binary Dragons', '8135/FORZE', '7801/Ghost', '4468/x6tence', '5310/HellRaisers', '9211/LeftOut', '8120/AVANGAR', '10606/c0ntact', '5378/Virtus.pro', '9888/New England Whalers', '11148/Akuma', '11419/ECSTATIC', '9572/ex-Space Soldiers', '7020/Spirit', '8008/Grayhound', '10621/1WIN', '7354/MVP PK', '11811/Monte', '7169/fnatic Academy', '6686/AGG', '10020/Aristocracy', '4559/Millenium', '4869/ENCE', '10150/CR4ZY', '5596/Platinium', '6773/VG.CyberZen', '11861/Aurora', '4477/Publiclir.se', '4791/Immunity', '6132/Method', '5974/CLG', '5435/gBots', '7613/Red Reserve', '11616/Players', '7157/Rogue', '6405/Orgless', '5991/Envy', '10276/Finest', '6220/Epiphany Bolt', '10304/Triumph', '9183/Winstrike', '10671/FunPlus Phoenix', '10831/Entropiq', '8113/Sharks', '6619/INTZ', '4501/ALTERNATE aTTaX', '4674/LDLC', '7726/Swole Patrol', '6375/Vexed', '4682/RCTIC', '8068/AGO', '6137/SK', '7106/eUnited', '4608/Natus Vincere', '5158/Bravado', '4494/MOUZ', '6641/Obey.Alliance', '11085/ex-Winstrike', '6978/Singularity', '4413/Lemondogs', '6134/Kinguin', '7532/BIG', '7168/Crowns', '6855/Fragsters', '10164/Riot Squad', '5906/Torqued', '10399/Evil Geniuses', '6301/Splyce', '11501/HEET', '6736/Selfless', '11164/Into the Breach', '9481/x6tence Galaxy', '9806/Apeks', '7865/HAVU', '10278/9INE', '7367/Quantum Bellator Fire', '9928/GamerLegion', '6673/NRG', '11514/Rare Atom', '10386/SKADE', '10697/BLINK', '7244/K23', '8669/Espada', '10851/Wings Up', '9862/devils.one', '8772/Syman', '10096/EXTREMUM', '10567/SAW', '7557/Misfits', '7059/X', '10514/Gen.G', '6503/CyberZen', '9085/Chaos', '5454/SKDC', '11003/DBL PONEY', '5599/Dobry&amp;Gaming', '6724/Preparation', '6407/DenDD', '4411/Ninjas in Pyjamas', '11309/00NATION', '4555/Virtus.pro', '5973/Liquid', '4773/paiN', '6469/eXplosive', '11119/EPG Family', '6386/Winterfox', '8474/100 Thieves', '6597/Quest', '6211/Renegades', '6665/Astralis', '7124/passions', '8297/FURIA', '6947/TeamOne', '6094/Vega Squadron', '6248/TheMongolz', '7461/Copenhagen Flames', '5929/Space Soldiers', '9996/9z', '6651/Gambit', '5988/FlipSid3', '6667/FaZe', '7533/North', '6226/E-frag.net', '9565/Vitality', '5995/G2', '6685/Ancient', '6045/LDLC White', '11066/Fiend', '4863/TYLOO', '8513/Windigo', '7234/Endpoint', '7969/Nemiga', '9455/Imperial', '6745/eXtatus', '4914/3DMAX', '12000/500', '6290/Luminosity', '8362/MAD Lions', '6668/FLuffy Gangsters', '9976/Gambit Youngsters', '11518/Bad News Eagles', '6902/GODSENT', '10426/Wisla Krakow', '6334/Games Academy', '10421/Hard Legion', '8452/Seed', '4623/fnatic', '11585/IHC', '5395/PENTA', '7331/iGame.com', '5005/Complexity', '6118/Tempo Storm', '7175/Heroic', '8346/Heretics', '10994/O PLANO', '6959/MK', '8963/Lyngby Vikings', '7606/ViCi', '11665/ex-MAD Lions', '7010/Immortals', '5284/Titan', '5996/TSM', '5422/Dignitas', '6680/Echo Fox', '8305/DreamEaters', '8668/ORDER', '6615/OpTic', '6408/Arcade', '8637/Sprout', '8813/Illuminar', '6474/MVP Project', '10503/OG', '10577/SINNERS', '9943/ATK', '9215/MIBR', '7701/Imperial', '5752/Cloud9', '6191/Enemy', '11176/MOUZ NXT', '6292/Conquest']
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

  if team == '6548/?':
    team = '6548/-'

  team_page = get_parsed_page('https://www.hltv.org/team/' + team)

  if team_page.find('div', {'class': 'team-chart-container'}) is None:
    # whoops broken link, just skip :)
    print('skipping team')
    continue

  if len(team_page.find('div', {'class': 'team-chart-container'}).find_all('span', {'class': 'value'})) > 1:
    rank = int(team_page.find('div', {'class': 'team-chart-container'}).find_all('span', {'class': 'value'})[1].text[1:])

    if rank < THRESHOLD:
      top_teams.add(team)

  if team == '6548/-':
    team = '6548/?'

print(list(top_teams))
