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
const randomAnimal = 'Bison Eagle Pony Cow Deer Duck Rabit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Cat Dog'.split(" ").pick()
const randomAdjective = 'new small young little likely nice cultured snappy spry conventional'.split(" ").pick() 



module.exports = {
  letters: letters,
  createTeams: (teamSize, rounds, people = letters.slice(0,teamSize**2)) => {
    console.log(people.length != teamSize **2 ? "Wrong number of people" : "Building teams")
    // if ((teamSize + 1) > rounds.length) {
    //   console.log("error: need to update createTeams for this size configuration")
    //   return
    // }

    let roundTeams = []
    let collaborators = {}
    people.forEach( person => { collaborators[person] = [] })

    rounds.forEach(round => { 
      console.log(round);
      
      let unUsedPeople = people.slice()
      let teams = []
      //console.log(unUsedPeople);
      while (unUsedPeople.length) {
        //console.log(unUsedPeople); 
        let team = []
        let currentPerson = unUsedPeople.pop()  
        team.push(currentPerson)
 
        while (team.length < teamSize) {
          
          // people themselves are never added to teamCollaborators
          /*
          let teamCollaborators = team.map(member => collaborators[member] ).reduce((a,b) => a.concat(b) ).set() //find all prior collaborators
          let remainingOptions = unUsedPeople.filter(person => !teamCollaborators.includes(person) ) //find all remaining options
          let newCollaborator = remainingOptions.pick()
          unUsedPeople = unUsedPeople.filter(person => person != newCollaborator ) //update unused people
          */
          
          let teamCollaborators = team.map(member => collaborators[member] ).reduce((a,b) => a.concat(b) ).set();          
          
          //if(!teamCollaborators.includes(person)){
          //}
          team.forEach(member => { //add all new collaborators both ways
            //collaborators[member].push(newCollaborator)
            //collaborators[newCollaborator].push(member)
          })
          ///eam.push(newCollaborator) // add new collaborator into the team
        }
        teams.push(team)
      }
      roundTeams.push(teams) 
    })
    // console.log(collaborators)
    console.log("Built",teamChecker(roundTeams) ? "valid" : "NOT VALID","teams of",teamSize)
    return roundTeams
  }, 
  makeName: () => randomAdjective + randomAnimal
};