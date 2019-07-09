export const parseNick = (nick) => {
    if (!nick) return [];
    let animalIndex = 0;
    for (let i = 0; i < nick.length; i++) {
        if (nick[i] === nick[i].toUpperCase()) {
          animalIndex = i;
          break;
        }
    }
    return [] nick.slice(animalIndex, nick.length)
}
