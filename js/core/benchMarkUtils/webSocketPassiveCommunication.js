import { populateGroups } from "../../uiLogic/fieldGroups.js";

export function createSocketMessageHandler({
    pcRef,
    socketRef,
}) {
    return function onSocketMessage(event) {
        const receivedData = JSON.parse(event.data);

        switch (receivedData.type) {
            case 'link':
                populateGroups(receivedData.links, pcRef.pc.fields(), socketRef, pcRef);
                break;
            case "selection":
                pcRef.pc.throttledUpdatePlotsView(0, receivedData.range ?? []);
                break;
        }
    };
}

export function sendBenchMarkTimings(socketRef, pcRef, brushIdRef, clientId, measurement, wasSent) {
    let message;
    if(measurement === "postIndex") {
        let timeToProcessBrushLocally = pcRef.pc.BENCHMARK.deltaUpdateIndexes;
        message = {
            type: "BenchMark",
            benchMark: {
                action: "updateIndexes",
                timeToProcessBrushLocally: timeToProcessBrushLocally,
                brushId: brushIdRef.brushId,
                clientId: clientId,
                isActiveBrush: wasSent,
            },
        };
    }
    if(measurement === "postPlots") {
        let timeToUpdatePlots = pcRef.pc.BENCHMARK.deltaUpdatePlots;
        message = {
            type: "BenchMark",
            benchMark: {
                action: "updatePlots",
                timeToUpdatePlots: timeToUpdatePlots,
                brushId: brushIdRef.brushId,
                clientId: clientId,
                isActiveBrush: wasSent,
            },
        };
        brushIdRef.brushId++;
    }

    let socket = socketRef.socket;
    socket.send(JSON.stringify(message));
}

export function waitForStartTrigger(socketRef) {
    const socket = socketRef.socket;

    return new Promise((resolve) => {
        function startHandler(evt) {
            const data = JSON.parse(evt.data);
            if (
                data.type === "BenchMark" &&
                data.benchMark.action === "start"
            ) {
                console.log("BenchMark Started");
                socket.removeEventListener("message", startHandler);
                resolve(data);
            }
        }

        socket.addEventListener("message", startHandler);
    });
}

export function waitForEndTrigger(socketRef, pcRef) {
    let socket = socketRef.socket;
    return new Promise((resolve) => {
        function handler(event) {
            const receivedData = JSON.parse(event.data);
            if (
                receivedData.type === "BenchMark" &&
                receivedData.benchMark.action === "end"
            ) {
                console.log("   BenchMark Ended");
                socket.removeEventListener("message", handler);

                socketRef.socket.onmessage = function (event) {
                    const receivedData = JSON.parse(event.data);
                    switch (receivedData.type) {
                        case "link":
                            populateGroups(
                                receivedData.links,
                                pcRef.pc.fields(),
                                socketRef,
                                pcRef
                            );
                            break;
                    }
                };

                resolve(receivedData);
            }
        }

        socket.addEventListener("message", handler);
    });
}

export function sendEndTrigger(socketRef) {
    let socket = socketRef.socket;

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "end",
        },
    };

    socket.send(JSON.stringify(message));
    console.log(">>END");
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
            console.log(">>START");

            resolve();
        }

        if (socket.readyState === WebSocket.OPEN) {
            sendLinkGroups();
        } else {
            socket.addEventListener(
                "open",
                () => {
                    sendLinkGroups();
                },
                { once: true }
            );
        }
    });
}
