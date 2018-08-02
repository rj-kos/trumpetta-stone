# Trumpetta Stone (when life gives you nonsense, turn it into nonsense)

A twitter bot that takes "President" Donald Trump's tweets, feeds them through several rounds of [Google Translate](https://translate.google.com/) languages and then back into English, and then tweets them out via the twitter account ["Trumpetta Stone"](https://twitter.com/TrumpettaStone) (yes, that's a Rosetta Stone pun... I know it's not good)

![alt text](./readme-assets/flower-bed.png)

## Stack
- Node.js 8+
- MySQL
- Heroku Free Dyno

## Installation

Clone this repo and run `npm i`

## Configuration

Place a `.env ` file in the root of the repo that has the following structure

```
# twitter env variables
twitter_consumer_key='XXXXXXXX'
twitter_consumer_secret='XXXXXXXX'
twitter_access_token='XXXXXXXX'
twitter_access_token_secret='XXXXXXXX'

# google env variables
translate_type='XXXXXXXX'
translate_project_id='XXXXXXXX'
translate_private_key_id='XXXXXXXX'
translate_private_key='XXXXXXXX'
translate_client_email='XXXXXXXX'
translate_client_id='XXXXXXXX'
translate_auth_uri='XXXXXXXX'
translate_token_uri='XXXXXXXX'
translate_auth_provider_x509_cert_url='XXXXXXXX'
translate_client_x509_cert_url='XXXXXXXX'

# db env variables
db_host='XXXXXXXX'
db_user='XXXXXXXX'
db_password='XXXXXXXX'
db_database='XXXXXXXX'
```

The "twitter environment variables" should come from the twitter account you want to tweet to, the "google environment variables" should come from the google developer account/api you're going to use to translate, the "db environment variables" should come from the sql db you set up.

If you want to change the languages you can alter the language codes in the `languagePipe` variable in the `index.js` file, check available language codes [here](https://cloud.google.com/translate/docs/languages)

## Execution

Simply run `node index.js`

## Personal Config

I'm running this on a heroku free dyno using the free [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler) add-on to run the executable index file every 10 minutes and the [JawsDB Maria](https://elements.heroku.com/addons/jawsdb-maria) add-on for my MySQL environment.

*The SQL DB obviously isn't necessary for this app since we're only using one table and I'm even checking for indexes on the node side, but it was free and easy to set up so I just ran with it*
