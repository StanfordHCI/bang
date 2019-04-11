let LeavingAlert = true;
window.onbeforeunload = function() {
  if (LeavingAlert) {
    return "Leaving will stop this HIT for all users. Are you sure you want to leave?";
  } else {
    return null;
  }
};

const sessionStartTime = new Date().getTime();
let timers = [];

$(function() {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  let COLORS = [
    "#e21400",
    "#91580f",
    "#dfe106",
    "#ff8300",
    "#58dc00",
    "#006400",
    "#a8f07a",
    "#4ae8c4",
    "#ff69b4",
    "#3824aa",
    "#a700ff",
    "#d300e7"
  ];
  let colorAssignment = [];

  //toggles
  let waitChatOn = false; //MAKE SURE THIS IS THE SAME IN SERVER

  //globals for prechat
  let preChat = waitChatOn;
  let answered = false;

  // Initialize variables
  const $window = $(window);
  const $messages = $(".messages"); // Messages area

  const $inputMessage = $(".inputMessage"); // Input message input box
  const $checkinPopup = $("#checkin");
  const $headerText = $("#header-text");
  const $leaveHitButton = $("#leave-hit-button");
  const $leaveHitPopup = $("#leave-hit-popup");

  const $chatLink = $("#chatLink");
  const $headerbarPage = $("#headerbarPage"); // The finishing page
  const $lockPage = $("#lockPage"); // The page shown before acceptance
  const $waitingPage = $("#waiting"); // The waiting page
  const $chatPage = $("#chat"); // The chatroom page
  const $holdingPage = $("#holding"); // The holding page
  const $preSurvey = $("#preSurvey"); // The preSurvey page
  const $starterSurvey = $("#starterSurvey"); // The starterSurvey page
  const $juryPreTask = $("#juryPreTask");
  const $midSurvey = $("#midSurvey"); // the midSurvey page
  const $midSurveyStatusR1 = $("#midSurveyStatusR1"); // the after each round status survey page
  const $midSurveyStatusR2 = $("#midSurveyStatusR2"); // the after each round status survey page
  const $midSurveyStatusR3 = $("#midSurveyStatusR3"); // the after each round status survey page
  const $midSurveyStatusR4 = $("#midSurveyStatusR4"); // the after each round status survey page
  const $psychologicalSafety = $("#psychologicalSafety"); // the psych safety page
  const $postSurvey = $("#postSurvey"); // The postSurvey page
  const $demographicsSurvey = $("#demographicsSurvey"); // The demographics survey page - must always be last
  const $conflictSurvey = $("#conflictSurvey"); // The round conflict survey page
  const $creativeSurvey = $("#creativeSurvey"); // The round creative survey page
  const $satisfactionSurvey = $("#satisfactionSurvey"); // The round satisfaction survey page
  const $blacklistSurvey = $("#blacklistSurvey"); // The blacklist page
  const $qFifteen = $("#qFifteen"); // The question fifteen page
  const $qSixteen = $("#qSixteen"); // The question fifteen page
  const $teamfeedbackSurvey = $("#teamfeedbackSurvey"); // Feedback for team page
  const $finishingPage = $("#finishing"); // The finishing page
  const $disconnectedMessage = $("._disconnected");
  const botUsername = "helperBot";

  $("#ready-to-all").click(() => {
    socket.emit("ready-to-all", {});
  });
  $("#kill-all").click(() => {
    socket.emit("kill-all", {});
  });
  $("#active-to-all").click(() => {
    socket.emit("active-to-all", {});
  });
  $("#notify-more").click(() => {
    socket.emit("notify-more", {});
  });

  Vue.component("question-component", {
    template: `
      <p>{{question.question.split("*")[0]}}</p>
      <div v-html=(question.question.split("*")[1])></div>
      <div id="{{question.name}}-rb-box" class='rb-box'>
        <template v-for="(index, answer) in question.answers" :answer="answer">
          <label for="{{question.name}}-{{index+1}}" class="rb-tab">
            <input v-bind:type="question.answerType" name="{{question.name}}" id="{{question.name}}-{{index+1}}" 
            v-bind:value="question.textValue ? answer : index + 1" v-bind:required="question.required ? true : false" v-model="toggle"/>
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
    $headerbarPage.hide();
    $checkinPopup.hide();
    $leaveHitPopup.hide();
    $lockPage.hide();
    $waitingPage.hide();
    $chatPage.hide();
    $holdingPage.hide();
    $preSurvey.hide();
    $starterSurvey.hide();
    $juryPreTask.hide();
    $midSurvey.hide();
    $midSurveyStatusR1.hide();
    $midSurveyStatusR2.hide();
    $midSurveyStatusR3.hide();
    $midSurveyStatusR4.hide();
    $psychologicalSafety.hide();
    $postSurvey.hide();
    $conflictSurvey.hide();
    $creativeSurvey.hide();
    $satisfactionSurvey.hide();
    $demographicsSurvey.hide();
    $blacklistSurvey.hide();
    $teamfeedbackSurvey.hide();
    $finishingPage.hide();
    $chatLink.hide();
    $qFifteen.hide();
    $qSixteen.hide();
  };

  const HandleFinish = (
    finishingMessage,
    mturk_form,
    assignmentId,
    finishingcode
  ) => {
    hideAll();
    $finishingPage.show();
    document.getElementById("finishingMessage").innerHTML = finishingMessage;
    document.getElementById("mturk_form").action = mturk_form;
    document.getElementById("assignmentId").value = assignmentId;
    LeavingAlert = false;
    finishingcode.value = finishingcode;
  };

  let holdingUsername = document.getElementById("username");
  let messagesSafe = document.getElementsByClassName("messages")[0];
  let usersWaiting = document.getElementById("numberwaiting");
  let mturkVariables = {};

  const socket = io({ transports: ["websocket"] });

  hideAll();

  window.setInterval(function() {
    sendHeartBeat();
  }, 5000);

  // Prompt for setting a username
  let username = "";
  let name_structure = {};
  let connected = /*false*/ true; //PK: changed to true for testing, is this bool necessary?
  let typing = false;
  let lastTypingTime;
  let $currentInput = $inputMessage.focus();

  //Check if user has accepted based on URL. Store URL variables.
  let URL = location.href;
  let URLvars = {};
  if (URL.includes("god")) {
    URLvars.assignmentId = "ASSIGNMENT_ID_NOT_AVAILABLE";
  } else if (URL.includes("test")) {
    URLvars.assignmentId = "test";
    URLvars.turkSubmitTo = "b01.dmorina.com";
    URLvars.workerId = sessionStartTime;
  } else if (URL.includes("502")) {
    URL.vars.assignmentId = "ASSIGNMENT_ID_NOT_AVAILABLE";
  } else {
    URLvars = getUrlVars(location.href);
  }

  if (URLvars.assignmentId === "ASSIGNMENT_ID_NOT_AVAILABLE") {
    $lockPage.show(); //prompt user to accept HIT
  } else {
    // tell the server that the user has accepted the HIT - server then adds this worker
    // to array of accepted workers
    mturkVariables = {
      mturkId: URLvars.workerId,
      turkSubmitTo: decodeURL(URLvars.turkSubmitTo),
      assignmentId: URLvars.assignmentId,
      timeAdded: new Date().getTime()
    };
    socket.emit("accepted HIT", mturkVariables); //PK: thoughts on setting waitchat toggle in
    // client and sending it to server in this emit?
    if (waitChatOn) {
      //socket.emit('get username')
      hideAll();
      $chatPage.show();
      $headerbarPage.show();
      $leaveHitButton.hide();
      addChatMessage({
        username: botUsername,
        message: "Hi, I'm " + botUsername + ", welcome to our HIT!"
      });
      addChatMessage({
        username: botUsername,
        /* TODO: change message here that will inform people about compensation*/
        message:
          "You must be able to stay for the duration of this task, around 1 hour. If you cannot stay for the entire time, please leave now. You will not be compensated if you leave preemptively. As a reminder, please do not refresh or close the page."
      });
      setTimeout(() => {
        addChatMessage({
          username: botUsername,
          message:
            "For this first task, I need you to answer a sequence of questions. " +
            "Thanks for cooperating!"
        });
        setTimeout(() => {
          socket.emit("load bot qs");
        }, 1000);
      }, 1000 * 0.5);
    } else {
      hideAll();
      $waitingPage.show();
    }
  }

  // Get permission to notify
  Notification.requestPermission();

  let currentTeam = [];

  document.title = "Jury Deliberation Task";

  // Implements notifications
  let notify = () => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    } else {
      if (!document.hasFocus()) {
      }
    }
  };

  let addParticipantsMessage = data => {
    if (data.numUsers === 1) {
    } else {
    }
  };

  // Sends a chat message
  function sendMessage() {
    let message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val("");
      addChatMessage({ username: username, message: message });
      // tell server to execute 'new message' and send along one parameter
      if (preChat) {
        answered = true;
        socket.emit("update user pool", { time: Date.now() });
        socket.emit("log", holdingUsername.innerText + ": " + message);
      } else {
        socket.emit("new message", message);
      }
    }
  }

  // Log a message
  function log(message, options) {
    const $el = $("<li>")
      .addClass("log")
      .html(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage(data, options) {
    // Don't fade the message in if there is an 'X was typing'
    const $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message)
      .css({
        height: "maxcontent",
        display: "block",
        overflow: "hidden"
      });

    const $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css({
        color: getUsernameColor(data.username),
        float: "left",
        display: "inline-block"
      });

    const typingClass = data.typing ? "typing" : "";
    const $messageDiv = $('<li class="message"/>')
      .data("username", data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = "is typing";
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function() {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement(el, options) {
    const $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === "undefined") {
      options.fade = true;
    }
    if (typeof options.prepend === "undefined") {
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
  function cleanInput(input) {
    return $("<div/>")
      .text(input)
      .text();
  }

  // Updates the typing event
  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit("typing");
      }
      lastTypingTime = new Date().getTime();

      setTimeout(function() {
        const typingTimer = new Date().getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit("stop typing");
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $(".typing.message").filter(function() {
      return $(this).data("username") === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor(username) {
    if (COLORS.length === 0) {
      COLORS = [
        "#e21400",
        "#91580f",
        "#dfe106",
        "#ff8300",
        "#58dc00",
        "#006400",
        "#a8f07a",
        "#4ae8c4",
        "#ff69b4",
        "#3824aa",
        "#a700ff",
        "#d300e7"
      ];
    }
    if (colorAssignment.includes(username)) {
      return colorAssignment[colorAssignment.indexOf(username) + 1];
    } else {
      let color = COLORS[0];
      colorAssignment.push(username);
      colorAssignment.push(color);
      COLORS.splice(0, 1);
      return color;
    }
  }

  // equivalent of initiate experiment when waitChatOn === false PK: change this?
  $chatLink.click(event => {
    event.preventDefault();
    hideAll();
    $holdingPage.show();
    //socket.emit('get username')
    socket.emit("add user");
    socket.emit("next event");
  });

  // Keyboard events
  document.getElementById("character-count").innerHTML = 0;

  $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }

    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit("stop typing");
        typing = false;
      }
    }
    if (event.keyCode === $.ui.keyCode.TAB) {
      //&& $inputMessage.autocomplete("instance").menu.active as a poteantial second condition
      event.preventDefault();
    }
  });

  $inputMessage.keyup(function() {
    const currentInput = $("#inputMessage").val();
    const characterCount = currentInput.length;
    if (currentInput[0] === "!") {
      document.getElementById("character-count").innerHTML = characterCount - 1; //excluding the !
      if (characterCount - 1 > 30) {
        $("#character-counter").addClass;
        $("#character-counter").css("color", "red");
        $("#character-count").css("color", "red");
      }
    } else {
      document.getElementById("character-count").innerHTML = characterCount;
      $("#character-counter").css("color", "black");
      $("#character-count").css("color", "black");
    }
  });

  $("#checkin-form").submit(event => {
    event.preventDefault(); //stops page reloading
    let selectedValue = $("input[name=checkin-q1]:checked").val();
    socket.emit("new checkin", selectedValue);
    $checkinPopup.hide();
  });

  $("#juryPreTask").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("juryPreTask", $("#juryPreTask").serialize()); //submits results alone
    socket.emit("next event");
    $juryPreTask.hide();
    submitHold();
    $("#juryPreTaskForm")[0].reset();
  });

  $("#midForm").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("midSurveySubmit", $("#midForm").serialize()); //submits results alone
    socket.emit("next event");
    $midSurvey.hide();
    submitHold();
    $("#midForm")[0].reset();
  });

  $("#midFormStatusR1").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("midSurveyStatusSubmit", $("#midFormStatusR1").serialize()); //submits results alone
    socket.emit("next event");
    $midSurveyStatusR1.hide();
    submitHold();
    $("#midFormStatusR1")[0].reset();
  });

  $("#midFormStatusR2").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("midSurveyStatusSubmit", $("#midFormStatusR2").serialize()); //submits results alone
    socket.emit("next event");
    $midSurveyStatusR2.hide();
    submitHold();
    $("#midFormStatusR2")[0].reset();
  });

  $("#midFormStatusR3").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("midSurveyStatusSubmit", $("#midFormStatusR3").serialize()); //submits results alone
    socket.emit("next event");
    $midSurveyStatusR3.hide();
    submitHold();
    $("#midFormStatusR3")[0].reset();
  });

  $("#midFormStatusR4").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("midSurveyStatusSubmit", $("#midFormStatusR4").serialize()); //submits results alone
    socket.emit("next event");
    $midSurveyStatusR4.hide();
    submitHold();
    $("#midFormStatusR4")[0].reset();
  });
  $("#creativeForm").submit(event => {
    event.preventDefault(); //stops page reloading

    socket.emit("creativeSurveySubmit", $("#creativeForm").serialize()); //submits results alone
    socket.emit("next event");
    $creativeSurvey.hide();
    submitHold();
    $("#creativeForm")[0].reset();
  });

  $("#satisfactionForm").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("satisfactionSurveySubmit", $("#satisfactionForm").serialize()); //submits results alone
    socket.emit("next event");
    $satisfactionSurvey.hide();
    submitHold();
    $("#satisfactionForm")[0].reset();
  });

  $("#conflictForm").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("conflictSurveySubmit", $("#conflictForm").serialize()); //submits results alone
    socket.emit("next event");
    $conflictSurvey.hide();
    submitHold();
    $("#conflictForm")[0].reset();
  });

  $("#psychologicalSafety").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit(
      "psychologicalSafetySubmit",
      $("#psychologicalSafety-form").serialize()
    ); //submits results alone
    socket.emit("next event");
    $psychologicalSafety.hide();
    submitHold();
    $("#psychologicalSafety-form")[0].reset();
  });

  $("#qFifteen").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("qFifteenSubmit", $("#qFifteenForm").serialize()); //submits results alone
    socket.emit("next event");
    $qFifteen.hide();
    $("#qFifteenForm")[0].reset();
  });

  $("#qSixteen").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("qSixteenSubmit", $("#qSixteenForm").serialize()); //submits results alone
    socket.emit("next event");
    $qSixteen.hide();
    $("#qSixteenForm")[0].reset();
  });

  $("#demographicsForm").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("demographicsSurveySubmit", $("#demographicsForm").serialize()); //submits results alone
    socket.emit("next event");
    $demographicsSurvey.hide();
    $("#demographicsForm")[0].reset();
  });

  $leaveHitButton.click(() => {
    $leaveHitPopup.show();
    $currentInput = $("#leavetaskfeedbackInput").focus();
    $currentInput.focus();
    socket.emit(
      "log",
      holdingUsername.innerText + " clicked leave hit button."
    );
  });

  //Simple autocomplete
  $inputMessage.autocomplete({
    source: ["test"],
    position: { my: "right top-90%", at: "right top" },
    minLength: 2,
    autoFocus: true,
    delay: 50,
    select: (event, ui) => {
      var terms = $inputMessage.val().split(" ");
      terms.pop();
      terms.push(ui.item.value);
      terms.push("");
      $inputMessage.val(terms.join(" "));
      return false;
    }
  });

  $inputMessage.on("input", function() {
    updateTyping();
  });

  // Click events
  // Focus input when clicking on the message input's border
  $inputMessage.click(function() {
    $inputMessage.focus();
  });

  function sendHeartBeat() {
    if (socket.connected) {
      socket.emit("heartbeat", {});
    }
  }

  // Socket events
  socket.on("connect", function() {
    $disconnectedMessage.hide();
    socket.emit("connected", {
      mturkId: URLvars.workerId,
      assignmentId: URLvars.assignmentId,
      turkSubmitTo: decodeURL(URLvars.turkSubmitTo),
      name_structure: name_structure
    });
  });
  socket.on("reconnect", function(attemptNumber) {
    $disconnectedMessage.hide();
    socket.emit(
      "log",
      URLvars.workerId + " RECONNECT SUCCESS (attempt " + attemptNumber + ")"
    );
  });

  socket.on("reconnect_attempt", function(attemptNumber) {
    socket.io.opts.transports = ["websocket"];
    if (socket.connected) {
      socket.emit(
        "log",
        URLvars.workerId + " RECONNECT ATTEMPT " + attemptNumber
      );
    }
  });

  socket.on("reconnect_error", function(error) {
    if (socket.connected) {
      socket.emit("log", URLvars.workerId + " RECONNECT " + error);
    }
  });

  socket.on("reconnect_failure", function() {
    if (socket.connected) {
      socket.emit("log", URLvars.workerId + " RECONNECT FAILURE");
    }
  });
  socket.on("chatbot", data => {
    const questions = data;
    const questionIndex = permute(questions.length - 1).concat([
      questions.length
    ]);
    let index = 0;
    let typingTimer;
    let doneTypingInterval = 2000;
    answered = true;
    askQuestion(); //ask first q right away

    //on keyup, start the countdown
    $inputMessage.on("keyup", function() {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(askQuestion, doneTypingInterval);
    });

    //on keydown, clear the countdown
    $inputMessage.on("keydown", function() {
      clearTimeout(typingTimer);
    });

    //user is "finished typing," do something
    function askQuestion() {
      if (preChat) {
        if (answered) {
          answered = false;

          if (index < questions.length) {
            let q = questions[questionIndex[index]].question;
            socket.emit("log", q);
            addChatMessage({ username: botUsername, message: q });
            index++;
          } else {
            addChatMessage({
              username: botUsername,
              message:
                "You've answered all my questions! Hang tight while we set up the next task."
            });
          }
        }
      }
    }

    function permute(questionLength) {
      // first make a list from 1 to questionLength
      let questionIndex = [...Array(questionLength).keys()];

      // then proceed to shuffle the questionIndex array
      for (let idx = 0; idx < questionLength; idx++) {
        let swpIdx = idx + Math.floor(Math.random() * (questionLength - idx));
        // now swap elements at idx and swpIdx
        let tmp = questionIndex[idx];
        questionIndex[idx] = questionIndex[swpIdx];
        questionIndex[swpIdx] = tmp;
      }
      // here questionIndex[] will have been randomly shuffled (permuted)
      return questionIndex;
    }
  });

  socket.on("set username", data => {
    username = data.username;
    name_structure = data.name_structure;
    holdingUsername.innerText = username;
  });

  socket.on("show chat link", () => {
    $chatLink.show();
    notify("Please click the link");
  });
  //if there are enough workers who have accepted the task, show link to chat page
  socket.on("initiate experiment", () => {
    if (preChat) {
      notify(
        "Moving you to another chatroom.",
        "Come and get started with the activity."
      );
      addChatMessage({
        username: botUsername,
        message:
          "Please wait a few seconds while we move you to another chatroom to begin the next task"
      });
      setTimeout(() => {
        socket.emit("next event");
        preChat = false;
      }, 1000 * 2);
    }
  });

  // Whenever the server emits 'login', log the login message
  socket.on("login", data => {
    connected = true;

    // log(message, { prepend: true });
    addParticipantsMessage(data);
  });

  socket.on("rejected user", () => {
    hideAll();
    alert("The experiment is already full. Please return this HIT.");
  });

  socket.on("load", data => {
    clearAllTimers();
    let element = data.element;
    let questions = data.questions;

    console.log("Loaded element " + element + " with questions " + questions);

    new Vue({
      el: "#" + element + "-questions",
      data: {
        questions
      }
    });

    if (!data.interstitial) {
      hideAll();
      $("#" + data.element).show();
      console.log("showing" + data.element +  "now");
      if (data.showHeaderBar) {
        $headerbarPage.show();
      }
    }
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on("new message", data => {
    addChatMessage(data);
    notify(data.username + ": " + data.message);
  });

  // whenever the server emits 'checkin pop up', show checkin popup
  socket.on("checkin popup", () => {
    $checkinPopup.show();
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on("user joined", data => {
    log(data.username + " joined");
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on("user left", data => {
    log(data.username + " left");
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on("typing", data => {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on("stop typing", data => {
    removeChatTyping(data);
  });

  socket.on("initiate round", data => {
    messagesSafe.innerHTML = "";
    displayTimer(60 * data.duration - 1, $headerText); // start header timer, subtract 1 to give more notice

    document.getElementById("inputMessage").value = ""; //clear chat in new round
    hideAll();
    $chatPage.show();
    $leaveHitButton.show();
    $headerbarPage.show();
    $("input[name=checkin-q1]").attr("checked", false); //reset checkin form
    LeavingAlert = data.runningLive; //leaving alert for users if running live

    setTimeout(() => {
      let totalLengthString = "";
      totalLengthString = Math.round(4 * data.duration + 15) + " minutes";
      log(
        "<strong>DO NOT REFRESH OR LEAVE THE PAGE! If you do, it may terminate the task for your team members and you will not be compensated.</strong>"
      );
      log(
        "You will receive the bonus pay at the stated hourly rate only if you<strong> fill out all survey questions and complete all rounds.</strong>"
      );
      log(
        "You will have <strong>" +
          textifyTime(data.duration) +
          "</strong> to deliberate for this round. <strong>YOU ARE NOT ALLOWED TO SEARCH ON THE INTERNET FOR ANY ADDITIONAL MATERIALS.</strong> You will receive instructions about how the jury deliberation works, just as you would in a real courtroom." + 
          "The entire HIT will take no more than " + totalLengthString + " total."
      );
      /*
      log("<br><strong>Task:</strong>");

      log(data.task);

      log("<br><strong>Directions:</strong>");

      log(
        "1. Check out the link above and collaborate with your team members in the chat room to develop a text advertisement<br>" +
          "2. The ad must be no more than <strong>30 characters long</strong>. <br>" +
          "3. Instructions will be given for submitting the team's final product. <br>" +
          "4. You have " +
          textifyTime(data.duration) +
          " to complete this round. <br>" +
          "5. Your final advertisement will appear online. <strong>The more successful it is, the larger the " +
          "bonus each team member will receive.</strong>"
      );
      log("<br><strong>Example:</strong>");
      log(
        "<strong>Note</strong>: In each round, please know that you will receive the <em>SAME case</em>, but will have <em>different</em> team members."
        "Text advertisements for 'Renaissance Golf Club': <br>\
                <ul style='list-style-type:disc'> \
                  <li><strong>An empowering modern club</strong><br></li> \
                  <li><strong>A private club with reach</strong><br></li> \
                  <li><strong>Don't Wait. Discover Renaissance Today</strong></li> \
                </ul><br>"
      );*/
    }, 500);

    setTimeout(() => {
      for (member of data.team) {
        addChatMessage({
          username: member,
          message: "has entered the jury room"
        });
      }
    }, 1000);

    $currentInput = $inputMessage.focus();

    notify("Session ready", "Come back and join in!");

    // Set up team autocomplete
    currentTeam = data.team;
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

    $inputMessage.keydown(function(event) {
      $inputMessage.autocomplete("option", "source", (request, response) => {
        let terms_typed = request.term.split(" ");
        let currentTerm = terms_typed.pop();
        let wordlength = currentTerm.length;

        if (wordlength < 2) {
          response("");
        } else if (wordlength <= 5) {
          let matcher = new RegExp(
            "^" + $.ui.autocomplete.escapeRegex(currentTerm),
            "i"
          );
          matches = $.grep(currentTeam, function(currentTerm) {
            return matcher.test(currentTerm);
          });
          if (matches[0] !== undefined) {
            response(matches);
          } else {
            let matches = $.grep(Object.keys(teamAnimals), function(
              currentTerm
            ) {
              return matcher.test(currentTerm);
            });
            response(
              matches.map(match => {
                return teamAnimals[match];
              })
            );
          }
        } else if (5 < wordlength) {
          let matcher = new RegExp(
            ".*" + $.ui.autocomplete.escapeRegex(currentTerm),
            "i"
          );
          let matches = $.grep(currentTeam, function(currentTerm) {
            return matcher.test(currentTerm);
          });
          if (
            matches.length === 1 &&
            matches[0] !== undefined &&
            event.keyCode !== 8 &&
            event.keyCode !== $.ui.keyCode.SPACE
          ) {
            //do not autocomplete if client backspace-d)
            current_text = $("#inputMessage")
              .val()
              .split(" ");
            current_text.splice(-1, 1);
            let joined_text = current_text.join(" ");
            if (current_text[0] === undefined) {
              $("#inputMessage").val(matches[0]);
            } else {
              $("#inputMessage").val(joined_text + " " + matches[0]);
            }
          }
        }
      });

      // initiate spell check after space or enter is hit
      if (
        event.keyCode === $.ui.keyCode.SPACE ||
        event.keyCode === $.ui.keyCode.ENTER
      ) {
        let terms_typed = $("#inputMessage")
          .val()
          .split(" ");
        let currentTerm = terms_typed.pop();
        let fuzzyMatches = [];

        // Match if users only type animal name
        Object.entries(teamAnimals).forEach(([key, value]) => {
          if (fuzzyMatched(key, currentTerm, 0.8)) {
            fuzzyMatches.push(value);
          }
        });

        // Quick typists catch
        if (fuzzyMatches[0] === undefined) {
          fuzzyMatches = currentTeam.filter(
            member => currentTerm.indexOf(member) >= 0
          );
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
          let current_text = $("#inputMessage")
            .val()
            .split(" ");
          current_text.splice(-1, 1);
          let joined_text = current_text.join(" ");
          if (current_text[0] === undefined) {
            $("#inputMessage").val(fuzzyMatches[0]);
          } else {
            $("#inputMessage").val(joined_text + " " + fuzzyMatches[0]);
          }
        }
      }
    });
  });

  // fuzzy Match function
  function fuzzyMatched(comparer, comparitor, matchCount) {
    let isMatched = false;
    a = comparer.trim().toLowerCase();
    b = comparitor.trim().toLowerCase();

    if (a.length === 0) return false;
    if (b.length === 0) return false;
    let matrix = [];

    // increment along the first column of each row
    let i;
    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // increment each column in the first row
    let j;
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1
            )
          ); // deletion
        }
      }
    }

    let fuzzyDistance = matrix[b.length][a.length];
    let cLength = Math.max(a.length, b.length);
    let score = 1.0 - fuzzyDistance / cLength;
    if (score > matchCount) isMatched = true;

    return isMatched;
  }

  socket.on("message clients", message => {
    log(message);
  });

  socket.on("stop", () => {
    // log("Time's up! You are done with ", data.round, ". You will return to the waiting page in a moment.");
    hideAll();
    $holdingPage.show();
    // messagesSafe.innerHTML = '';
    $inputMessage.unbind("keydown");
    socket.emit("next event");
  });

  socket.on("timer", data => {
    // log(
    //   "<strong>You'll be done with this round in about " +
    //     textifyTime(data.time) +
    //     ". Enter your final result now.</strong>"
    // );
    // log(
    //   "Remember, it can't be more than <strong>maximum 30 characters long</strong>."
    // );
    // log(
    //   "To indicate your final result, <strong>start the line with an exclamation mark (i.e., '!')</strong>. We will not count that character toward your length limit."
    // );
    // log(
    //   "If you enter more than one line starting with an exclamation mark, we'll only use the last one in the chat. This result will count equally for all members of the team."
    // );
  });

  socket.on("echo", data => {
    socket.emit(data);
  });

  socket.on("get IDs", data => {
    if (URL.includes("test")) {
      URLvars.assignmentId = "test";
      URLvars.turkSubmitTo = "b01.dmorina.com";
      URLvars.workerId = sessionStartTime;
    } else {
      const URLvars = getUrlVars(location.href);
    }

    socket.emit(data, {
      mturkId: URLvars.workerId,
      assignmentId: URLvars.assignmentId
    });
  });

  socket.on("starterSurvey", () => {
    hideAll();
    $starterSurvey.show();
  });

  $("#leave-hit-submit").click(event => {
    event.preventDefault(); //stops page reloading
    let feedbackMessage = $("#leavetaskfeedbackInput").val();

    if (feedbackMessage.length > 10) {
      socket.emit("log", "SOCKET DISCONNECT IN LEAVE HIT BUTTON");
      HandleFinish(
        (finishingMessage = "You terminated the HIT. Thank you for your time."),
        (mturk_form = mturkVariables.turkSubmitTo + "/mturk/externalSubmit"),
        (assignmentId = mturkVariables.assignmentId),
        (finishingcode = "LeftHit")
      );
      socket.emit("mturk_formSubmit", $("#leave-hit-form").serialize());
      // socket.disconnect(true);
      $("#leave-hit-form")[0].reset();
    }
  });

  $("#return-task-submit").click(event => {
    event.preventDefault(); //stops page reloading
    $leaveHitPopup.hide();
    $currentInput = $inputMessage.focus();
    $currentInput.focus();
    $("#leave-hit-form")[0].reset();
  });

  $("#starterForm").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("starterSurveySubmit", $("#starterForm").serialize()); //submits results alone
    socket.emit("next event");
    $starterSurvey.hide();
    $holdingPage.show();
    $("#starterForm")[0].reset();
  });

  $("#postForm").submit(event => {
    //watches form element
    event.preventDefault(); //stops page reloading
    socket.emit("postSurveySubmit", $("#postForm").serialize()); //submits results alone
    socket.emit("next event");
  });

  $("#blacklistForm").submit(event => {
    //watches form element
    event.preventDefault(); //stops page reloading
    socket.emit("blacklistSurveySubmit", $("#blacklistForm").serialize()); //submits results alone
    socket.emit("next event");
  });

  $("#teamfeedbackForm").submit(event => {
    event.preventDefault(); //stops page reloading
    socket.emit("teamfeedbackSurveySubmit", $("#teamfeedbackForm").serialize());
    $teamfeedbackSurvey.hide();
    $holdingPage.show();
    $("#teamfeedbackForm")[0].reset();
    socket.emit("next event");
  });

  //update waiting page with number of workers that must join until task can start
  socket.on("update number waiting", data => {
    usersWaiting.innerText = data.num;
  });

  socket.on("finished", data => {
    socket.emit("log", "Disconnecting: " + data.finishingcode);
    HandleFinish(
      (finishingMessage = data.message),
      (mturk_form = mturkVariables.turkSubmitTo + "/mturk/externalSubmit"),
      (assignmentId = mturkVariables.assignmentId),
      (finishingcode = data.finishingCode)
    );
    LeavingAlert = false;
    socket.disconnect(true);
  });

  $("#mturk_form").submit(() => {
    socket.emit("mturk_formSubmit", $("#mturk_form").serialize());
  });

  //MW: Reminds the server people are ready after some time, so that we don't get stuck if people leave surveys.
  function submitHold() {
    $holdingPage.show();
    clearAllTimers();
    //Repeats until a new event is received.

    //playing with commenting this out
    // timers.push(
    //   setInterval(() => {
    //     socket.emit("ready");
    //   }, 10 * 60 * 1000)
    // );
  }
});

function clearAllTimers() {
  timers.forEach(timer => clearInterval(timer));
}

function displayTimer(duration, display) {
  clearAllTimers();
  var start = Date.now(),
    diff,
    minutes,
    seconds;
  timers.push(
    setInterval(() => {
      diff = duration - (((Date.now() - start) / 1000) | 0);

      // does the same job as parseInt truncates the float
      minutes = (diff / 60) | 0;
      seconds = diff % 60 | 0;

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      display.html(`Time: ${minutes}:${seconds}`);
      if (diff >= duration) {
        display.html("");
        timers.forEach(timer => clearInterval(timer));
      }
      if (diff <= 0) {
        // add one second so that the count down starts at the full duration
        // example 05:00 not 04:59
        start = Date.now() + 1000;
      }
    }, 1000)
  );
}

function turkGetParam(name, defaultValue, uri) {
  var regexS = "[?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  // var tmpURL = window.location.href;
  var tmpURL = uri;
  var results = regex.exec(tmpURL);
  if (results == null) {
    return defaultValue;
  } else {
    return results[1];
  }
}

const getUrlVars = url => {
  var myJson = {};
  url
    .slice(url.indexOf("?") + 1)
    .split("&")
    .forEach(varString => {
      const varList = varString.split("=");
      myJson[varList[0]] = varList[1];
    });
  return myJson;
};

const decodeURL = toDecode => {
  var encoded = toDecode;
  return unescape(encoded.replace(/\+/g, " "));
};

function textifyTime(duration) {
  let durationString = "";
  if (duration < 1) {
    durationString = Math.round(duration * 60) + " seconds";
  } else if (duration === 1) {
    durationString = "one minute";
  } else {
    durationString = duration + " minutes";
  }
  return durationString;
}
