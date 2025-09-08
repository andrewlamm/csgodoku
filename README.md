# csdoku
## Immaculate Grid for Counterstrike
#### https://csdoku.com/

### Scripts
#### **`read-data-init.js`**
This file gets everyone's player data from HLTV and stores it in `playerData.csv`. Script takes around 20 hours to run. In case the script times out in the middle, it stores its current data into `playerData.csv`, which you can then use to copy it in a temporary file. Then, using the counter on line 147, you can skip the players that have already been read. This script also downloads all team, player, and country images.
#### **`update-data.js`**
This file updates the player data from HLTV using the already existing `playerData.csv`. Script a long time to run. It checks the player's kill, map, and round count and see if they differ from HLTV. If they do, it updates the statistics. Otherwise, it continues. Unlike the previous script, if this script times out in the middle, nothing will happen. This script will also download the images of teams, players, and countries if necessary. Finally, beware that some statistics on HLTV can be a bit inconsistent, so this script will update some players even if it is not necessary. You will need to update line 82 to the path of your Chrome executable.               
#### **`read-data.py`**
Deprecated script. Initially used for reading data from HLTV using python, but it is about 2x slower than the JS script and is missing a few features as well.
#### **`generate-puzzles.py`**
Script that generates puzzles for the immaculate grid using the `generate_puzzles` function. The function takes in two arguments: first, the `print_table` argument, which is default set to `True`. This determines whether or not each puzzle will be fanciliy printed after it generates. The second argument is `num_puzzles`, which determines the number of puzzles generated in that call.
#### **`find-top-teams.js`**
Script that naively goes through every team in `playerData.csv` and checks which ones have been in the top 20 rankings for HLTV. Saves all teams that it has looked through in the `top-teams.txt` file and saves all the top 20 teams in the `all-teams.txt` file. Those files are used in generating puzzles to ensure that the teams used in the puzzles are actually somewhat well known. You will need to update line 28 to the path of your Chrome executable.                
#### **`retrieve-remaining-players.js`**
This script goes through every team listed in `top-teams.txt` and checks if all players in the team have their stats downloaded. If not, it downloads the player's stats and updates the `playerData.csv` file. This script is used to download the stats of players that were missed at the time of running `read-data-init.js` or `update-data.js`. You will need to update line 71 to the path of your Chrome executable.               
#### **`upload-puzzles.py`**
Script generates puzzles from `generate-puzzles.py` and then uploads it onto the mongo database. Requires the `MONGO_DB_URL` enviornment variable.
#### **`update-puzzles-db.py`**
Script updates the puzzles in the database. Supports deletion and swapping of puzzles in the database. Requires the `MONGO_DB_URL` enviornment variable.
#### **`get-solutions.py`**
Script that prints all the valid players for each grid spot given a puzzle, as selected from the command line arguments (`-h` to view them). For example, running the program with the argument `-f 1` will use tomorrow's puzzle

### Running Scripts
When generating the `playerData.csv` file for the first time, run
1. `node scripts/read-data-init.js`
2. `python3 scripts/find-top-teams.py`
3. `node scripts/retrieve-remaining-players.js`

You can also just run
1. `node scripts/find-new-matches.js`
1. `node scripts/find-top-teams.js`
This hopefully should be faster as it just looks at the new matches since the last update and updates the corresponding players.

When updating the `playerData.csv` file, run
1. `node scripts/update-data.js`
2. `node scripts/find-top-teams.js`
3. `node scripts/retrieve-remaining-players.js`
You will need to update the following lines to the path of your Chrome executable: line 82 of `scripts/update-data.js`, line 28 of `scripts/find-top-teams.js`, and line 71 of `scripts/retrieve-remaining-players.js`

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
