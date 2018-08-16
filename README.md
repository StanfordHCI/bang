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
ROUND_MINUTES=10
```

Then just run with `node server.js`.

## Checklist for running on MTurk (i.e. not emailing workers a link)
In server:

  Every time:
  
  6. const teamSize = process.env.TEAM_SIZE
  
  7. const roundMinutes = process.env.ROUND_MINUTES
  
  11/12. Set secondsToWait > secondsSinceResponse
  
  13. Set secondsToHold1 at roughly 1000
  
  14. Set secondsToHold2 at roughly 200
  
  17. runExperimentNow = true
  
  18. issueBonusesNow = true
  
  19. emailingWorkers = true

  20. usingWillBang = true
  
  21. cleanHITs = false
  
  22. assignQualifications = true
  
  32. waitChatOn = true
  
  39. timeCheckOn = true
  
  40. requiredOn = true
  
  Choices:
  
  25. suddenDeath
  
  33. psychologicalSafetyOn
  
  35. midSurveyOn
  
  36. blacklistOn
  
  37. teamfeedbackOn
  
In client:

  11. waitChatOn = true

In .env:

  RUNNING_LIVE = TRUE
  
  RUNNING_LOCAL = FALSE
  
  TEAM_SIZE = whatever we want team size
  
  ROUND_MINUTES = whatever we want round minutes
  
  Make sure it's team size and not (team size)^2
  
  



## Checklist for emailing a link
In server:

  Every time:
  
  6. const teamSize = process.env.TEAM_SIZE
  
  7. const roundMinutes = process.env.ROUND_MINUTES
  
  11/12. Set secondsToWait > secondsSinceResponse
  
  13. Set secondsToHold1 at roughly 1000
  
  14. Set secondsToHold2 at roughly 200
  
  17. runExperimentNow = true
  
  18. issueBonusesNow = true
  
  19. emailingWorkers = true
  
  21. cleanHITs = false
  
  22. assignQualifications = true
  
  32. waitChatOn = true
  
  39. timeCheckOn = true
  
  40. requiredOn = true
  
  Choices:
  
  25. suddenDeath
  
  33. psychologicalSafetyOn
  
  35. midSurveyOn
  
  36. blacklistOn
  
  37. teamfeedbackOn
  
In client:

  11. waitChatOn = true

In .env:

  RUNNING_LIVE = FALSE
  
  RUNNING_LOCAL = FALSE
  
  TEAM_SIZE = whatever we want team size
  
  ROUND_MINUTES = whatever we want round minutes
  
  Make sure it's team size and not (team size)^2
  
  




## Related literature
1. Salganik, Matthew J., Peter Sheridan Dodds, and Duncan J. Watts. **[Experimental study of inequality and unpredictability in an artificial cultural market](http://science.sciencemag.org/content/311/5762/854.full)**. Science 311.5762 (2006): 854-856.
2. Mao A, Mason W, Suri S, Watts DJ (2016) **[An Experimental Study of Team Size and Performance on a Complex Task](http://journals.plos.org/plosone/article?id=10.1371/journal.pone.0153048)**. PLOS ONE 11(4): e0153048. https://doi.org/10.1371/journal.pone.0153048
3. Ross, L., & Nisbett, R. E. (2011). **The person and the situation: Perspectives of social psychology**. Pinter & Martin Publishers.
