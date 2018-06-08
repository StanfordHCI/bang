Array.prototype.pick = function() { 
  let m = Math.random();
  return this[Math.floor(m * this.length)] };

const teamChecker = (rounds) => {  
    let collaborators = {}
    rounds.forEach(teams => { teams.forEach(team => { team.forEach(person => {
          let others = team.filter(member => member != person)
          if (person in collaborators) {
            others.forEach(member => { if (collaborators[person].includes(member)) {return false} })
          } else { collaborators[person] = [] } // make sure there's a array for that person
          collaborators[person].push(others) // add in collaborators form that team
    }) }) })
    return true
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const randomAnimal = 'Bison Eagle Pony Cow Deer Duck Rabit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Cat Dog'.split(" ")
const randomAdjective = 'new small young little likely nice cultured snappy spry conventional'.split(" ")

const createTeams = (teamSize, rounds, people) => {
    console.log(people.length != teamSize **2 ? "Wrong number of people" : "Building teams")
    console.log(teamSize > rounds.length+1 ? "Error" : "")

    let roundTeams = []
    let collaborators = {}
    people.forEach( person => { collaborators[person] = [person] })

    rounds.forEach(round => {       
      let unUsedPeople = people.slice()
      let teams = []
      
      while (unUsedPeople.length) {
        let team = []
        let currentPerson = unUsedPeople.pop()  
        team.push(currentPerson)
 
        while (team.length < teamSize) {  
          let teamCollaborators = team.map(member => collaborators[member] ).reduce((a,b) => a.concat(b) ).set() //find all prior collaborators
          let remainingOptions = unUsedPeople.filter(person => !teamCollaborators.includes(person) ) //find all remaining options
          if (!remainingOptions.length) { return createTeams(teamSize, rounds, people) }
          let newCollaborator = remainingOptions.pick()
          unUsedPeople = unUsedPeople.filter(person => person != newCollaborator ) //update unused people

          team.forEach(member => { //add all new collaborators both ways
            collaborators[member].push(newCollaborator)
            collaborators[newCollaborator].push(member)
          })
          team.push(newCollaborator) // add new collaborator into the team
        }
        teams.push(team)
      }
      roundTeams.push(teams) 
    })
    console.log("Built",teamChecker(roundTeams) ? "valid" : "NOT VALID","teams of",teamSize)
    return roundTeams
  }


module.exports = {
  letters: letters,
  createTeams: createTeams, 
  makeName: () => randomAdjective.pick() + randomAnimal.pick()
};