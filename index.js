// snag environment variables
require('dotenv').load()

// node packages
const Twit = require('twit')
const Translate = require('@google-cloud/translate')
const mysql = require('mysql')

// pretty unnecessary way to do this but I was grabbing the data in a different way originally and this prevented a refactor
let processedTweets = {ids:[]}

// initiate google translate API Class
const translateAPI = new Translate({    
    projectId: process.env.translate_project_id,
    credentials: {
        type: process.env.translate_type,
        private_key_id: process.env.translate_private_key_id,
        private_key: process.env.translate_private_key.replace(/\\n/g, '\n'),
        client_email: process.env.translate_client_email,
        client_id: process.env.translate_client_id,
        auth_uri: process.env.translate_auth_uri,
        token_uri: process.env.translate_token_uri,
        auth_provider_x509_cert_url: process.env.translate_auth_provider_x509_cert_url,
        client_x509_cert_url: process.env.translate_client_x509_cert_url
    }    
})

// initiate Twitter API Class
const T = new Twit({
  consumer_key:         process.env.twitter_consumer_key,
  consumer_secret:      process.env.twitter_consumer_secret,
  access_token:         process.env.twitter_access_token,
  access_token_secret:  process.env.twitter_access_token_secret,
  timeout_ms:           60 * 1000
})

// init mysql connection
const connection = mysql.createConnection({
    host     : process.env.db_host,
    user     : process.env.db_user,
    password : process.env.db_password,
    database : process.env.db_database
})

// start mysql connection
connection.connect()

// grabbing tweets that have already been "translated"
connection.query('SELECT * FROM tweets', (error, results, fields) => {
    if (error) throw error
    // console.log(JSON.stringify(results))
    results.forEach(element => {
        processedTweets.ids.push(element.tweet_id)
    })
})

// place to store the tweets that we grab from twitter
let tweetPipe = []

// list of language steps/iterations for the translate api
const languagePipe = [
  ['en', 'kk'],
  ['kk', 'ja'],
  ['ja', 'is'],
  ['is', 'hi'],
  ['hi', 'zu'],
  ['zu', 'zh-tw'],
  ['zh-tw', 'en']
]

// grab the last 20 trump tweets
T.get('statuses/user_timeline', { screen_name: 'realDonaldTrump', tweet_mode: 'extended', count: 20 }, (err, data, response) => {
    const tweetData = data
    // console.log(tweetData[0])
    processTweets(tweetData)
})

// should really be called "parseTweets", parses the tweets into a more manageable structure and pushes them into our tweetPipe
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

// check if the tweet has already been "translated", return true/false
const oldTweet = (id) => {
    if(processedTweets.ids.indexOf(id) >= 0) {
        return true
    } else {
        return false
    }
}

// record the tweet to our DB so that we never try to process it again
const recordTweet = (id, callback) => {
    connection.query(`INSERT INTO tweets (tweet_id) VALUES (${id})`, (error, results, fields) => {
        if (error) throw error
    })
    callback()
}

// the function used to iteratively move through the tweetPipe list
const translateTweets = (tweetIndex) => {
  if(tweetIndex >= tweetPipe.length) {
        connection.end()
        console.log('ending connection')
        return
    }
  translateTweet(tweetPipe[tweetIndex].text, tweetPipe[tweetIndex].id, 0, tweetIndex)
}

// this actually does the work, it pushes the tweets through the google translate API and calls itself again for the next language unless we've reached the end of the line
// and have actually reached English - in that case, it sends them off to the tweeting function
const translateTweet = (tweet, id, languageStep, tweetIndex) => {
    if(oldTweet(id)) {
      const newTweetIndex = tweetIndex + 1
      translateTweets(newTweetIndex)
      return
    }
    if(languageStep < languagePipe.length) {
      translateAPI.translate(tweet, {from: languagePipe[languageStep][0], to: languagePipe[languageStep][1]}).then(res => {
            const tweet = res[0]
            console.log(tweet)
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

// blasts that tweet off into the internet
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