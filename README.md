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

## Running Live Steps
1. SSH into server. Currently we are using ubuntu@b01.dmorina.com: `ssh -i ~/.ssh/sh-batch.pem ubuntu@b01.dmorina.com` 
2. cd into the folder you'll be working in (check for one no one else is using)
3. Double check that the switches in the top of `server.js` and `public/client.js` are correct. Specifically:
    - Check that the surveys you want are `true`
    - waitChatOn is `true` in both files
4. Adjust `.env` to reflect the group size and task duration you want.
    - Right now running larger than 4 and longer than 10 minutes per task are not reliable
    - Critically `RUNNING_LIVE=TRUE` and `RUNNING_LOCAL=FALSE` will be the settings you need for launching live HITs.
    - Switching `RUNNING_LIVE=FALSE` tests in the sandbox. Other settings in that file should not need to be adjusted.
5. Check to see if anyone else is running. Start by doing `ps -ax | grep -i node` which will tell you if there are any other node processes running. Its fine to run at the same time as others, BUT, we don't like to start new HITs while another one is still in waitChat. So if you do see another task running, try to check in to see if its finished waitChat or not.
6. Run with `nohup node server.js >> status.log 2>&1 &`. This command lets you run the server without staying connected and watching it closely.  You can store the log elsewhere by changing that part of the command.
7. Follow with `tail -f status.log`

- In case you need to cancel the hit, visit the `[HIT url]/god.html` page and press `cancel` to kill the process.