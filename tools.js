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
const randomAnimal = 'Bison Eagle Pony Cow Deer Duck Rabbit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Cat Dog'.split(" ")
const randomAdjective = 'new small young little likely nice cultured snappy spry conventional'.split(" ")
let nameCount = 2

const createTeams = (teamSize, numRounds, people) => {
    console.log(people.length != teamSize **2 ? "Wrong number of people" : "Building teams")
    console.log(teamSize > numRounds+1 ? "Error" : "")
    const teamNames = letters.slice(0,teamSize)

    let roundTeams = []
    let collaborators = {}
    people.forEach( person => { collaborators[person] = [person] })

    while (roundTeams.length < numRounds) {
      let unUsedPeople = people.slice()
      let teams = {}

      while (unUsedPeople.length) {
        let team = [unUsedPeople.pop()] // Add first person to team
        while (team.length < teamSize) {
          let teamCollaborators = team.map(member => collaborators[member]).reduce((a,b) => a.concat(b) ).set() //find all prior collaborators
          let remainingOptions = unUsedPeople.filter(person => !teamCollaborators.includes(person) ) //find all remaining options
          if (!remainingOptions.length) { return createTeams(teamSize, numRounds, people) } // deal with random selection overlap
          let newCollaborator = remainingOptions.pick()
          unUsedPeople = unUsedPeople.filter(person => person != newCollaborator ) //update unused people

          team.push(newCollaborator) // add new collaborator into the team
        }

        team.forEach(member => { collaborators[member] = collaborators[member].concat(team).set() }) //Add collaborators from new team
        teams[teamNames[Object.keys(teams).length]] = team //Add new team
      }
      roundTeams.push(teams)
    }

    if(!teamChecker(roundTeams)){console.log("teams not valid")}
    return roundTeams
  }


module.exports = {
  letters: letters,
  createTeams: createTeams,
  makeName: () => {
    // nameCount += 1
    // return randomAdjective[randomAdjective.length % nameCount] + randomAnimal[randomAnimal.length % nameCount]
    return randomAdjective.pick() + randomAnimal.pick()
  },
  randomAnimal: randomAnimal
};
