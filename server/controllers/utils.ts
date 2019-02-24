export const clearRoom = function (room, io) {
  io.of('/').in(room).clients((error, socketIds) => {
    if (error) throw error;
    socketIds.forEach(socketId => io.sockets.sockets[socketId].leave(room));
  });
}

export const makeName = () => {
  return ''
}