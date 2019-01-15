var chooseOne = function (list) {
    return list[Math.floor(Math.random() * list.length)];
};
var teamChecker = function (roundTeams) {
    var collaborators = {};
    roundTeams.forEach(function (teams) {
        Object.entries(teams).forEach(function (_a) {
            var teamName = _a[0], team = _a[1];
            team.forEach(function (person) {
                var others = team.filter(function (member) { return member != person; });
                if (person in collaborators) {
                    others.forEach(function (member) {
                        if (collaborators[person].includes(member)) {
                            return false;
                        }
                    });
                }
                else {
                    collaborators[person] = [];
                } // make sure there's a array for that person
                collaborators[person].push(others); // add in collaborators form that team
            });
        });
    });
    return true;
};
var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var randomAnimal = "Bison Eagle Pony Moose Deer Duck Rabbit Spider Wolf Lion Snake Shark Bird Bear Fish Horse Badger Marten Otter Lynx".split(" ");
var randomAdjective = "new small young little likely nice cultured snappy spry conventional".split(" ");
var nameCount = 2;
var createTeams = function (teamSize, numRounds, people) {
    //MEW: helper to convert sets without a type change because we need them.
    function set(array) {
        var setArray = [];
        array.forEach(function (element) {
            if (!setArray.includes(element)) {
                setArray.push(element);
            }
        });
        return setArray;
    }
    var realPeople = people.slice(0, Math.pow(teamSize, 2));
    if (people.length != Math.pow(teamSize, 2))
        throw "Wrong number of people.";
    if (teamSize > numRounds + 1)
        throw "Team size is too large for number of rounds.";
    var teamNames = letters.slice(0, teamSize);
    var roundTeams = [];
    var collaborators = {};
    realPeople.forEach(function (person) {
        collaborators[person] = [person];
    });
    console.log(realPeople);
    while (roundTeams.length < numRounds) {
        var unUsedPeople = realPeople.slice();
        var teams = {};
        var _loop_1 = function () {
            var team = [unUsedPeople.pop()]; // Add first person to team
            var _loop_2 = function () {
                var teamCollaborators = set(team
                    .map(function (member) { return collaborators[member]; })
                    .reduce(function (a, b) { return a.concat(b); })); //find all prior collaborators
                var remainingOptions = unUsedPeople.filter(function (person) { return !teamCollaborators.includes(person); }); //find all remaining options
                if (!remainingOptions.length) {
                    return { value: createTeams(teamSize, numRounds, realPeople) };
                } // deal with random selection overlap
                var newCollaborator = chooseOne(remainingOptions);
                unUsedPeople = unUsedPeople.filter(function (person) { return person != newCollaborator; }); //update unused people
                team.push(newCollaborator); // add new collaborator into the team
            };
            while (team.length < teamSize) {
                var state_2 = _loop_2();
                if (typeof state_2 === "object")
                    return state_2;
            }
            team.forEach(function (member) {
                collaborators[member] = set(collaborators[member].concat(team));
            }); //Add collaborators from new team
            teams[teamNames[Object.keys(teams).length]] = team; //Add new team
        };
        while (unUsedPeople.length) {
            var state_1 = _loop_1();
            if (typeof state_1 === "object")
                return state_1.value;
        }
        roundTeams.push(teams);
    }
    if (!teamChecker(roundTeams))
        throw "Valid teams were not created";
    return roundTeams;
};
module.exports = {
    chooseOne: chooseOne,
    letters: letters,
    createTeams: createTeams,
    makeName: function (teamSize, friends_history) {
        if (teamSize === void 0) { teamSize = null; }
        if (friends_history === void 0) { friends_history = null; }
        if (!friends_history) {
            var adjective = chooseOne(randomAdjective);
            var animal = chooseOne(randomAnimal);
            return { username: adjective + animal, parts: [adjective, animal] };
        }
        else {
            // friends history store previously seen names by the user
            // we want to avoid animal names
            // remove previously seen animal names
            var animals_1 = randomAnimal.slice();
            if (teamSize <= animals_1.length - friends_history.length) {
                //make sure there's enough adjectives
                var i = 0;
                for (i = 0; i < friends_history.length; i++) {
                    // make sure that teamSize * 3rounds < 17 (length of randomAnimals)
                    // we could throw an error message?
                    try {
                        animals_1.splice(animals_1.indexOf(friends_history[i][1]), 1);
                    }
                    catch (err) {
                        console.log("Problem with friend history:", friends_history, err);
                    }
                }
            }
            // MEW: need to generate a new array of combinations to return.
            return Array.apply(null, Array(teamSize)).map(function () {
                var adjective = chooseOne(randomAdjective);
                var animal = chooseOne(animals_1);
                animals_1.splice(animals_1.indexOf(animal), 1);
                return [adjective, animal];
            });
        }
    },
    randomAnimal: randomAnimal
};
