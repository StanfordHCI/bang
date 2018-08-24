Array.prototype.pick = function() { return this[Math.floor(Math.random() * this.length)] };

const teamChecker = (roundTeams) => {
    let collaborators = {}
    roundTeams.forEach(teams => { Object.entries(teams).forEach(([teamName,team]) => { team.forEach(person => {
          let others = team.filter(member => member != person)
          if (person in collaborators) {
            others.forEach(member => { if (collaborators[person].includes(member)) {return false} })
          } else { collaborators[person] = [] } // make sure there's a array for that person
          collaborators[person].push(others) // add in collaborators form that team
    }) }) })
    return true
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const randomAnimal = 'Bison Eagle Pony Moose Deer Duck Rabbit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Badger Marten Otter Lynx'.split(" ")
const randomAdjective = 'new small young little likely nice cultured snappy spry conventional'.split(" ")
let nameCount = 2



const createTeams = (teamSize, numRounds, people, extraRoundOn) => {

    realPeople = people.slice(0, teamSize ** 2) //working here
    console.log(!extraRoundOn && people.length != teamSize **2 ? "Can't create teams. Wrong number of people" : "Building teams")
    console.log(teamSize > numRounds+1 ? "Error" : "")
    const teamNames = letters.slice(0,teamSize)

    let roundTeams = []
    let collaborators = {}
    realPeople.forEach( person => { collaborators[person] = [person] })

    console.log(realPeople)

    while (roundTeams.length < numRounds) {
      let unUsedPeople = realPeople.slice()
      let teams = {}

      while (unUsedPeople.length) {
        let team = [unUsedPeople.pop()] // Add first person to team
        while (team.length < teamSize) {
          let teamCollaborators = team.map(member => collaborators[member]).reduce((a,b) => a.concat(b) ).set() //find all prior collaborators
          let remainingOptions = unUsedPeople.filter(person => !teamCollaborators.includes(person) ) //find all remaining options
          if (!remainingOptions.length) { return createTeams(teamSize, numRounds, realPeople, extraRoundOn) } // deal with random selection overlap
          let newCollaborator = remainingOptions.pick()
          unUsedPeople = unUsedPeople.filter(person => person != newCollaborator ) //update unused people

          team.push(newCollaborator) // add new collaborator into the team
        }

        team.forEach(member => { collaborators[member] = collaborators[member].concat(team).set() }) //Add collaborators from new team
        teams[teamNames[Object.keys(teams).length]] = team //Add new team
      }
      //console.log(teams)
      roundTeams.push(teams)
    }

    if(!teamChecker(roundTeams)){console.log("teams not valid")}
    if(extraRoundOn) { //couldn't get this to work generically with letters[]
      for (i = 0; i < teamSize; i++) {
        //console.log(roundTeams)
        roundTeams[0][letters[i]].push(letters[teamSize**2 + i])
      }
    }
    console.log(roundTeams)
    return roundTeams
  }

const hardcodedTeams = (people) => {
  teams = createTeams(2, 4, people, false)
  return teams
}

module.exports = {
  letters: letters,
  createTeams: createTeams,
  makeName: function(teamSize = null, friends_history = null) {
    if (!friends_history) {
      let adjective = randomAdjective.pick()
      let animal = randomAnimal.pick()
      return {username: adjective + animal, parts: [adjective, animal]}
    } else {
      // friends history store previously seen names by the user
      // we want to avoid animal names

      // remove previously seen animal names
      let animals = randomAnimal.slice();
      if (teamSize <= animals.length - friends_history.length) { //make sure there's enough adjectives
        for (i = 0; i < friends_history.length; i++) {
          // make sure that teamSize * 3rounds < 17 (length of randomAnimals)
          // we could throw an error message?
          animals.splice(animals.indexOf(friends_history[i][1]), 1)
        }
      }
      // Pick from remaining names
      return [...Array(teamSize).keys()].map(i => {
        adjective = randomAdjective.pick();
        animal = animals.pick();
        animals.splice(animals.indexOf(animal), 1);
        return [adjective, animal];
      });
    }
  },
  randomAnimal: randomAnimal
};
