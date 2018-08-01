// node packages
const Twit = require('twit')
const Translate = require('@google-cloud/translate')
const mysql = require('mysql')

// private auth stuff
const project = require('./auth/TrumpettaStoneProject.json')
const TwitterAuth = require('./auth/twitter-auth.json')
const DbAuth = require('./auth/DbAuth.json')

let processedTweets = {ids:[]}

const translateAPI = new Translate({
    projectId: project.projectId,
    keyFilename: './auth/TrumpettaStoneTranslate.json'
})

console.log(translateAPI)

const T = new Twit({
  consumer_key:         TwitterAuth.consumer_key,
  consumer_secret:      TwitterAuth.consumer_secret,
  access_token:         TwitterAuth.access_token,
  access_token_secret:  TwitterAuth.access_token_secret,
  timeout_ms:           60 * 1000,
})

// init mysql connection
const connection = mysql.createConnection({
    host     : DbAuth.host,
    user     : DbAuth.user,
    password : DbAuth.password,
    database : DbAuth.database
})

// start mysql connection
connection.connect()

connection.query('SELECT * FROM tweets', (error, results, fields) => {
    if (error) throw error
    results.forEach(element => {
        processedTweets.ids.push(element.tweet_id)
    })
})


let tweetPipe = []

const languagePipe = [
  ['en', 'kk'],
  ['kk', 'ja'],
  ['ja', 'is'],
  ['is', 'hi'],
  ['hi', 'zu'],
  ['zu', 'zh-tw'],
  ['zh-tw', 'en']
]

T.get('statuses/user_timeline', { screen_name: 'realDonaldTrump', tweet_mode: 'extended', count: 20 }, (err, data, response) => {
    const tweetData = data
    processTweets(tweetData)
})

processTweets = (tweets) => {
    for(let i = (tweets.length - 1); i > -1; i--) {
        const trumpRawTweet = tweets[i].full_text
        const tweetId = tweets[i].id
        if(trumpRawTweet && tweetId) {
            const tweetObj = {text: trumpRawTweet, id: tweetId}
            tweetPipe.push(tweetObj)
        }
    }
    translateTweets(0)
}

const oldTweet = (id) => {
    if(processedTweets.ids.indexOf(id) >= 0) {
        return true
    } else {
        return false
    }
}

const recordTweet = (id, callback) => {
    connection.query(`INSERT INTO tweets (tweet_id) VALUES (${id})`, (error, results, fields) => {
        if (error) throw error
    })
    callback()
}

const translateTweets = (tweetIndex) => {
  if(tweetIndex >= tweetPipe.length) {
        connection.end()
        console.log('ending connection')
        return
    }
  translateTweet(tweetPipe[tweetIndex].text, tweetPipe[tweetIndex].id, 0, tweetIndex)
}

const translateTweet = (tweet, id, languageStep, tweetIndex) => {
    if(oldTweet(id)) {
      const newTweetIndex = tweetIndex + 1
      translateTweets(newTweetIndex)
      return
    }
    if(languageStep < languagePipe.length) {
      translateAPI.translate(tweet, {from: languagePipe[languageStep][0], to: languagePipe[languageStep][1]}).then(res => {
            const tweet = res[0]
            newLanguageStep = languageStep + 1
            translateTweet(tweet, id, newLanguageStep, tweetIndex)
        }).catch(err => {
            console.log(err)
        })
    } else {
        const newTweetIndex = tweetIndex + 1
        recordTweet(id, blastTweet(tweet, newTweetIndex))
    }
}

const blastTweet = (tweet, newTweetIndex) => {
  return () => {
    T.post('statuses/update', { status: tweet }, (err, data, response) => {
      setTimeout(() => {
        console.log('just blasted a tweet after waiting 2 seconds: ', newTweetIndex)
        translateTweets(newTweetIndex)
      }, 2000)      
    })
  }
}