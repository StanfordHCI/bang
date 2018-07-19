$(function() {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = ['#e21400', '#91580f', '#f8a700', '#f78b00', '#58dc00', '#287b00', '#a8f07a', '#4ae8c4', '#3b88eb', '#3824aa', '#a700ff', '#d300e7'];
  // Initialize variables
  const $window = $(window);
  const $messages = $('.messages'); // Messages area
  const $inputMessage = $('.inputMessage'); // Input message input box
  const $checkinPopup = $('.popup');

  const $chatLink = $('#chatLink');

  const $lockPage = $('#lockPage'); // The page shown before acceptance
  const $waitingPage = $('#waiting'); // The waiting page
  const $chatPage = $('#chat'); // The chatroom page
  const $holdingPage = $('#holding'); // The holding page
  const $preSurvey = $('#preSurvey'); // The preSurvey page
  const $starterSurvey = $('#starterSurvey'); // The starterSurvey page
  const $midSurvey = $('#midSurvey'); // the midSurvey page
  const $postSurvey = $('#postSurvey'); // The postSurvey page
  const $blacklistSurvey = $('#blacklistSurvey'); // The blacklist page
  const $teamfeedbackSurvey = $('#teamfeedbackSurvey'); // Feedback for team page
  const $finishingPage = $('#finishing'); // The finishing page

  Vue.component('question-component', {
    template: `
      <h3>{{question.question}}</h3>
      <div id="{{question.name}}-rb-box" class='rb-box'>
        <template v-for="(index, option) in question.answers" :option="option">
          <label for="{{question.name}}-{{index+1}}" class="rb-tab">
            <input v-if="question.answerType === 'radio'" type="radio" name="{{question.name}}" id="{{question.name}}-{{index+1}}" value="{{index+1}}" required/>
            <input v-if="question.answerType === 'checkbox'" type="checkbox" name="{{question.name}}" id="{{question.name}}-{{index+1}}" value="{{index+1}}" />
            <span class='rb-spot'>{{index+1}}</span>
            <label for='{{question.name}}-{{index+1}}'>{{option}}</label>
          </label>
        </template>
      </div>
    `,
    props: {
      question: Object
    }
  });

  const hideAll = () => {
    $checkinPopup.hide();
    $lockPage.hide();
    $waitingPage.hide();
    $chatPage.hide();
    $holdingPage.hide();
    $preSurvey.hide();
    $starterSurvey.hide();
    $midSurvey.hide();
    $postSurvey.hide();
    $blacklistSurvey.hide();
    $teamfeedbackSurvey.hide();
    $finishingPage.hide();
    $chatLink.hide();
  }

  let holdingUsername = document.getElementById('username');
  let messagesSafe = document.getElementsByClassName('messages')[0];
  let finishingcode = document.getElementById('finishingcode');
  let usersWaiting = document.getElementById('numberwaiting');

  const $preSurveyQuestions = $('.preSurveyQuestions'); //pre survey
  const $midSurveyQuestions = $('.midSurveyQuestions'); // mid survey
  const $postSurveyQuestions = $('.postSurveyQuestions'); //post survey

  const socket = io();

  hideAll();

  //Check if user has accepted based on URL. Store URL variables.
  const URLvars = getUrlVars(location.href)
  if (URLvars.assignmentId == "ASSIGNMENT_ID_NOT_AVAILABLE") {
    $lockPage.show(); //prompt user to accept HIT
  } else { // tell the server that the user has accepted the HIT - server then adds this worker to array of accepted workers

    $waitingPage.show();
    socket.emit('accepted HIT',{ mturkId: URLvars.workerId, turkSubmitTo: decodeURL(URLvars.turkSubmitTo), assignmentId: URLvars.assignmentId });
  }

  // Get permission to notify
  Notification.requestPermission()

  // Prompt for setting a username
  let username;
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

  socket.on('load checkin', questions => {
    new Vue({
      el: '#checkin-questions',
      data: {
        questions
      }
    });
  })

  socket.on('load midsurvey', questions => {
    new Vue({
      el: '#midsurvey-questions',
      data: {
        questions
      }
    });
  })


  socket.on('load postsurvey', questions => {
    new Vue({
      el: '#postsurvey-questions',
      data: {
        questions
      }
    });
  })

  socket.on('load blacklist', questions => {
    new Vue({
      el:'#blacklist-questions',
      data: {
        questions
      }
    })
  })

  socket.on('load feedback', questions => {
    new Vue({
      el:'#feedback-questions',
      data: {
        questions
      }
    })
  })

  socket.on('load starter questions', questions => {
    new Vue({
      el: '#startersurvey-questions',
      data: {
        questions
      }
    });
  })

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', data => {
    addChatMessage(data);
  });

  // whenever the server emits 'checkin pop up', show checkin popup
  socket.on('checkin popup', data => {
    $('.popup').show();
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
    $('input[name=checkin-q1]').attr('checked',false);//reset checkin form


    log(data.task);
    log("Start by checking out the link above, then work together in this chat room to develop a short advertisement of no more than <strong>30 characters in length</strong>.")
    log("You will have <strong>10 minutes</strong> to brainstorm. At the end of the time we will tell you how to submit your final result.")
    log("We will run your final advertisement online. <strong>The more successful it is, the larger the bonus each of your team members will receive.</strong>")
    $currentInput = $inputMessage.focus();
    
    notify("Session ready", "Come back and join in!")

    //Set up team autocomplete
    currentTeam = data.team
    $currentInput = $inputMessage.focus();

    // Do I spawn a ton of keypress watchers after each go 
    $inputMessage.keydown(function (event) {
      $inputMessage.autocomplete( "option", "source", (request, response) => {
        let terms_typed = request.term.split(" ");
        let currentTerm = terms_typed.pop()
        let wordlength = currentTerm.length;

        // console.log("request", request)
        // console.log("currentTerm", currentTerm)
        // console.log("currentTeam", currentTeam)
        // console.log("wordlength", wordlength)

        if (wordlength < 2){
          response("")
          return
        }
        else if (wordlength <= 5) {
          let matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( currentTerm ), "i" );
          response($.grep( currentTeam, function( currentTerm ){ return matcher.test( currentTerm ); }))
        }
        else if (5 < wordlength) {
          matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( currentTerm ), "i" );
          matches = $.grep( currentTeam, function( currentTerm ){ return matcher.test( currentTerm ); })
            if (matches.length === 1 && matches[0] !== undefined 
              && event.keyCode !== 8 //do not autocomplete if client backspace-d
              && event.keyCode !== $.ui.keyCode.SPACE) {
              $inputMessage.autocomplete("close")
              current_text = $("#inputMessage").val().split(" ");
              current_text.splice(-1, 1)
              let joined_text = current_text.join(" ");
              $("#inputMessage").val(joined_text + " " + matches[0]);
              // console.log($("#inputMessage").val().split(" ").splice(-1, 1))
              // console.log("current_text", current_text)
              // console.log("matches", matches)
              // console.log("wordlength now", wordlength)
              response("");
              return;
            };         
        }
    });

        
    });
  });

  socket.on('stop', data => {
    // log("Time's up! You are done with ", data.round, ". You will return to the waiting page in a moment.");
      hideAll();
      $holdingPage.show();
      messagesSafe.innerHTML = '';
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

  socket.on('starterSurvey',data => {
    hideAll();
    $starterSurvey.show();

  })

  $('#starterForm').submit( (event) => {
    event.preventDefault() //stops page reloading
    socket.emit('starterSurveySubmit', $('#starterForm').serialize()) //submits results alone
    socket.emit('execute experiment')
    $starterSurvey.hide()
    $holdingPage.show()
    $('#starterForm')[0].reset();
  })

  socket.on('midSurvey',data => {
    hideAll();
    $midSurvey.show();

  })

  socket.on('postSurvey',data => {
    hideAll();
    $postSurvey.show();
  })

  $('#postForm').submit( (event) => { //watches form element
    event.preventDefault() //stops page reloading
    socket.emit('postSurveySubmit', $('#postForm').serialize()) //submits results alone
    socket.emit('execute experiment')
  })

  socket.on('blacklistSurvey', () => {
    hideAll();
    $blacklistSurvey.show();
  })

  $('#blacklistForm').submit( (event) => { //watches form element
    event.preventDefault() //stops page reloading
    socket.emit('blacklistSurveySubmit', $('#blacklistForm').serialize()) //submits results alone
    socket.emit('execute experiment')
  })

  socket.on('teamfeedbackSurvey', () => {
    hideAll();
    $teamfeedbackSurvey.show();
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
    document.getElementById("mturk_form").action = data.turkSubmitTo + "/mturk/externalSubmit"
    document.getElementById("assignmentId").value = data.assignmentId
    finishingcode.value = data.finishingCode
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
