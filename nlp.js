require('dotenv').config();
const fs = require('fs')
const readline = require('readline');
const ToneAnalyzer = require('watson-developer-cloud/tone-analyzer/v3');

const tone_analyzer = new ToneAnalyzer({
  // TODO: figure out why accessing env file isn't working
  // username: process.env.TONE_ANALYZER_USERNAME,
  // password: process.env.TONE_ANALYZER_PASSWORD,
  // version_date: process.env.TONE_ANALYZER_VERSION_DATE

  //phoebe's ibm tone analyzer credentials - trial version
  username: '1652b902-ddf2-4828-a54e-22c91ba9fcf9',
  password: 'N3WpdlogdyOP',
  version_date: '2017-09-21'
});

const chatlogFile = '.data/chats'// should change this to access copy of db chats?
let chatlogArr =[]
fs.readFileSync(chatlogFile).toString().split('\n').forEach(function (line) {
  chatlogArr.push(JSON.parse(line));
})

let chatlogText = chatlogArr.map(function(chatObj){
    return chatObj.message;
  }).join('\n');

  let params = {
    tone_input: chatlogText,
    content_type: 'text/plain',
    sentences: true
  };

  tone_analyzer.tone(params, function (error, response) {
    if (error) {
      console.log(error);
    } else {
      console.log(JSON.stringify(response, null, 2));//should store this in db tone file
    }
  });


// Setting up DB
// const Datastore = require('nedb'),
//     db = {};
//     db.users = new Datastore({ filename:'.data/users', autoload: true });
//     db.chats = new Datastore({ filename:'.data/chats', autoload: true });
//     db.products = new Datastore({ filename:'.data/products', autoload: true });
//     db.checkins = new Datastore({ filename:'.data/checkins', autoload: true});
//     db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true});





