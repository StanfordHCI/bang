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
