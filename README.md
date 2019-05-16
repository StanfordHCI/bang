# Bang!

Bang is a tool to study the consistency of socio-psychological phenomenon by running within subjects studies on groups. Bang uses pseudonyms to see what happens when people work in the same groups when they think they're working in new ones.

## Getting started

1. Clone the repository then run `npm install` in the github directory to get all the dependencies.
2. Make sure you're set up to use the MTurk API. I have a [intro](https://glitch.com/edit/#!/mturk) that will get you started.
3. Add an `.env` with the following content:

```PowerShell
AWS_ID=YOUR_AWS_MTURK_ID
AWS_KEY=YOUR_AWS_MTURK_KEY
TEAM_SIZE=4
ROUND_MINUTES=10
NODE_ENV=development/production //var for setup front build and etc, not for mturk
API_HOST=your host
MONGO_URI=your mongo connect uri
ADMIN_TOKEN=your admin token
WILL_BANG_QUAL=will bang qual id from mturk
HAS_BANGED_QUAL=has banged qual id from mturk
MTURK_FRAME=ON/OFF //OFF - launch experiment without main HIT, just with site; if ON - inside mturk frame, with main HIT.
HIT_URL=http://localhost:3000/ or https://bang-dev.deliveryweb.ru/, url for mturk mail when FRAME=OFF
MTURK_MODE=test/prod ; DANGEROUS: if 'prod', it uses real mturk account; if no - sandbox.
```

4. Set up mongodb (ver. 4.0)
5. Start the server (port 3001) by running `node built/index.js`. 
6. Build front in prod mode by `npm run build-front` and use /front/build/ as static folder or
Start dev front-server with hot reload by `npm run start-front` (port 3000)

## Source/etc files
All server code - /server; 
All front code - /front/src, /front/public; 
Front building utils - /front/scripts, /front/config;
Built front code - /front/build;
Built server code - /built; 

## Developing

Run `tsc` to watch typescript files for changes and `supervisor server/index.js` so that the server will restart when files in the github folder are changed.

The URL parameters are required because they are read in from Amazon Mechanical Turk. Here's an example URL for local host: http://127.0.0.1:3000/?assignmentId=3K4J6M3CXF8DU3JZ8XUVEMJHFWEAGV&hitId=3TRB893CSJPTPHN7BSD9FBMB45DG72&workerId=A19MTSLG2OYDLZ&turkSubmitTo=https%3A%2F%2Fworkersandbox.mturk.com

## Specification

Bang has the following core functionality:  

1. Get workers registered to do our task
2. Recruit workers via a waiting room
3. Run the chat client with tasks and surveys included
4. Pay bonuses to completed workers

These will be explained in more detail below:

### Registration

A HIT that runs every hour will allow workers to sign up to be notified of experimental runs in the future. This HIT is low price, `$0.01` reward, and adds the workers who complete it to our `willBang` qualification list. This HIT also includes our IRB. Currently these features are set up in `scheduleBang.ts`. 

### Recruiting

When we start an experiment we need `TEAM_SIZE`(from the `.env` file) squared participants to be active in the `waitChat` before we can start the experiment. This recruiting process initially notifies our `willBang` list and optionally makes the HIT available to other workers on MTurk. During recruiting if participants are not active in `waitChat` we remove them and pay them a nominal participation fee. Once there are enough active workers we remove their `willBang` qualification and add the `hasBanged` qualification, which makes it impossible for them to work on our experiments again. Also at this time, we usually notify ourselves that the experiment has launched.

`waitChatOn` controls if a chatbot should be shown before the main task starts. This is designed so that the participants can stay engaged through the chat interaction and we can make sure they are present. For example, when participants don't respond to the chat bot for a certain time period we no longer consider them active.
Note: `waitChatOn` exists  in `server.js` and `public/client.js` and needs to have the same value in both places to work as designed.

### Running the experiment

The experiment works by generating several chat rooms, each of `TEAM_SIZE` people, and letting them work together for `ROUND_MINUTES` before being moved into another activity. The activity cycle includes the following steps: 

1. pre experiment activities
2. chat activities (happens for each round)
   1. pre chat activities
   2. chat
   3. post chat activities
3. post experiment activities

There are usually several rounds of chats and critically, some are with prior teams and some are with random teams. We can can control and randomize when this happens. The user names of each individual are randomized with `makeName` from `tools.ts` and the team configurations are governed by `createTeams` in the same file.

We are moving toward a model where bang can be run with a variety of tasks and activities outlined in an external file, so as to make it easier to run different types of experiments.

### Paying

At the end of the task, we provide bonuses to our workers and follow up with any who experienced errors. This currently happens at the start  of the next round of the experiment or on a cron script.

### System workflow
To achieve admin’s access you need to add following keys into the Local Storage:
bang-token: admin id
bang-admin-token:  (value ADMIN_TOKEN from the .env file)

	List of the links which are available only for admin user:
/templates
/templates-add
/batches
/batches-add

For now application works only in Mturk sandbox. To test application you need at least 4 Mturk workers in the sandbox. 

inside frame, MTURK_FRAME=ON

    For start experiment you need to add new batch at the /batches-add page. After that in will have “waiting” status and server will start posting qualification HITs every 4 minutes. Qualification HITs’ lifetime is 250 sec. 
Link for the qualification HIT’s task is /accept. Here you can see /old/questions.html from the server (all other pages are React’s static) - all works through nginx. 
All people which are ready with the qualification HIT achieve willBang qualification on Mturk and get email invite to the main task in Mturk (experiment workflow via frame). 
When in the waiting room there’re enough participants, for now four people are required, they get ability to join the batch. After enough people are joined batch experiment automatically starts. 
As experiment is started all joined participants get start bonus, for now it’s $1.01, and achieve hasBanged qualification on Mturk. 
From now those participants can’t see our Mturk’s task anymore. After final survey is completed by participant he/she achieve remaining part of his bonus on the basis of $12 per hour. For the last step server delete main task on Mturk.
After it, if you wanna use your users again, you should clear their qualifications (‘test’ script in /index.ts, for example)and you should delete them from db.

without frame, MTURK_FRAME=OFF
For start experiment you need to add new batch at the /batches-add page. After that in will have “waiting” status and server will start posting qualification HITs every 4 minutes. Qualification HITs’ lifetime is 250 sec. 
All people which are ready with the qualification HIT achieve willBang qualification on Mturk and get email invite to the main task in our site. 
When in the waiting room there’re enough participants, for now four people are required, they get ability to join the batch. After enough people are joined batch experiment automatically starts. 
As experiment is started all joined participants get start bonus, for now it’s $1.01, and achieve hasBanged qualification on Mturk. 
From now those participants can’t see our Mturk’s task anymore. After final survey is completed by participant he/she achieve remaining part of his bonus on the basis of $12 per hour..
After it, if you wanna use your users again, you should clear their qualifications (‘test’ script in /index.ts, for example)and you should delete them from db.