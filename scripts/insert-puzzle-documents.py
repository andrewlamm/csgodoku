# Convert large infinite puzzle file into multiple smaller documents
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGO_DB_URL"))
db = client["csgodoku"]["game"]
page = db.find_one({ "_id": "infinitePuzzles" })

all_puzzles = []
for puzzleID in page:
  if puzzleID != "_id":
    all_puzzles.append( { "_id": puzzleID, "puzzle": page[puzzleID] } )

# print(all_puzzles)

res = db.insert_many(all_puzzles)

print(res)
