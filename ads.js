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
// 2nd argument is nubmer of ads  // number
// 3rd argument is headlinePart1  // string
// 4th argument is headlinePart2  // string
// 5th argument is description  // string
// 6th argument is finalURL // sends them directly to the product

const makeAd = () => {
  py("makeAd")
}

const killAd = () => {
  py("killAd")
}

const checkAd = () => {
  py("checkAd")
}

py("makeAd", 1, "Testing testing, read all about it!", "team Mark wins again.", "What a good ad this is.", "https://www.google.com/")
// console.log(["hi","bye"].map(py))

module.exports = {
  makeAd: makeAd,
  killAd: killAd,
  checkAd: checkAd,
  getBalance: "THIS",
  launchBang: "That"
};


// async code

// function resolveAfter2Seconds() {
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve('resolved');
//     }, 2000);
//   });
// }

// async function asyncCall() {
//   console.log('calling');
//   var result = await resolveAfter2Seconds();
//   console.log(result);
//   // expected output: "resolved"
// }

// asyncCall();