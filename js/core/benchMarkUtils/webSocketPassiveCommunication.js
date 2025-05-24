import throttle from "lodash-es/throttle.js";
import { populateGroups } from "../../uiLogic/fieldGroups.js";

export function createSocketMessageHandler({
    pcRef,
    socketRef,
    clientId,
    receivedBrushThrottle,
    pingThrottle = 50,
}) {
    // const socket = socketRef.socket; // TODO:

    const throttledReceivedBrushTimings = throttle((receivedData) => {
        handleReceivedBrush(pcRef, socketRef, receivedData, clientId);
    }, receivedBrushThrottle);

    return function (event) {
        const receivedData = JSON.parse(event.data);

        switch (receivedData.type) {
            case "selection":
                throttledReceivedBrushTimings(receivedData);
                break;
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
}

export function handleReceivedBrush(pcRef, socketRef, receivedData, clientId) {
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

export function waitForStartTrigger(
    socketRef,
    pcRef,
    clientId,
    receivedBrushThrottle
) {
    const socket = socketRef.socket;
    // (A) build your long‑lived handler exactly once:
    const onMessageFun = createSocketMessageHandler({
        pcRef,
        socketRef,
        clientId,
        receivedBrushThrottle,
    });

    return new Promise((resolve) => {
        // (B) listen only for the “start” message:
        function startHandler(evt) {
            const data = JSON.parse(evt.data);
            if (
                data.type === "BenchMark" &&
                data.benchMark.action === "start"
            ) {
                console.log("BenchMark Started");
                // (C) tear down the “start” watcher
                socket.removeEventListener("message", startHandler);
                // (D) install your real handler
                socket.addEventListener("message", onMessageFun);
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
