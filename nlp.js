require('dotenv').config();

const readline = require('readline');
const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

const tone_analyzer = new ToneAnalyzerV3({
  username: process.env.TONE_ANALYZER_USERNAME,
  password: process.env.TONE_ANALYZER_PASSWORD,
  version_date: process.env.TONE_ANALYZER_VERSION_DATE
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Setting up DB
// const Datastore = require('nedb'),
//     db = {};
//     db.users = new Datastore({ filename:'.data/users', autoload: true });
//     db.chats = new Datastore({ filename:'.data/chats', autoload: true });
//     db.products = new Datastore({ filename:'.data/products', autoload: true });
//     db.checkins = new Datastore({ filename:'.data/checkins', autoload: true});
//     db.midSurvey = new Datastore({ filename:'.data/midSurvey', autoload: true});



rl.question('Please enter a short paragraph for Watson to analyze...', (text) => {

  let params = {
    tone_input: text,
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

  rl.close();
});



