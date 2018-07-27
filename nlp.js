require('dotenv').config();
const fs = require('fs')
const ToneAnalyzer = require('watson-developer-cloud/tone-analyzer/v3');

const toneAnalyzer = new ToneAnalyzer({
  // TODO: figure out why accessing env file isn't working
  // username: process.env.TONE_ANALYZER_USERNAME,
  // password: process.env.TONE_ANALYZER_PASSWORD,
  // version_date: process.env.TONE_ANALYZER_VERSION_DATE

  //phoebe's ibm tone analyzer credentials - trial version
  username: '1652b902-ddf2-4828-a54e-22c91ba9fcf9',
  password: 'N3WpdlogdyOP',
  version_date: '2017-09-21'
});

// Setting up DB
const Datastore = require('nedb'),
    db = {};
    //db.users = new Datastore({ filename:'.data/users', autoload: true });
    db.chats = new Datastore({ filename:'.data/chats', autoload: true });
    //db.products = new Datastore({ filename:'.data/products', autoload: true });
    //db.checkins = new Datastore({ filename:'.data/checkins', autoload: true});
    //db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true});
    db.tone = new Datastore({ filename:'.data/tone', autoload: true});
    db.tonechat = new Datastore({ filename:'.data/tonechat', autoload: true});

//TODO: make it handle empty line at end of file
const chatlogFile = '.data/chats'// should change this to access copy of db chats?

let chatlogArr =[]
// read chat log db into array of json chat message objects
fs.readFileSync(chatlogFile).toString().split('\n').forEach(function (line) {
  chatlogArr.push(JSON.parse(line));
})

let map = new Map();
// map JSON string with batch, round, room fields to array of message objects with user, time, text fields
for(let i = 0; i < chatlogArr.length; i++) {
  let chatObj = chatlogArr[i];
  let logIdObj;
  //group chatlogs by conditions 
  logIdObj = JSON.stringify({'batch':chatObj.batch, 'round':chatObj.round, 'room':chatObj.room});
  //logIdObj = JSON.stringify({'userID':chatObj.userID});
  
  let messageObj = {'user': chatObj.userID, 'time': chatObj.time, 'text': chatObj.message}//send id and timestamp with message
  if(!map.has(logIdObj)) {
    map.set(logIdObj, [messageObj]);
  } else {
    console.log(map.get(logIdObj))
    map.get(logIdObj).push(messageObj);
  }
}


for (let [k,chatlog] of map) {
  let utterances = [];


  let chatlogText = chatlog.map(function(messageObj){
    let key = JSON.parse(k);
    key['user'] = messageObj.user;
    key['time'] = messageObj.time;
    key['text'] = messageObj.text;
    //gets tone of each message
    getTone(key, messageObj.text)
    utterances.push({'text':messageObj.text, 'user':messageObj.user})
    return messageObj.text;
  }).join('\n');

  //console.log(chatlogText)

  //gets tone of overall document
  //getTone(k, chatlogText)
   
  //getToneChat(k, utterances) //does not store timestamp/user id with tone analysis response
  // console.log(JSON.stringify(toneAnalysis, null, 2));
  // console.log(JSON.stringify(toneChatAnalysis, null, 2));
  // db.tone.insert({'runKey': JSON.parse(k), 'toneAnalysis': toneAnalysis, 'toneChatAnalysis': toneChatAnalysis}, (err, inserted) => {
  //   if(err) console.log("There's a problem adding a message to the DB: ", err);
  //   else if(inserted) console.log("Tone analysis added to the DB");
  // });
}

// TODO: 
// modify ibm response to include timestamp/user id
// store response in db

function getToneChat(k, utterances) {
  let toneChatParams = {
    utterances: utterances
  };

  toneAnalyzer.toneChat(toneChatParams, function (error, analysis) {
    if (error) {
      console.log(error);
    } else {
      //console.log(JSON.stringify(analysis, null, 2));//should store this in db -> analyze/graph
      db.tonechat.insert({'runKey': JSON.parse(k), 'toneChatAnalysis': analysis}, (err, inserted) => {
        if(err) console.log("There's a problem adding a message to the DB: ", err);
        else if(inserted) console.log("Tone chat analysis added to the DB");
      });
    }
  });
}

function getTone(key, chatlogText) {
  let params = {
    tone_input: chatlogText,
    content_type: 'text/plain',
    sentences: false
  };

  toneAnalyzer.tone(params, function (error, response) {
    if (error) {
      console.log(error);
    } else {
      console.log(JSON.stringify(response, null, 2));//should store this in db tone file
      db.tone.insert({'runKey': key, 'toneAnalysis': response}, (err, inserted) => {
        if(err) console.log("There's a problem adding a message to the DB: ", err);
        else if(inserted) console.log("Tone analysis added to the DB");
      });
    }
  });
}

