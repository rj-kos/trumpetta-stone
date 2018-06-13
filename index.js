const Twit = require('twit')
const Translate = require('@google-cloud/translate')
const fs = require('fs')

const project = require('./auth/TrumpettaStoneProject.json')
const TwitterAuth = require('./auth/twitter-auth.json')

const processedTweets = require('./processedTweets.json')

const translateAPI = new Translate({
    projectId: project.projectId,
    keyFilename: './auth/TrumpettaStoneTranslate.json'
})

const T = new Twit({
  consumer_key:         TwitterAuth.consumer_key,
  consumer_secret:      TwitterAuth.consumer_secret,
  access_token:         TwitterAuth.access_token,
  access_token_secret:  TwitterAuth.access_token_secret,
  timeout_ms:           60 * 1000,
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

T.get('statuses/user_timeline', { screen_name: 'realDonaldTrump', tweet_mode: 'extended' }, (err, data, response) => {
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
    let tweetRecords = processedTweets
    tweetRecords.ids.push(id)
    const json = JSON.stringify(tweetRecords)
    fs.writeFile('processedTweets.json', json, 'utf8', callback)
}

const translateTweets = (tweetIndex) => {
  if(tweetIndex >= tweetPipe.length) return
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