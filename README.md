# csgodoku
## Immaculate Grid for CS:GO

### Scripts
#### **`read-data-init.js`**
This file gets everyone's player data from HLTV and stores it in `playerData.csv`. Script takes around 20 hours to run. In case the script times out in the middle, it stores its current data into `playerData.csv`, which you can then use to copy it in a temporary file. Then, using the counter on line 147, you can skip the players that have already been read. This script also downloads all team, player, and country images.
#### **`update-data.js`**
This file updates the player data from HLTV using the already existing `playerData.csv`. Script takes about two hours to run. It checks the player's kill, map, and round count and see if they differ from HLTV. If they do, it updates the statistics. Otherwise, it continues. Unlike the previous script, if this script times out in the middle, nothing will happen. This script will also download the images of teams, players, and countries if necessary. Finally, beware that some statistics on HLTV can be a bit inconsistent, so this script will update some players even if it is not necessary.
#### **`read-data.py`**
Deprecated script. Initially used for reading data from HLTV using python, but it is about 2x slower than the JS script and is missing a few features as well.
#### **`generate-puzzles.py`**
Script that generates puzzles for the immaculate grid using the `generate_puzzles` function. The function takes in two arguments: first, the `print_table` argument, which is default set to `True`. This determines whether or not each puzzle will be fanciliy printed after it generates. The second argument is `num_puzzles`, which determines the number of puzzles generated in that call.
#### **`find-top-teams.py`**
Script that naively goes through every team in `playerData.csv` and checks which ones have been in the top 30 rankings for HLTV. It prints out the set of teams that are, which is then fed into line 66 of `generate-puzzles.py`, which allows that script to only use more well known teams.
#### **`upload-puzzles.py`**
Script generates puzzles from `generate-puzzles.py` and then uploads it onto the mongo database. Requires the `MONGO_DB_URL` enviornment variable.
#### **`update-puzzles-db.py`**
Script updates the puzzles in the database. Supports deletion and swapping of puzzles in the database. Requires the `MONGO_DB_URL` enviornment variable.
#### **`find-all-players.py`**
Script that prints all the valid players for each grid spot given a puzzle, as selected from the command line arguments (`-h` to view them). For example, running the program with the argument `-f 1` will use tomorrow's puzzle

### Website
To run the website locally, run the following commands:
```
npm i
node index.js
```
Then, you may visit it at `http://localhost:4000/`

### Enviornment Variables
`MONGO_DB_URL` - link to connect to mongoDB database
`SESSION_SECRET` - secret used in `cookie-session`
`GH_TOKEN` - github token, used to connect to github and read csv file

### Database
```
{
  _id: "currentPuzzleStats"
  numberGames: Integer
  pickedPlayers: Array of Objects (9 length)
    0: {
      <player_id>: Integer
    }
  scores: Array of Integers (10 length)
    0: Integer
  totalUniquenes: Integer
  puzzleDate: Integer
}
```
`numberGames` stores the number of total games played today
`pickedPlayers` is an array of objects. Each object contains all the possible players for that grid position (by the player's ID) and the number of times it has been picked
`scores` is an array of integer. Each index contains the number of games that had that score
`totalUniqueness` stores the total uniqueness score across all games played today
`puzzleDate` contains the date of the current puzzle
```
{
  _id: "puzzleList"
  puzzles: Array of Arrays
    0: Array of Arrays (length 6)
      0: Array of Strings (length 2)
        0: String
        1: String
}
```
`puzzles` contains the list of puzzles. Each puzzle is a length 6 array of a length 2 array of strings. The first string identifies the type of clue and the second string is the value of the clue. For example, if the first string is `team`, then the second string is a team name.
```
{
  _id: 'infinitePuzzles'
  <uuid4>: String
}
```
Each key in this page is a uuid4 string containing to a randomly generated infinite puzzle. The value for each key is the stringifyed version of the puzzle corresponding to that uuid.
