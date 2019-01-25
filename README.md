# Bang!

Bang is a tool to study the consistancy of socio-psychological phenomenon by running within subjects studies on groups. Bang uses pseudonyms to see what happens when people work in the same groups when they think they're working in new ones.

## Getting started

1. Clone the repository then run `npm install` in the github directory to get all the dependencies.
2. Make sure you're set up to use the MTurk API. I have a [intro](https://glitch.com/edit/#!/mturk) that will get you started.
3. Add an `.env` with the following content:

```PowerShell
AWS_ID=YOUR_AWS_MTURK_ID
AWS_KEY=YOUR_AWS_MTURK_KEY

RUNNING_LIVE=FALSE
RUNNING_LOCAL=TRUE

TEAM_SIZE=4
ROUND_MINUTES=10
```

4. Start the server by running `node built/server.js`.

## Developing

Run `tsc` to watch typescript files for changes and `supervisor server.js` so that the server will restart when files in the github folder are changed. Or combine these with:
