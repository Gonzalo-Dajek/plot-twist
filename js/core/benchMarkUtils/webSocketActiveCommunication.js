import { rangeSet } from "../rangeSet.js";

export function setupSelectionBroadcast(pcRef, socketRef, clientId) {
    pcRef.pc.addPlot(0, () => {
        // let selection = new rangeSet();
        // for (let [id, plot] of pcRef.pc._plots.entries()) {
        //     if (id !== 0) {
        //         selection.addSelectionArr(JSON.parse(JSON.stringify(plot.lastSelectionRange)));
        //     }
        // }
        //
        // let timeToUpdatePlots = pcRef.pc.BENCHMARK.deltaUpdatePlots;
        // let timeToProcessBrushLocally = pcRef.pc.BENCHMARK.deltaUpdateIndexes;
        //
        // let message = {
        //     type: "BenchMark",
        //     benchMark: {
        //         action: "selectionMade",
        //         range: selection.toArr(),
        //         timeToProcessBrushLocally: timeToProcessBrushLocally,
        //         timeToUpdatePlots: timeToUpdatePlots,
        //         brushId: -1, // TODO: add brushID
        //         timeSent: -1,
        //         clientId: clientId,
        //     },
        // };
        //
        // socketRef.socket.send(JSON.stringify(message));
    });
}

export function sendClientInfo(clientInfo, socketRef, clientId, pcRef) {
    let socket = socketRef.socket;

    return new Promise((resolve) => {
        function sendClientInfoWhenOpen() {
            let message = {
                type: "BenchMark",
                benchMark: {
                    action: "addClientBenchMark",
                    clientInfo: clientInfo,
                    clientId,
                },
                dataSet: { name: pcRef.pc.dsName, fields: pcRef.pc.fields() },
            };

            socket.send(JSON.stringify(message));

            resolve();
        }

        if (socket.readyState === WebSocket.OPEN) {
            sendClientInfoWhenOpen();
        } else {
            socket.addEventListener("open", () => {
                sendClientInfoWhenOpen();
            }, { once: true });
        }
    });
}

export function createFieldGroups(socketRef, numFieldGroupsAmount, catFieldsGroupsAmount, dataSetNum) {
    let socket = socketRef.socket;

    return new Promise((resolve) => {
        function sendLinkGroups() {
            // Loop for numerical
            for (let i = 0; i < numFieldGroupsAmount; i++) {
                let message = {
                    type: "link",
                    links: [{
                        group: `fieldGroup${i}`,
                        field: null,
                        dataSet: `BenchMarkData${dataSetNum}`,
                        action: "create",
                    }],
                };

                socket.send(JSON.stringify(message));
            }

            for (let i = 0; i < numFieldGroupsAmount; i++) {
                let message = {
                    type: "link",
                    links: [{
                        group: `fieldGroup${i}`,
                        field: `field${i}`,
                        dataSet: `BenchMarkData${dataSetNum}`,
                        action: "update",
                    }],
                };

                socket.send(JSON.stringify(message));
            }

            // Loop for categorical
            for (let i = 0; i < catFieldsGroupsAmount; i++) {
                let message = {
                    type: "link",
                    links: [{
                        group: `catFieldGroup${i}`,
                        field: null,
                        dataSet: `BenchMarkData${dataSetNum}`,
                        action: "create",
                    }],
                };

                socket.send(JSON.stringify(message));
            }

            for (let i = 0; i < catFieldsGroupsAmount; i++) {
                let message = {
                    type: "link",
                    links: [{
                        group: `catFieldGroup${i}`,
                        field: `catField${i}`,
                        dataSet: `BenchMarkData${dataSetNum}`,
                        action: "update",
                    }],
                };

                socket.send(JSON.stringify(message));
            }

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

export function deleteFieldGroups(socketRef, numFieldGroupsAmount, catFieldsGroupsAmount, dataSetNum) {
    let socket = socketRef.socket;

    // Delete numerical field groups
    for (let i = 0; i < numFieldGroupsAmount; i++) {
        let message = {
            type: "link",
            links: [{
                group: `fieldGroup${i}`,
                field: `field${i}`,
                dataSet: `BenchMarkData${dataSetNum}`,
                action: "delete",
            }],
        };


        socket.send(JSON.stringify(message));
    }

    // Delete categorical field groups
    for (let i = 0; i < catFieldsGroupsAmount; i++) {
        let message = {
            type: "link",
            links: [{
                group: `catFieldGroup${i}`,
                field: `catField${i}`,
                dataSet: `BenchMarkData${dataSetNum}`,
                action: "delete",
            }],
        };

        socket.send(JSON.stringify(message));
    }
}
