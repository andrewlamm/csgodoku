const { MongoClient } = require('mongodb')
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

try {
  const client = new MongoClient(process.env.MONGO_DB_URL)
  client.connect()
  console.log("Connected to MongoDB")
  const db = client.db('csgodoku')
  const historicalDb = db.collection('historical')
  const gameDb = db.collection('game')

  module.exports = { historicalDb, gameDb }
}
catch (err){
  console.log("error connecting to mongodb", err)
}
