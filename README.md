# csgodoku
## Immaculate Grid for CS:GO

### Scripts
#### **`read-data-init.js`**
This file gets everyone's player data from HLTV and stores it in `playerData.csv`. Script takes around 20 hours to run. In case the script times out in the middle, it stores its current data into `playerData.csv`, which you can then use to copy it in a temporary file. Then, using the counter on line 147, you can skip the players that have already been read. This script also downloads all team, player, and country images.
#### **`update-data.js`**
This file updates the player data from HLTV using the already existing `playerData.csv`. Script takes about an hour to run. It checks the player's kill, map, and round count and see if they differ from HLTV. If they do, it updates the statistics. Otherwise, it continues. Unlike the previous script, if this script times out in the middle, nothing will happen. This script will also download the images of teams, players, and countries if necessary. Finally, beware that some statistics on HLTV can be a bit inconsistent, so this script will update some players even if it is not necessary.
#### **`read-data.py`**
Deprecated script. Initially used for reading data from HLTV using python, but it is about 2x slower than the JS script and is missing a few features as well.
#### **`generate-puzzles.py`**
Script that generates puzzles for the immaculate grid using the `generate_puzzles` function. The function takes in two arguments: first, the `print_table` argument, which is default set to `True`. This determines whether or not each puzzle will be fanciliy printed after it generates. The second argument is `num_puzzles`, which determines the number of puzzles generated in that call.
#### **`find-top-teams.py`**
Script that naively goes through every team in `playerData.csv` and checks which ones have been in the top 30 rankings for HLTV. It prints out the set of teams that are, which is then fed into line 66 of `generate-puzzles.py`, which allows that script to only use more well known teams.
#### **`upload-puzzles.py`**
Script generates puzzles from `generate-puzzles.py` and then uploads it onto the mongo database. Requires the `MONGO_DB_URL` enviornment variable.

### Website
To run the website locally, run the following commands:
```
npm i
node index.js
```
Then, you may visit it at `http://localhost:4000/`
