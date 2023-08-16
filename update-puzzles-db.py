import importlib
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGO_DB_URL"))
db = client["csgodoku"]["game"]

page = db.find_one({ "_id": "puzzleList" })
db_puzzles = page['puzzles']

while True:
  choice = input('what to do?\n[D]elete\n[S]wap\n[Q]uit\n')
  choice = choice.lower()
  if choice == 'd':
    max_puzzle = len(db_puzzles)
    choice = input('what index to delete? (0-' + str(max_puzzle-1) + ') ')
    while not choice.isdigit() or int(choice) < 0 or int(choice) >= max_puzzle:
      choice = input('what index to delete? (0-' + str(max_puzzle-1) + ') ')
    choice = int(choice)
    db_puzzles.pop(choice)

    db.update_one({ "_id": "puzzleList" }, { "$set": { "puzzles": db_puzzles } })

    print('completed!')
  elif choice == 's':
    max_puzzle = len(db_puzzles)
    choice1 = input('what index to swap? (0-' + str(max_puzzle-1) + ') ')
    while not choice1.isdigit() or int(choice1) < 0 or int(choice1) >= max_puzzle:
      choice1 = input('what index to swap? (0-' + str(max_puzzle-1) + ') ')
    choice1 = int(choice1)
    choice2 = input('what index to swap with? (0-' + str(max_puzzle-1) + ') ')
    while not choice2.isdigit() or int(choice2) < 0 or int(choice2) >= max_puzzle:
      choice2 = input('what index to swap with? (0-' + str(max_puzzle-1) + ') ')
    choice2 = int(choice2)
    db_puzzles[choice1], db_puzzles[choice2] = db_puzzles[choice2], db_puzzles[choice1]

    db.update_one({ "_id": "puzzleList" }, { "$set": { "puzzles": db_puzzles } })

    print('completed!')
  elif choice == 'q':
    break
  else:
    print('incorect input! try again')