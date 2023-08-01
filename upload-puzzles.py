import importlib
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

generate_puzzles = importlib.import_module("generate-puzzles")

client = MongoClient(os.getenv("MONGO_DB_URL"))
db = client["csgodoku"]["game"]

page = db.find_one({ "_id": "puzzleList" })
db_puzzles = page['puzzles']

puzzle_list = generate_puzzles.generate_puzzles(False, 10)

for puzzle in puzzle_list:
  db_puzzles.append(puzzle)

db.update_one({ "_id": "puzzleList" }, { "$set": { "puzzles": db_puzzles } })

print('completed')
