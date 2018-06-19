# Team fracture

## Literature
1. Salganik, Matthew J., Peter Sheridan Dodds, and Duncan J. Watts. **[Experimental study of inequality and unpredictability in an artificial cultural market](http://science.sciencemag.org/content/311/5762/854.full)**. Science 311.5762 (2006): 854-856.
2. Mao A, Mason W, Suri S, Watts DJ (2016) **[An Experimental Study of Team Size and Performance on a Complex Task](http://journals.plos.org/plosone/article?id=10.1371/journal.pone.0153048)**. PLOS ONE 11(4): e0153048. https://doi.org/10.1371/journal.pone.0153048
3. Ross, L., & Nisbett, R. E. (2011). **The person and the situation: Perspectives of social psychology**. Pinter & Martin Publishers.

## Conditions

| | Truth | Deception | 
|--|:-:|:-:|
| **Reset** | ? | treatment |
| **Same** | control | ? |

Do you know who you are and who others are?
Are teams persistent or different?

## Activities

1. Surveys: pre and post emotional baselines. Team viability
2. Training: to a point of negligible improvement in individual and team tasks.
3. Team tasks: game, task, negotiation, discussion


## Taks

- [x] Set up basic chat room
- [x] Build name deception - hiding any one member’s name from other members
- [x] Build cohorts - creating independent rooms that are simultaneous
- [x] Set condition [from URL](https://stackoverflow.com/a/16274116/1857095)
- [x] Implement notifications to bring users back to platform

- [x] Add persistent db - use [NeDB](https://github.com/louischatriot/nedb/)  and perhaps MongoDB later if needed.
- [ ] Build pre and post survey instruments
  - start with post survey
  - load survey questions from teams table for each user
  - send survey responses to server
  - new routing
- [ ] Build activities
- [ ] Build auto login
- [ ] Build forced state mentions
  - share users in room with all clients
  - force user like statements to be completed with a current username
- [ ] Integrate [MTurk API](https://blog.mturk.com/tutorial-getting-started-with-mturk-and-node-js-72826ad6e002)
- [ ] Explore stronger waiting room with [LegionTools](http://rochci.github.io/LegionTools/)

# Terms
teams
rooms

# Activities: 
- Length - 1 hour?
- Rests - same time next day?
- Team size - 
- Tasks {
  - Google ads
  - Codewords
  - Collaborative typing
  - Desert survival
  - Incredible machine (how might we share display)
  - Youtube ads
  - Shopping cart -> design one and see how well it works
  - Moocs
 }
 
# Steps
1. Users load in Mturk **how?**
2. Users choose task
3. Users see actual task frontpage where:

  - they are registered to us from MTurk **how?**
  - they have an assigned username that stays the same the entire time
  - they have given permission for notifications

4. Users do pretasks if needed
5. Users wait for others in the waiting room
6. Users do activities
7. Users do follow up tasks and take a break
8. Users repeate until done
9. Users do closing tasks
10. Users are done and can close the task **how?**

## Questions
1. How do I make a page that loads right for MTurk and does not let people start early?
2. How do I get the right info from MTurk about the current user?
3. How do I make sure the task is done right and let the user close out from the MTurk standpoint?