# Bang!

Bang is a tool to study the consistency of socio-psychological phenomenon by running within subjects studies on groups. Bang uses pseudonyms to see what happens when people work in the same groups when they think they're working in new ones.

Find out more and how to use it at the [Bang wiki](https://github.com/StanfordHCI/bang/wiki). 

## Specification

Bang has the following core functionality:

- Get workers registered to do our task
- Recruit workers via a waiting room
- Run the chat client with tasks and surveys included
- Pay bonuses to completed workers

These will be explained in more detail below:

### Registration

A HIT that runs every hour will allow workers to sign up to be notified of experimental runs in the future. This HIT is low price, $0.01 reward, and adds the workers who complete it to our willBang qualification list. This HIT also includes our IRB. Currently these features are set up in scheduleBang.ts.

### Recruiting

When we start an experiment we need TEAM_SIZE(from the .env file) squared participants to be active in the waitChat before we can start the experiment. This recruiting process initially notifies our willBang list and optionally makes the HIT available to other workers on MTurk. During recruiting if participants are not active in waitChat we remove them and pay them a nominal participation fee. Once there are enough active workers we remove their willBang qualification and add the hasBanged qualification, which makes it impossible for them to work on our experiments again. Also at this time, we usually notify ourselves that the experiment has launched.

waitChatOn controls if a chatbot should be shown before the main task starts. This is designed so that the participants can stay engaged through the chat interaction and we can make sure they are present. For example, when participants don't respond to the chat bot for a certain time period we no longer consider them active. Note: waitChatOn exists in server.js and public/client.js and needs to have the same value in both places to work as designed.

### Running the experiment

The experiment works by generating several chat rooms, each of TEAM_SIZE people, and letting them work together for ROUND_MINUTES before being moved into another activity. The activity cycle includes the following steps:

- pre experiment activities
- chat activities (happens for each round)
- pre chat activities
- chat
- post chat activities
- post experiment activities

There are usually several rounds of chats and critically, some are with prior teams and some are with random teams. We can can control and randomize when this happens. The user names of each individual are randomized with makeName from tools.ts and the team configurations are governed by createTeams in the same file.

We are moving toward a model where bang can be run with a variety of tasks and activities outlined in an external file, so as to make it easier to run different types of experiments.

### Paying

At the end of the task, we provide bonuses to our workers and follow up with any who experienced errors. This currently happens at the start of the next round of the experiment or on a cron script.

## Getting Started Tips

- Development Tips:
  - Make, commit, and push changes from the `nokill` branch
- Testing Tips:
  - Turn off waiting room by going to `public/client.js` and `server.js` and set const `waitChaton` to `false`
  - Set `TEAM_SIZE=1` (int must be a perfect square) and `ROUND_MINUTES=1` (or smaller value) to efficiently test
  - To test larger team sizes, change the Worker ID in the URL. A list of 26 different Worker URL's [may be found here](https://docs.google.com/document/d/e/2PACX-1vRKrF6XJ-LUGyuumUiAyXc2mLOwPdhivliMadUKXqK_a92_vmV_9jaBxhtst3BSqK_BdtCdlZHd5VfC/pub).

## Running Live Steps
1. SSH into server. Currently we are using ubuntu@c01.dmorina.com: 
  ```PowerShell
  ssh -i ~/.ssh/sh-batch.pem ubuntu@c01.dmorina.com
  ```
2. cd into the folder you'll be working in (check for one no one else is using)
3. Double check that the switches in the top of `server.js` and `public/client.js` are correct. Specifically:
    - Check that the surveys you want are `true`
    - waitChatOn is `true` in both files
4. Adjust `.env` to reflect the group size and task duration you want.
    - Right now running larger than 4 and longer than 10 minutes per task are not reliable
    - Critically `RUNNING_LIVE=TRUE` and `RUNNING_LOCAL=FALSE` will be the settings you need for launching live HITs.
    - Switching `RUNNING_LIVE=FALSE` tests in the sandbox. Other settings in that file should not need to be adjusted.
5. Check to see if anyone else is running. Start by doing `ps -ax | grep -i node` which will tell you if there are any other node processes running. Its fine to run at the same time as others, BUT, we don't like to start new HITs while another one is still in waitChat. So if you do see another task running, try to check in to see if its finished waitChat or not.
6. Run with:
```PowerShell
nohup node server.js >> status.log 2>&1 &
```
This command lets you run the server without staying connected and watching it closely.  You can store the log elsewhere by changing that part of the command.
7. Follow with `tail -f status.log`
8. If you need to cancel the hit:
    - visit the `[HIT url]/god.html` page and press `cancel` to kill the process.
    - terminate the node process via: 
