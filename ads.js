const spawn = require("child_process").spawn;

// more here: https://nodejs.org/api/child_process.html#child_process_subprocess_stdout
const py = (func="", args="") => {
  const pythonProcess = spawn('python',["ads.py",func, args]);
  pythonProcess.stdout.on('data', data => {
    //console.log(data.toString('utf8'))
    console.log(data.toString())  // only see working in console because of this call...
  } );
  //return pythonProcess.stdout.on('data')
}

// 1st argument is funciton
// if makeAd:
// 2nd argument is nubmer of ads
// 3rd argument is 
// 4th argument is headlinePart1
// 5th argument is headlinePart2
// 6th argument is description
// 7th argument is finalURL

const makeAd = () => {
  py("makeAd")
}

const killAd = () => {
  py("killAd")
}

const checkAd = () => {
  py("checkAd")
}

py("makeAd")
// console.log(["hi","bye"].map(py))

module.exports = {
  makeAd: makeAd,
  killAd: killAd,
  checkAd: checkAd,
  getBalance: "THIS",
  launchBang: "That"
};