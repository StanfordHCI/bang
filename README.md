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

Replace the keys with your own (see a  [tutorial on getting set up with keys](https://glitch.com/edit/#!/mturk)). Then just run with `node server.js`.

## Related literature
1. Salganik, Matthew J., Peter Sheridan Dodds, and Duncan J. Watts. **[Experimental study of inequality and unpredictability in an artificial cultural market](http://science.sciencemag.org/content/311/5762/854.full)**. Science 311.5762 (2006): 854-856.
2. Mao A, Mason W, Suri S, Watts DJ (2016) **[An Experimental Study of Team Size and Performance on a Complex Task](http://journals.plos.org/plosone/article?id=10.1371/journal.pone.0153048)**. PLOS ONE 11(4): e0153048. https://doi.org/10.1371/journal.pone.0153048
3. Ross, L., & Nisbett, R. E. (2011). **The person and the situation: Perspectives of social psychology**. Pinter & Martin Publishers.
