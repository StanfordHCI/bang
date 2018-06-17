
// filter on condition 
teams[conditions[currentCondition][currentRound] - 1].forEach(team => {
          let hidden = currentCondition == "treatment" && currentRound == rounds.length-1
          console.log("Running", team, hidden ? "concealed" : "normal")
          if (hidden) { } //Modify names inside
          //Run experiment
        });



// Text users
let mturkID = "this"
let room = "that"

console.log(users)
users = [{
          'id': 1,
          'mturk': mturkID,
          'room': room,
          'person': people.pop(),
          'name': "Mark",
          'ready': false,
          'friends': [{'id': 2, 
                      'alias': "James", 
                      'tAlias':"Treatment James" }],
          'active': true
        },
        {
          'id': 2,
          'mturk': mturkID,
          'room': room,
          'person': people.pop(),
          'name': "Bill",
          'ready': false,
          'friends': [{'id': 1, 
                      'alias': "Matt", 
                      'tAlias':"Treatment Matt" }],
          'active': true
        }]

console.log(idToAlias(users[0],"Hi 2, 2, 1."))