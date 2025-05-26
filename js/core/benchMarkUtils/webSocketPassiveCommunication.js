import throttle from "lodash-es/throttle.js";
import { populateGroups } from "../../uiLogic/fieldGroups.js";
import { rangeSet } from "../rangeSet.js";

export function createSocketMessageHandler({
    pcRef,
    socketRef,
    clientId,
    throttle_ms,
}) {
    return function onSocketMessage(event) {
        const receivedData = JSON.parse(event.data);

        switch (receivedData.type) {
            case 'link':
                populateGroups(
                    receivedData.links,
                    pcRef.pc.fields(),
                    socketRef,
                    pcRef
                );
                break;

            case 'BenchMark':
                {
                    const bm = receivedData.benchMark;
                    switch (bm.action) {
                        case 'doBrushClient':
                            handleReceivedDoBrush(pcRef, socketRef, bm, clientId);
                            break;
                        case 'translatedBrushClient':
                            handleReceivedTranslatedBrushClient(
                                pcRef,
                                socketRef,
                                bm,
                                clientId
                            );
                            break;
                    }
                }
                break;
        }
    };
}


export function handleReceivedTranslatedBrushClient(pcRef, socketRef, receivedData, clientId) {
    // alert(receivedData.type);
    console.log("  <<< translatedBrush:");
    console.log(receivedData);
    pcRef.pc.updatePlotsView(-1, receivedData.range ?? []);

    let timeToUpdatePlots = pcRef.pc.BENCHMARK.deltaUpdatePlots;
    let timeToProcessBrushLocally = pcRef.pc.BENCHMARK.deltaUpdateIndexes;

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "receivedBrush",
            timeToProcessBrushLocally: timeToProcessBrushLocally,
            timeToUpdatePlots: timeToUpdatePlots,
            timeSent: receivedData.timeSent,
            brushId: receivedData.brushId,
            clientId: clientId,
            brushClientId: receivedData.clientId,
        },
    };

    let socket = socketRef.socket;
    socket.send(JSON.stringify(message));
    console.log(">>receivedBrush:"); // TODO: here maybe
    console.log(message);
}

export function handleReceivedDoBrush(pcRef, socketRef, receivedData, clientId) {
    console.log("  <<< doBrushClient:");
    console.log(receivedData);

    pcRef.pc.updatePlotsView(-1, receivedData.range ?? []);

    let timeToUpdatePlots = pcRef.pc.BENCHMARK.deltaUpdatePlots;
    let timeToProcessBrushLocally = pcRef.pc.BENCHMARK.deltaUpdateIndexes;

    let reducedSelection = new rangeSet();
    for (let [id, plot] of pcRef.pc._plots.entries()) {
        if (id !== 0) {
            reducedSelection.addSelectionArr(
                JSON.parse(JSON.stringify(plot.lastSelectionRange))
            );
        }
    }
    // reducedSelection.addSelectionArr(JSON.parse(JSON.stringify(receivedData.range)));

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "brushed",
            timeToProcessBrushLocally: timeToProcessBrushLocally,
            timeToUpdatePlots: timeToUpdatePlots,
            range: reducedSelection.toArr(),
            timeSent: receivedData.timeSent,
            brushId: receivedData.brushId,
            clientId: clientId,
        },
    };

    let socket = socketRef.socket;
    socket.send(JSON.stringify(message));
    console.log(">>brushed: ");
    console.log(message);
}

export function waitForStartTrigger(
    socketRef,
    pcRef,
    clientId,
    receivedBrushThrottle
) {
    const socket = socketRef.socket;
    // (A) build your long‑lived handler exactly once:
    // const onMessageFun = createSocketMessageHandler({
    //     pcRef,
    //     socketRef,
    //     clientId,
    //     receivedBrushThrottle,
    // });

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
                // socket.addEventListener("message", onMessageFun);
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
