const chooseOne = <T>(list: T[]): T => {
  return list[Math.floor(Math.random() * list.length)];
};

const teamChecker = roundTeams => {
  let collaborators = {};
  roundTeams.forEach(teams => {
    Object.entries(teams).forEach(([teamName, team]: [string, string[]]) => {
      team.forEach((person: string) => {
        let others = team.filter(member => member != person);
        if (person in collaborators) {
          others.forEach(member => {
            if (collaborators[person].includes(member)) {
              return false;
            }
          });
        } else {
          collaborators[person] = [];
        } // make sure there's a array for that person
        collaborators[person].push(others); // add in collaborators form that team
      });
    });
  });
  return true;
};

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const randomAnimal = "Bison Eagle Pony Moose Deer Duck Rabbit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Badger Marten Otter Lynx".split(
  " "
);
const randomAdjective = "new small young little likely nice cultured snappy spry conventional".split(
  " "
);
let nameCount = 2;

const createTeams = (teamSize: number, numRounds: number, people: string[]) => {
  //MEW: helper to convert sets without a type change because we need them.
  function set(array: any[]) {
    const setArray = [];
    array.forEach(element => {
      if (!setArray.includes(element)) {
        setArray.push(element);
      }
    });
    return setArray;
  }
  let realPeople = people.slice(0, teamSize ** 2);
  if (people.length != teamSize ** 2) throw "Wrong number of people.";
  if (teamSize > numRounds + 1)
    throw "Team size is too large for number of rounds.";
  const teamNames = letters.slice(0, teamSize);

  let roundTeams = [];
  let collaborators = {};
  realPeople.forEach(person => {
    collaborators[person] = [person];
  });

  while (roundTeams.length < numRounds) {
    let unUsedPeople = realPeople.slice();
    let teams = {};

    while (unUsedPeople.length) {
      let team = [unUsedPeople.pop()]; // Add first person to team
      while (team.length < teamSize) {
        let teamCollaborators = set(
          team
            .map(member => collaborators[member])
            .reduce((a, b) => a.concat(b))
        ); //find all prior collaborators
        let remainingOptions = unUsedPeople.filter(
          person => !teamCollaborators.includes(person)
        ); //find all remaining options
        if (!remainingOptions.length) {
          return createTeams(teamSize, numRounds, realPeople);
        } // deal with random selection overlap
        let newCollaborator = chooseOne(remainingOptions);
        unUsedPeople = unUsedPeople.filter(person => person != newCollaborator); //update unused people

        team.push(newCollaborator); // add new collaborator into the team
      }

      team.forEach(member => {
        collaborators[member] = set(collaborators[member].concat(team));
      }); //Add collaborators from new team
      teams[teamNames[Object.keys(teams).length]] = team; //Add new team
    }
    roundTeams.push(teams);
  }

  if (!teamChecker(roundTeams)) throw "Valid teams were not created";
  return roundTeams;
};

module.exports = {
  chooseOne: chooseOne,
  letters: letters,
  createTeams: createTeams,
  makeName: function(teamSize = null, friends_history = null) {
    if (!friends_history) {
      let adjective = chooseOne(randomAdjective);
      let animal = chooseOne(randomAnimal);
      return { username: adjective + animal, parts: [adjective, animal] };
    } else {
      // friends history store previously seen names by the user
      // we want to avoid animal names

      // remove previously seen animal names
      let animals = randomAnimal.slice();
      if (teamSize <= animals.length - friends_history.length) {
        //make sure there's enough adjectives
        let i = 0;
        for (i = 0; i < friends_history.length; i++) {
          // make sure that teamSize * 3rounds < 17 (length of randomAnimals)
          // we could throw an error message?
          try {
            animals.splice(animals.indexOf(friends_history[i][1]), 1);
          } catch (err) {
            console.log("Problem with friend history:", friends_history, err);
          }
        }
      }
      // MEW: need to generate a new array of combinations to return.
      return Array.apply(null, Array(teamSize)).map(() => {
        let adjective = chooseOne(randomAdjective);
        let animal = chooseOne(animals);
        animals.splice(animals.indexOf(animal), 1);
        return [adjective, animal];
      });
    }
  },
  randomAnimal: randomAnimal
};
