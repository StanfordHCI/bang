// Checks a google spredsheet for new bonuses and pays them once the worker has completed a bonus task.

// Basic requirements
require("dotenv").config(); //Enables .env
const fs = require("fs");
const readline = require("readline"); //Used for setting token
const { google } = require("googleapis");
const mturk = require("./mturkTools"); //Our Mturk API
const parse = require("csv-parse"); //CSV parser
const tokenFile = "token.json"; //Local token

// The document id of the bonus sheet.
const bonusSheetID = "1IaXChzJI0sSxm2uWKrb8Do4HeP6LNSxoCqUyomNFRMQ";

// The HIT id of the repay hit.
const repayHITId = "3OWZNK3RYL458YRWPLQDTVVVY9PU2X";

// Logs into Google Account
function authorize() {
  return new Promise((resolve, reject) => {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.G_ID,
      process.env.G_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );
    fs.readFile(tokenFile, (err, token) => {
      if (err) {
        return getAccessToken(oAuth2Client);
      }
      oAuth2Client.setCredentials(JSON.parse(token));
      resolve(oAuth2Client);
    });
  });
}

// Creates access token for oAuth 2
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"]
  });
  console.log("\nAuthorize by visiting this url:\n\n", authUrl, "\n");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("The enter code: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later executions
      fs.writeFile(tokenFile, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", tokenFile);
      });
      // callback(oAuth2Client);
    });
  });
}

// Returns JSON of CSV string
function parseCSV(csvData) {
  return new Promise((resolve, reject) => {
    parse(csvData, { columns: true }, (err, JSONData) => {
      if (err) reject(err);
      resolve(JSONData.filter(u => u.mturkId !== ""));
    });
  });
}

// Merges two objects via a single shared key
function merge(Obj1, Obj2, key) {
  return Obj1.map(u => {
    try {
      const v = Obj2.filter(v => v[key] === u[key])[0];
      Object.keys(v).forEach(k => (u[k] = v[k]));
      return u;
    } catch (e) {
      return false;
    }
  }).filter(u => u);
}

// Returns bonus sheet from Google Drive
function getBonusSheet(auth) {
  return new Promise((resolve, reject) => {
    const drive = google.drive({ version: "v3", auth });
    drive.files.export(
      { fileId: bonusSheetID, mimeType: "text/csv" },
      (err, response) => {
        if (err) reject(err, err.stack);
        // console.log(response.data);
        resolve(response.data);
      }
    );
  });
}

// Returns HIT Assignments for HITId
function getHITAssignments(HITId) {
  return new Promise((resolve, reject) => {
    mturk.listAssignments(HITId, data => {
      resolve(data);
    });
  });
}

// Gets bonus sheet, converts sheet to JSON, gets HIT results, merges and executes bonus.
authorize()
  .then(getBonusSheet)
  .then(parseCSV)
  .then(bonusJSON => {
    getHITAssignments(repayHITId).then(HITJSON => {
      const bonusable = merge(HITJSON, bonusJSON, "WorkerId");
      // console.log(bonusable.map(u => u.WorkerId));
      mturk.payBonuses(bonusable);
      // Adds hasBanged qualification, to stop them baning
      mturk.assignQualificationToUsers(bonusable, mturk.quals.hasBanged);
    });
  })
  .catch(e => {
    //Notifies Mark if there're any issues
    console.log(e);
    mturk.notifyWorkers(
      ["A19MTSLG2OYDLZ"],
      `Bonusing script encountered an error`,
      `${e}\n\n${e.stack}`
    );
  });
