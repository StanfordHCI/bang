# Bang!

Bang is a tool to study the consistency of socio-psychological phenomenon by running within subjects studies on groups. Bang uses pseudonyms to see what happens when people work in the same groups when they think they're working in new ones.

Find out more and how to use it at the (Bang wiki)[https://github.com/StanfordHCI/bang/wiki]. 

## Specification

Bang has the following core functionality:

Get workers registered to do our task
Recruit workers via a waiting room
Run the chat client with tasks and surveys included
Pay bonuses to completed workers
These will be explained in more detail below:

### Registration

A HIT that runs every hour will allow workers to sign up to be notified of experimental runs in the future. This HIT is low price, $0.01 reward, and adds the workers who complete it to our willBang qualification list. This HIT also includes our IRB. Currently these features are set up in scheduleBang.ts.

### Recruiting

When we start an experiment we need TEAM_SIZE(from the .env file) squared participants to be active in the waitChat before we can start the experiment. This recruiting process initially notifies our willBang list and optionally makes the HIT available to other workers on MTurk. During recruiting if participants are not active in waitChat we remove them and pay them a nominal participation fee. Once there are enough active workers we remove their willBang qualification and add the hasBanged qualification, which makes it impossible for them to work on our experiments again. Also at this time, we usually notify ourselves that the experiment has launched.

waitChatOn controls if a chatbot should be shown before the main task starts. This is designed so that the participants can stay engaged through the chat interaction and we can make sure they are present. For example, when participants don't respond to the chat bot for a certain time period we no longer consider them active. Note: waitChatOn exists in server.js and public/client.js and needs to have the same value in both places to work as designed.

### Running the experiment

The experiment works by generating several chat rooms, each of TEAM_SIZE people, and letting them work together for ROUND_MINUTES before being moved into another activity. The activity cycle includes the following steps:

pre experiment activities
chat activities (happens for each round)
pre chat activities
chat
post chat activities
post experiment activities
There are usually several rounds of chats and critically, some are with prior teams and some are with random teams. We can can control and randomize when this happens. The user names of each individual are randomized with makeName from tools.ts and the team configurations are governed by createTeams in the same file.

We are moving toward a model where bang can be run with a variety of tasks and activities outlined in an external file, so as to make it easier to run different types of experiments.

### Paying

At the end of the task, we provide bonuses to our workers and follow up with any who experienced errors. This currently happens at the start of the next round of the experiment or on a cron script.
