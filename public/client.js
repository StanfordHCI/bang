$(function() {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = ['#e21400', '#91580f', '#f8a700', '#f78b00', '#58dc00', '#287b00', '#a8f07a', '#4ae8c4', '#3b88eb', '#3824aa', '#a700ff', '#d300e7'];
  // Initialize variables
  const $window = $(window);
  const $messages = $('.messages'); // Messages area
  const $inputMessage = $('.inputMessage'); // Input message input box
  const $checkinPopup = $('#checkin');
  const $headerBar = $('.header')
  const $headerText = $('#header-text')
  const $leaveHitButton = $('#leave-hit-button')
  const $leaveHitPopup = $('#leave-hit-popup')

  const $chatLink = $('#chatLink');
  const $headerbarPage = $('#headerbarPage'); // The finishing page
  const $lockPage = $('#lockPage'); // The page shown before acceptance
  const $waitingPage = $('#waiting'); // The waiting page
  const $chatPage = $('#chat'); // The chatroom page
  const $holdingPage = $('#holding'); // The holding page
  const $preSurvey = $('#preSurvey'); // The preSurvey page
  const $starterSurvey = $('#starterSurvey'); // The starterSurvey page
  const $midSurvey = $('#midSurvey'); // the midSurvey page
  const $psychologicalSafety = $('#psychologicalSafety'); // the psych safety page
  const $postSurvey = $('#postSurvey'); // The postSurvey page
  const $blacklistSurvey = $('#blacklistSurvey'); // The blacklist page
  const $teamfeedbackSurvey = $('#teamfeedbackSurvey'); // Feedback for team page
  const $groupPerformance = $('#groupPerformance'); // Feedback for team page
  const $finishingPage = $('#finishing'); // The finishing page


  Vue.component('question-component', {
    template: `
      <h3>{{question.question}}</h3>
      <div id="{{question.name}}-rb-box" class='rb-box'>
        <template v-for="(index, answer) in question.answers" :answer="answer">
          <label for="{{question.name}}-{{index+1}}" class="rb-tab">
            <input v-bind:type="question.answerType" name="{{question.name}}" id="{{question.name}}-{{index+1}}" v-bind:value="question.textValue ? answer : index + 1" v-bind:required="question.required ? true : false"/>
            <span class='rb-spot'>{{index+1}}</span>
            <label for='{{question.name}}-{{index+1}}'>{{answer}}</label>
          </label>
        </template>
      </div>
    `,
    props: {
      question: Object
    }
  });

  const hideAll = () => {
    $headerbarPage.hide()
    $checkinPopup.hide();
    $leaveHitPopup.hide()
    $lockPage.hide();
    $waitingPage.hide();
    $chatPage.hide();
    $holdingPage.hide();
    $preSurvey.hide();
    $starterSurvey.hide();
    $midSurvey.hide();
    $psychologicalSafety.hide();
    $postSurvey.hide();
    $blacklistSurvey.hide();
    $teamfeedbackSurvey.hide();
    $finishingPage.hide();
    $chatLink.hide();
    $groupPerformance.hide(); 
}

  let holdingUsername = document.getElementById('username');
  let messagesSafe = document.getElementsByClassName('messages')[0];
  let finishingcode = document.getElementById('finishingcode');
  let usersWaiting = document.getElementById('numberwaiting');
  let mturkVariables

  const $preSurveyQuestions = $('.preSurveyQuestions'); //pre survey
  const $psychologicalSafetyQuestions = $('.psychologicalSafetyQuestions'); //pre survey
  const $midSurveyQuestions = $('.midSurveyQuestions'); // mid survey
  const $postSurveyQuestions = $('.postSurveyQuestions'); //post survey
  const $groupPerformance = $('.groupPerformanceQuestions'); //post survey

  const socket = io();

  hideAll();

  //Check if user has accepted based on URL. Store URL variables.
  const URLvars = getUrlVars(location.href)
  if (URLvars.assignmentId == "ASSIGNMENT_ID_NOT_AVAILABLE") {
    $lockPage.show(); //prompt user to accept HIT
  } else { // tell the server that the user has accepted the HIT - server then adds this worker to array of accepted workers
    $waitingPage.show();
    mturkVariables = { mturkId: URLvars.workerId, turkSubmitTo: decodeURL(URLvars.turkSubmitTo), assignmentId: URLvars.assignmentId }
    socket.emit('accepted HIT',mturkVariables);
  }

  // Get permission to notify
  Notification.requestPermission()

  // Prompt for setting a username
  let username
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $inputMessage.focus();

  let currentTeam = []

  document.title = "Team work";

  // Implements notifications
  let notify = (title, body) => {
    if (Notification.permission !== "granted") { Notification.requestPermission()
    } else {
      if (!document.hasFocus()) {
        var notification = new Notification(title, { body: body })
      }
    }
  }

  let addParticipantsMessage = (data) => {
      let message = "";
      if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    // log(message);
  }

  // Sets the client's username
  function setUsername () {
    hideAll();
    $holdingPage.show();
    socket.emit('add user');
    socket.emit('execute experiment')
  }

  // Sends a chat message
  function sendMessage () {
      let message = $inputMessage.val();
      // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({ username: username, message: message });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
      const $el = $('<li>').addClass('log').html(message);
      // const $el = $('<li>').addClass('log').(message);
      addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
      const $typingMessages = getTypingMessages(data);
      options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

      const $usernameDiv = $('<span class="username"/>')
          .text(data.username)
          .css('color', getUsernameColor(data.username));
      const $messageBodyDiv = $('<span class="messageBody">')
          .text(data.message);

      const typingClass = data.typing ? 'typing' : '';
      const $messageDiv = $('<li class="message"/>')
          .data('username', data.username)
          .addClass(typingClass)
          .append($usernameDiv, $messageBodyDiv);

      addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
      const $el = $(el);

      // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
          const typingTimer = (new Date()).getTime();
          const timeDiff = typingTimer - lastTypingTime;
          if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
      let hash = 7;
      for (let i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
      const index = Math.abs(hash % COLORS.length);
      return COLORS[index];
  }

  $chatLink.click((event) => {
    event.preventDefault()
    setUsername()
  })

  // Keyboard events
  $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
      // forcedComplete($currentInput)
    }

    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else { setUsername() }
    }
    if (event.keyCode === $.ui.keyCode.TAB) {
      //&& $inputMessage.autocomplete("instance").menu.active as a poteantial second condition
      event.preventDefault()
    }
  })

  //note: only built to handle 1 checkin question, should expand?
  $('#checkin-form').submit( (event) => {
    event.preventDefault() //stops page reloading
    let selectedValue = $('input[name=checkin-q1]:checked').val();
    socket.emit('new checkin', selectedValue);
    $checkinPopup.hide();
  })

  $('#midForm').submit( (event) => {
    event.preventDefault() //stops page reloading
    socket.emit('midSurveySubmit', $('#midForm').serialize()) //submits results alone
    socket.emit('execute experiment')
    $midSurvey.hide()
    $holdingPage.show()
    $('#midForm')[0].reset();
  })

  $('#psychologicalSafety').submit( (event) => {
    event.preventDefault() //stops page reloading
    socket.emit('psychologicalSafetySubmit', $('#psychologicalSafety-form').serialize()) //submits results alone
    socket.emit('execute experiment')
    $psychologicalSafety.hide()
    $holdingPage.show()
    $('#psychologicalSafety-form')[0].reset();
  })

  $('#groupPerformance').submit( (event) => {
    event.preventDefault() //stops page reloading
    socket.emit('groupPerformanceSubmit', $('#groupPerformance-form').serialize()) //submits results alone
    socket.emit('execute experiment')
    $groupPerformance.hide()
    $holdingPage.show()
    $('#groupPerformance-form')[0].reset();
  })

  $leaveHitButton.click((event) => {
    $leaveHitPopup.show();
    $currentInput = $("#leavetaskfeedbackInput").focus();
    $currentInput.focus();
  })

  //Simple autocomplete
  $inputMessage.autocomplete({
    source: ["test"],
    position: { my : "right top-90%", at: "right top" },
    minLength: 2,
    autoFocus: true,
    delay: 50,
    select: (event, ui) => {
      var terms = $inputMessage.val().split(" ");
      terms.pop();
      terms.push( ui.item.value );
      terms.push( "" );
      $inputMessage.val(terms.join( " " ))
      return false;
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events
  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });


  // Socket events

  //if there are enough workers who have accepted the task, show link to chat page
  socket.on('enough people', data => {
    notify("There's enough people!", "Come and get started with the activity.")
    $('.chatLink').show();
  });

  //checks if the user actually accepted or if they are previewing the task
  // socket.on('check accept', data => {
      // var assignmentId = location.search;
      // if (assignmentId.includes("ASSIGNMENT_ID_NOT_AVAILABLE")) {
      //   console.log("user has not accepted");
      // } else {
      //   console.log("user has accepted");
      //   console.log(assignmentId);
      //
      //   //tell the server that the user has accepted the hit - server then adds this worker to array of accepted workers
      //   socket.emit('accepted HIT',{
      //     mturkId: turkGetParam("workerId","NONE",assignmentId),
      //     turkSubmitTo: turkGetParam("turkSubmitTo","NONE",assignmentId),
      //     assignmentId: turkGetParam("assignmentId","NONE",assignmentId)
      //   });
      // }
  // });

    //url = parent.document.URL;
    //console.log('<iframe src="https://bang.dmorina.com?url=' + url + '"></iframe>');
    //console.log(window.parent.document.getElementsByTagName("iframe")[0].src);


  // Whenever the server emits 'login', log the login message
  socket.on('login', data => {
    connected = true;
    // Display the welcome message
    const message = "Welcome";

    // log(message, { prepend: true });
    addParticipantsMessage(data);
  });

  socket.on('accepted user', data => {
    username = data.name
    holdingUsername.innerText = username
  });

  socket.on('rejected user', data => {
    hideAll();
    alert("The experiment is already full. Please return this HIT.")
  });

  socket.on('load', data => {
    let element = data.element;
    let questions = data.questions;

    new Vue({
      el: '#'+element+'-questions',
      data: {
        questions
      }
    });

    if(!data.interstitial){
      hideAll();
      $("#"+data.element).show();
      if (data.showHeaderBar) {
        $headerbarPage.show()
      }
    }
  });


  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', data => {
    addChatMessage(data);
  });

  // whenever the server emits 'checkin pop up', show checkin popup
  socket.on('checkin popup', data => {
    $checkinPopup.show();
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', data => {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', data => {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', data => {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', data => {
    removeChatTyping(data);
  });

  socket.on('go', data => {
    document.getElementById("inputMessage").value = '' //clear chat in new round
    hideAll();
    $chatPage.show();
    $headerbarPage.show();
    let teamStr = ""
    for(member of data.team) teamStr += member + ", "
    console.log(teamStr)
    teamStr = teamStr.substr(0, teamStr.length - 2)
    $headerText.html("Team " + data.round + ": " + teamStr);
    $('input[name=checkin-q1]').attr('checked',false);//reset checkin form

    setTimeout(()=>{
      log(data.task)
      log("Start by checking out the link above, then work together in this chat room to develop a short advertisement of no more than <strong>30 characters in length</strong>.")
      let durationString = ""
      if (data.duration < 1) { durationString = Math.round(data.duration * 60) + " seconds"
      } else if (data.duration == 1) { durationString = "one minute"
      } else { durationString = data.duration + " minutes" }
      log("You will have <strong>" + durationString + "</strong> to brainstorm. At the end of the time we will tell you how to submit your final result.")
      log("We will run your final advertisement online. <strong>The more successful it is, the larger the bonus each of your team members will receive.</strong>")
      log("<br>For example, here are text advertisements for a golf club called Renaissance: <br>\
      <ul style='list-style-type:disc'> \
        <li><strong>An empowering modern club</strong><br></li> \
        <li><strong>A private club with reach</strong><br></li> \
        <li><strong>Don't Wait. Discover Renaissance Today</strong></li> \
      </ul>")
    }, 500)

    setTimeout(()=>{
      let str = ""
      for (member of data.team)
        addChatMessage({username:member, message:'has entered the chatroom'})
    }, 1000)

    $currentInput = $inputMessage.focus();

    notify("Session ready", "Come back and join in!")

    // Set up team autocomplete
    currentTeam = data.team
    $currentInput = $inputMessage.focus();

    // Build a list of animals in current team
    randomAnimal = data.randomAnimal;
    let teamAnimals = {};
    for (i = 0; i < randomAnimal.length; i++) {
      for (j = 0; j < currentTeam.length; j++) {
        if (currentTeam[j].includes(randomAnimal[i])) {
          teamAnimals[randomAnimal[i]] = currentTeam[j];
        }
      }
    }

    $inputMessage.keydown(function (event) {
      $inputMessage.autocomplete( "option", "source", (request, response) => {
        let terms_typed = request.term.split(" ");
        let currentTerm = terms_typed.pop();
        let wordlength = currentTerm.length;


        if (wordlength < 2){
          response("")
          return
        }
        else if (wordlength <= 5) {
          let matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( currentTerm ), "i" );
          matches = $.grep(currentTeam, function( currentTerm ){ return matcher.test( currentTerm ); });
          if (matches[0] !== undefined) {
            response(matches)
          } else {
            let matches = $.grep(Object.keys(teamAnimals), function( currentTerm ){ return matcher.test( currentTerm ); });
            response(matches.map(match => {return teamAnimals[match]}))
          }
        }
        else if (5 < wordlength) {
          let matcher = new RegExp( ".*" + $.ui.autocomplete.escapeRegex( currentTerm ), "i" );
          let matches = $.grep( currentTeam, function( currentTerm ){ return matcher.test( currentTerm ); })
            if (matches.length === 1 && matches[0] !== undefined
              && event.keyCode !== 8
              && event.keyCode !== $.ui.keyCode.SPACE)  { //do not autocomplete if client backspace-d)
              current_text = $("#inputMessage").val().split(" ");
              current_text.splice(-1, 1)
              let joined_text = current_text.join(" ");
              if (current_text[0] === undefined) {
                $("#inputMessage").val(matches[0]);
              }
              else {
                $("#inputMessage").val(joined_text + " " + matches[0]);
              }
            };
          }



      });

      // initiate spell check after space is hit
      if (event.keyCode === $.ui.keyCode.SPACE) {
        let terms_typed = $("#inputMessage").val().split(" ");
        let currentTerm = terms_typed.pop();
        let fuzzyMatches = [];

        // Match if users only type animal name
        Object.entries(teamAnimals).forEach(
          ([key, value]) => {
            if (fuzzyMatched(key, currentTerm, 0.8)) {
              fuzzyMatches.push(value);
            }
          }
        );

        // Quick typists catch
        if (fuzzyMatches[0] === undefined) {
          fuzzyMatches = currentTeam.filter(member => (currentTerm.indexOf(member) >= 0))
        }

        // Run spell check only if animal name not detected
        if (fuzzyMatches[0] === undefined) {
          for (i = 0; i < currentTeam.length; i++) {
            if (fuzzyMatched(currentTeam[i], currentTerm, 0.7)) {
              fuzzyMatches.push(currentTeam[i]);
            }
          }
        }

        // if there is only 1 possible match, correct the user
        if (fuzzyMatches.length === 1 && fuzzyMatches[0] !== undefined) {
          let current_text = $("#inputMessage").val().split(" ");
          current_text.splice(-1, 1)
          let joined_text = current_text.join(" ");
          if (current_text[0] === undefined) {
            $("#inputMessage").val(fuzzyMatches[0]);
            }
            else {
              $("#inputMessage").val(joined_text + " " + fuzzyMatches[0]);
          }
        }
      }
    });
  });

  // fuzzy Match function
  function fuzzyMatched (comparer, comparitor, matchCount) {
    let isMatched = false;
    a = comparer.trim().toLowerCase();
    b = comparitor.trim().toLowerCase();

    if(a.length == 0) return b.length;
    if(b.length == 0) return a.length;
    let matrix = [];

    // increment along the first column of each row
    let i;
    for(i = 0; i <= b.length; i++){
        matrix[i] = [i];
    }

    // increment each column in the first row
    let j;
    for(j = 0; j <= a.length; j++){
        matrix[0][j] = j;
    }


    // Fill in the rest of the matrix
    for(i = 1; i <= b.length; i++){
        for(j = 1; j <= a.length; j++){
            if(b.charAt(i-1) == a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                        Math.min(matrix[i][j-1] + 1, // insertion
                                                matrix[i-1][j] + 1)); // deletion
            }
        }
    }

    let fuzzyDistance = matrix[b.length][a.length];
    let cLength = Math.max(a.length, b.length);
    let score = 1.0 - (fuzzyDistance / cLength);
    if (score > matchCount)
        isMatched = true;

    return isMatched;
  }

  socket.on('stop', data => {
    // log("Time's up! You are done with ", data.round, ". You will return to the waiting page in a moment.");
      hideAll();
      $holdingPage.show();
      messagesSafe.innerHTML = '';
      $inputMessage.unbind("keydown")
      socket.emit('execute experiment')
  });

  socket.on('timer',data => {
    log("You're about <strong>90% done with this session</strong>. Enter your final result now.")
    log("Remember, it needs to be <strong>maximum 30 characters long</strong>.")
    log("To indicate your final result, <strong>start the line with am exclamation mark (i.e., '!')</strong>. We will not count that character toward your length limit.")
    log("<br>If you enter more than one line starting with an exclamation mark, we'll only use the last one in the chat.")
  });

  socket.on('echo',data => {
    socket.emit(data)
  })

  socket.on('get IDs', data => {
    const URLvars = getUrlVars(location.href);
    console.log('get IDs ran');
    socket.emit(data,{mturkId: URLvars.workerId, assignmentId: URLvars.assignmentId });
  })

  socket.on('starterSurvey',data => {
    hideAll();
    $starterSurvey.show();

  })

  $("#leave-hit-submit").click((event) => {
    event.preventDefault() //stops page reloading
    let feedbackMessage = $('#leavetaskfeedbackInput').val();
    if (feedbackMessage.length > 10) {
      hideAll();
      $finishingPage.show();
      document.getElementById("finishingMessage").innerHTML = "You terminated the HIT. Thank you for your time."
      document.getElementById("mturk_form").action = mturkVariables.turkSubmitTo + "/mturk/externalSubmit"
      document.getElementById("assignmentId").value = mturkVariables.assignmentId
      finishingcode.value = "LeftHi"
      socket.emit('mturk_formSubmit', feedbackMessage)
      socket.close();
      $('#leave-hit-form')[0].reset();
    }
  })

  $("#return-task-submit").click((event) => {
    event.preventDefault() //stops page reloading
    $leaveHitPopup.hide();
    $currentInput = $inputMessage.focus();
    $currentInput.focus();
    $('#leave-hit-form')[0].reset();
  })

  // $('#leave-hit-form').submit((event) => {
  //   event.preventDefault() //stops page reloading
  //   let selectedValue = $('input[name=leave-hit-q1]:checked').val();
  //   if (selectedValue == 1) {

  //   } else {
  //     $leaveHitPopup.hide();
  //     $currentInput = $inputMessage.focus();
  //     $currentInput.focus();
  //   }

  // })

  $('#starterForm').submit( (event) => {
    event.preventDefault() //stops page reloading
    socket.emit('starterSurveySubmit', $('#starterForm').serialize()) //submits results alone
    socket.emit('execute experiment')
    $starterSurvey.hide()
    $holdingPage.show()
    $('#starterForm')[0].reset();
  })

  $('#postForm').submit( (event) => { //watches form element
    event.preventDefault() //stops page reloading
    socket.emit('postSurveySubmit', $('#postForm').serialize()) //submits results alone
    socket.emit('execute experiment')
  })



  $('#blacklistForm').submit( (event) => { //watches form element
    event.preventDefault() //stops page reloading
    socket.emit('blacklistSurveySubmit', $('#blacklistForm').serialize()) //submits results alone
    socket.emit('execute experiment')
  })



  $('#teamfeedbackForm').submit( (event) => {
    event.preventDefault() //stops page reloading
    socket.emit('teamfeedbackSurveySubmit', $('#teamfeedbackForm').serialize())
    $teamfeedbackSurvey.hide()
    $holdingPage.show()
    $('#teamfeedbackForm')[0].reset();
    socket.emit('execute experiment')
  })

  //update waiting page with number of workers that must join until task can start
  socket.on('update number waiting', data => {
    usersWaiting.innerText = data.num;
  });

  socket.on('finished',data => {
    hideAll();
    $finishingPage.show();
    document.getElementById("finishingMessage").innerHTML = data.message
    document.getElementById("mturk_form").action = data.turkSubmitTo + "/mturk/externalSubmit"
    document.getElementById("assignmentId").value = data.assignmentId
    finishingcode.value = data.finishingCode
    if (data.crashed) {
      if ($('#engagementfeedbackInput').length === 0) { //make sure element hasn't been already created
        let input = document.createElement("textarea");
        input.id = "engagementfeedbackInput";
        input.required = true;
        $("#submitButton_finish").before(input); //appendChild
      }
    }
    // socket.disconnect(true);
  })

  $('#mturk_form').submit( (event) => {
    socket.emit('mturk_formSubmit', $('#engagementfeedbackInput').val())
  })



});

function turkGetParam( name, defaultValue, uri) {
   var regexS = "[\?&]"+name+"=([^&#]*)";
   var regex = new RegExp( regexS );
   // var tmpURL = window.location.href;
   var tmpURL = uri
   var results = regex.exec( tmpURL );
   if( results == null ) {
     return defaultValue;
   } else {
     return results[1];
   }
}

const getUrlVars = (url) => {
    var hash;
    var myJson = {};
    var hashes = url.slice(url.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        myJson[hash[0]] = hash[1];
    }
    return myJson;
}

const decodeURL = (toDecode) => {
  var encoded = toDecode;
  return unescape(encoded.replace(/\+/g,  " "));
}
