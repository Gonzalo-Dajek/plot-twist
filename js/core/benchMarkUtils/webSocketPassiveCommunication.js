import throttle from "lodash-es/throttle.js";
import { populateGroups } from "../../uiLogic/fieldGroups.js";

function handleReceivedBrush(pcRef, socketRef, receivedData, clientId) {
    pcRef.pc.throttledUpdatePlotsView(0, receivedData.range ?? []);
    let timeToUpdatePlots = pcRef.pc.BENCHMARK.deltaUpdatePlots;
    let timeToProcessBrushLocally = pcRef.pc.BENCHMARK.deltaUpdateIndexes;

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "receivedBrush",
            timeToProcessBrushLocally: timeToProcessBrushLocally,
            timeToUpdatePlots: timeToUpdatePlots,
            timeReceived: Date.now(),
            clientId: clientId,
        },
    };

    let socket = socketRef.socket;
    socket.send(JSON.stringify(message));
}

export function waitForStartTrigger(socketRef, pcRef, clientId, receivedBrushThrottle) {
    let socket = socketRef.socket;
    return new Promise((resolve) => {
        function handler(event) {
            const receivedData = JSON.parse(event.data);
            if (receivedData.type === "BenchMark" && receivedData.benchMark.action === "start") {
                console.log("BenchMark Started");
                socket.removeEventListener("message", handler);

                socketRef.socket.onmessage = function(event) {
                    const receivedData = JSON.parse(event.data);
                    let throttledReceivedBrushTimings;
                    let message;
                    switch (receivedData.type) {
                        case "selection":
                            throttledReceivedBrushTimings = throttle(handleReceivedBrush, receivedBrushThrottle);
                            throttledReceivedBrushTimings(pcRef, socketRef, receivedData, clientId);
                            break;
                        case "link":
                            populateGroups(receivedData.links, pcRef.pc.fields(), socketRef, pcRef);
                            break;
                        case "ping":
                            message = {
                                type: "BenchMark",
                                benchMark: {
                                    action: "ping",
                                    clientId: clientId,
                                    timeSent: receivedData.benchMark.timeSent,
                                    pingType: receivedData.benchMark.pingType,
                                },
                            };
                            socket.send(JSON.stringify(message));
                            break;
                    }
                };
                resolve(receivedData);
            }
        }
        socket.addEventListener("message", handler);
    });
}

export function waitForEndTrigger(socketRef, pcRef) {
    let socket = socketRef.socket;
    return new Promise((resolve) => {
        function handler(event) {
            const receivedData = JSON.parse(event.data);
            if (receivedData.type === "BenchMark" && receivedData.benchMark.action === "end") {
                console.log("   BenchMark Ended");
                socket.removeEventListener("message", handler);

                socketRef.socket.onmessage = function(event) {
                    const receivedData = JSON.parse(event.data);
                    switch (receivedData.type) {
                        case "link":
                            populateGroups(receivedData.links, pcRef.pc.fields(), socketRef, pcRef);
                            break;
                    }
                };

                resolve(receivedData);
            }
        }
        socket.addEventListener("message", handler);
    });
}

// export function waitForEndTrigger(socketRef, pcRef, clientId) {
//     let socket = socketRef.socket;
//     return new Promise((resolve) => {
//         function handler(event) {
//             const receivedData = JSON.parse(event.data);
//             if (receivedData.type === "BenchMark" && receivedData.benchMark.action === "end") {
//                 console.log("   BenchMark Ended");
//                 socket.removeEventListener("message", handler);
//
//                 socketRef.socket.onmessage = function(event) {
//                     const receivedData = JSON.parse(event.data);
//                     let message;
//                     let throttledReceivedBrushTimings;
//                     switch (receivedData.type) {
//                         case "selection":
//                             throttledReceivedBrushTimings = throttle(handleReceivedBrush, 50);
//                             throttledReceivedBrushTimings(pcRef, socketRef, receivedData, clientId);
//                             break;
//                         case "link":
//                             populateGroups(receivedData.links, pcRef.pc.fields(), socketRef, pcRef);
//                             break;
//                         case "ping":
//                             message = {
//                                 type: "BenchMark",
//                                 benchMark: {
//                                     action: "ping",
//                                     clientId: clientId,
//                                     timeSent: receivedData.benchMark.timeSent,
//                                     pingType: receivedData.benchMark.pingType,
//                                 },
//                             };
//                             socket.send(JSON.stringify(message));
//                             break;
//                     }
//                 };
//
//                 resolve(receivedData);
//             }
//         }
//
//         socket.addEventListener("message", handler);
//     });
// }

export function sendEndTrigger(socketRef) {
    let socket = socketRef.socket;

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "end",
        },
    };

    socket.send(JSON.stringify(message));
}

export function sendStartTrigger(socketRef) {
    let socket = socketRef.socket;

    return new Promise((resolve) => {
        function sendLinkGroups() {
            let message = {
                type: "BenchMark",
                benchMark: {
                    action: "start",
                },
            };

            socket.send(JSON.stringify(message));

            resolve();
        }

        if (socket.readyState === WebSocket.OPEN) {
            sendLinkGroups();
        } else {
            socket.addEventListener("open", () => {
                sendLinkGroups();
            }, { once: true });
        }
    });
}
