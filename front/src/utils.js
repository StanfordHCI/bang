export const parseNick = nick => {
  if (!nick) return [];
  let animalIndex = -1;
  for (let i = 0; i < nick.length; i++) {
    if (nick[i] === nick[i].toUpperCase()) {
      animalIndex = i;
      break;
    }
  }
  let animal = nick.slice(animalIndex, nick.length);
  let adjective = nick.slice(0, animalIndex);
  return [adjective, animal]; 
};

export const getUrlParams = (url) => {

  // get query string from url (optional) or window
  let queryString = url ? url.split("?")[1] : window.location.search.slice(1);

  // we'll store the parameters here
  let obj = {};

  // if query string exists
  if (queryString) {

    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split('#')[0];

    // split our query string into its component parts
    const arr = queryString.split("&");

    for (let i = 0; i < arr.length; i++) {
      // separate the keys and the values
      const a = arr[i].split("=");

      // set parameter name and value (use 'true' if empty)
      let paramName = a[0];
      let paramValue = typeof (a[1]) === "undefined" ? true : a[1];

      // (optional) keep case consistent
      paramName = paramName.toLowerCase();
      if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();

      // if the paramName ends with square brackets, e.g. colors[] or colors[2]
      if (paramName.match(/\[(\d+)?\]$/)) {

        // create key if it doesn't exist
        const key = paramName.replace(/\[(\d+)?\]/, "");
        if (!obj[key]) obj[key] = [];

        // if it's an indexed array e.g. colors[2]
        if (paramName.match(/\[\d+\]$/)) {
          // get the index value and add the entry at the appropriate position
          const index = /\[(\d+)\]/.exec(paramName)[1];
          obj[key][index] = paramValue;
        } else {
          // otherwise add the value to the end of the array
          obj[key].push(paramValue);
        }
      } else {
        // we're dealing with a string
        if (!obj[paramName]) {
          // if it doesn't exist, create property
          obj[paramName] = paramValue;
        } else if (obj[paramName] && typeof obj[paramName] === 'string'){
          // if property does exist and it's a string, convert it to an array
          obj[paramName] = [obj[paramName]];
          obj[paramName].push(paramValue);
        } else {
          // otherwise add the property
          obj[paramName].push(paramValue);
        }
      }
    }
  }

  return obj;
}

export const shuffle = array => {
  let currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export const newWindow = content => {
  const wind = window.open();
  wind.document.open().write(content)
}

export const pairInArray = (array, item) => {
  for (let i = 0; i < array.length; i++) {
    // This if statement depends on the format of your array
    if (array[i][0] === item[0] && array[i][1] === item[1] || array[i][1] === item[0] && array[i][0] === item[1]) {
      return true;   // Found it
    }
  }
  return false;   // Not found
}