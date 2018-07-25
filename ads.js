const spawn = require("child_process").spawn;


// more here: https://nodejs.org/api/child_process.html#child_process_subprocess_stdout
const py = (func="", args="") => {
  const pythonProcess = spawn('python',["ads.py",func, args]);
  // pythonProcess.stdout.on('data', data => {console.log(data.toString('utf8'))} );
  return pythonProcess.stdout.on('data')})

console.log(["hi","bye"].map(py))

module.exports = {
  getBalance: "THIS",
  launchBang: "That"
};
