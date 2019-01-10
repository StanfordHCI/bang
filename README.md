# Bang!
Bang uses pseudonyms to see what happens when people work in the same groups when they think they're working in new ones.

Bang deploys on MTurk, scales from 1 to 16 simultaneous participants, and includes a range of team measurements and task integrations.

## Getting started
1. Clone the repository then run `npm install` in the github directory to get all the dependencies.
2. Add an `.env` containing the following text:
  ```PowerShell
  AWS_ID=YOUR_AWS_MTURK_ID
  AWS_KEY=YOUR_AWS_MTURK_KEY

  RUNNING_LIVE=FALSE
  RUNNING_LOCAL=TRUE

  TEAM_SIZE=4
  ROUND_MINUTES=10
  ```
3. Start the server by running `node server.js`.

## Developing
Run `tsc -w` to watch typescript files for changes and `supervisor server.js` so that the server will restart when files in the github folder are changed. Or combine these with:
```PowerShell

```
