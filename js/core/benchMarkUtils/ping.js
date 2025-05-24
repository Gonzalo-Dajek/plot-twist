function ping(socketRef){
    let message = {
        type: "BenchMark",
        benchMark: {
            action: "doPing",
        },
    };

    let socket = socketRef.socket;
    socket.send(JSON.stringify(message));
}

export function startPinging(socketRef) {
    if (socketRef._pingInterval) return;
    socketRef._pingInterval = setInterval(() => ping(socketRef), 50);
}

export function stopPinging(socketRef) {
    clearInterval(socketRef._pingInterval);
    delete socketRef._pingInterval;
}
