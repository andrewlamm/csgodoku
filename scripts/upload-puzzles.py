import importlib
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from prettytable import PrettyTable, ALL
import certifi

load_dotenv()

generate_puzzles = importlib.import_module("generate-puzzles")

client = MongoClient(os.getenv("MONGO_DB_URL"), tlsCAFile=certifi.where())
db = client["csgodoku"]["game"]

page = db.find_one({ "_id": "puzzleList" })
db_puzzles = page['puzzles']

puzzle_list = generate_puzzles.generate_puzzles(False, 100)

puzzle_count = 0
added_count = 0
for puzzle in puzzle_list:
  print('puzzle ' + str(puzzle_count+1) + ' of ' + str(len(puzzle_list)))
  puzzle_count += 1

  table = PrettyTable()
  table.header = False
  table.hrules=ALL
  table.add_row([''] + puzzle[:3])
  table.add_row([puzzle[3]] + ['','',''])
  table.add_row([puzzle[4]] + ['','',''])
  table.add_row([puzzle[5]] + ['','',''])
  print(table)
  add = input('add puzzle? (y/n) ')
  while add != 'y' and add != 'n':
    add = input('add puzzle? (y/n) ')

  if add == 'y':
    db_puzzles.append(puzzle)
    added_count += 1

db.update_one({ "_id": "puzzleList" }, { "$set": { "puzzles": db_puzzles } })

print('completed')
print('added ' + str(added_count) + ' puzzles')
