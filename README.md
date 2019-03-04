# Bang!

Bang uses pseudonyms to see what happens when people work in the same groups when they think they're working in new ones.

Bang deploys on MTurk, scales from 1 to 16 simultaneous participants, and includes a range of team measurements and task integrations.

## How to bang

To run, clone, run `npm install` in the github directory, and add an `.env` file based on the following:

```PowerShell
AWS_ID=YOUR_AWS_MTURK_ID
AWS_KEY=YOUR_AWS_MTURK_KEY

RUNNING_LIVE=FALSE
RUNNING_LOCAL=TRUE

TEAM_SIZE=4
ROUND_MINUTES=15
```

Replace the keys with your own by creating an IAM user (see a [tutorial on getting set up with keys](https://glitch.com/edit/#!/mturk)). Then just run remotely with `node server.js`. Check that server is running successfully via [this link](http://127.0.0.1:3000/?assignmentId=3K4J6M3CXF8DU3JZ8XUVEMJHFWEAGV&hitId=3TRB893CSJPTPHN7BSD9FBMB45DG72&workerId=A19MTSLG2OYDLZ&turkSubmitTo=https%3A%2F%2Fworkersandbox.mturk.com)

## Getting Started Tips

- Development Tips:
  - Make, commit, and push changes from the `nokill` branch
- Testing Tips:
  - Turn off waiting room by going to `public/client.js` and `server.js` and set const `waitChaton` to `false`
  - Set `TEAM_SIZE=1` (int must be a perfect square) and `ROUND_MINUTES=1` (or smaller value) to efficiently test
  - To test larger team sizes, change the Worker ID in the URL. A list of 26 different Worker URL's [may be found here](https://docs.google.com/document/d/e/2PACX-1vRKrF6XJ-LUGyuumUiAyXc2mLOwPdhivliMadUKXqK_a92_vmV_9jaBxhtst3BSqK_BdtCdlZHd5VfC/pub).
