let io;

module.exports = {
    setIO: (ioInstance) => {
        io = ioInstance;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io is not initialized!");
        }
        return io;
    }
};
