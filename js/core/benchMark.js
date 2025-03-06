import { initTopBarScroll } from "../uiLogic/topBarScroll.js";
import { initFieldGroups, connectToWebSocket, populateGroups } from "../uiLogic/fieldGroups.js";
import { initExportLayout, initGridResizing, initLoadCsv, initLoadLayout } from "../uiLogic/initUI.js";
import { adjustBodyStyle, loadLayout } from "../uiLogic/gridUtils.js";
import { PlotCoordinator } from "./plotCoordinator.js";
import { rangeSet } from "./rangeSet.js";

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function dataToTable(matrix) {
    return matrix.map(row =>
        Object.fromEntries(row.map((value, index) => [`field${index}`, value]))
    );
}

function createData(rows, cols) {
    // TODO: add categorical data

    // Linear correlation between all fields
    // return Array.from({ length: rows }, (_, rowIndex) =>
    //     Array(cols).fill(rowIndex)
    // );

    // Evenly spaced points
    const data = Array.from({ length: rows }, () => Array(cols).fill(0));
    const step = 1 / rows; // Even spacing

    for (let col = 0; col < cols; col++) {
        let values = Array.from({ length: rows }, (_, i) => (i + Math.random()) * step); // Jitter inside bins
        values = values.sort(() => Math.random() - 0.5); // Shuffle to break alignment (This relies in undefined behaviour and acts differently depending on the browser)

        for (let row = 0; row < rows; row++) {
            data[row][col] = values[row];
        }
    }

    return data;
}

function receivedBrushTimings(pcRef, socketRef, receivedData, clientId){
    pcRef.pc.updatePlotsView(0, receivedData.range ?? []);
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

function setUpLayout(data, pcRef, plots, url, layoutData, socketRef, dataSetNum){
    initTopBarScroll();
    initExportLayout();
    initLoadLayout(pcRef, plots);
    initGridResizing(pcRef, plots);
    initFieldGroups(pcRef, socketRef);
    initLoadCsv(pcRef, socketRef, url, plots);

    const container = document.getElementById("plotsContainer");
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    pcRef.pc = new PlotCoordinator();
    pcRef.pc.init(data, `BenchMarkData${dataSetNum}`);

    document.getElementById("col").style.display = "flex";
    document.getElementById("row").style.display = "flex";
    document.getElementById("loadLayoutButton").style.display = "flex";
    document.getElementById("exportLayoutButton").style.display = "flex";

    connectToWebSocket(socketRef, pcRef, url);

    loadLayout(layoutData, pcRef, plots);
    adjustBodyStyle();
}

function createLayout(plotAmounts, numFields) {
    const layout = [{ col: numFields, row: numFields }, []];
    let plotCount = 0;

    for (let row = 0; row < numFields; row++) {
        for (let col = 0; col < numFields; col++) {
            if (plotCount >= plotAmounts) return layout;

            if (row === col) {
                // Diagonal: Histogram
                layout[1].push({
                    type: "Histogram",
                    col: col + 1,
                    row: row + 1,
                    fields: [{ fieldName: "bin-variable", fieldSelected: `field${col}` }],
                    options: []
                });
                plotCount++;
            } else if (row < col) {
                // Upper triangle: Scatter Plot
                layout[1].push({
                    type: "Scatter Plot",
                    col: col + 1,
                    row: row + 1,
                    fields: [
                        { fieldName: "x-axis", fieldSelected: `field${row}` },
                        { fieldName: "y-axis", fieldSelected: `field${col}` }
                    ],
                    options: [
                        { optionName: "linear regression", optionCheckBox: false },
                        { optionName: "Spearman coefficient", optionCheckBox: false },
                        { optionName: "Pearson coefficient", optionCheckBox: false }
                    ]
                });
                plotCount++;
            }
        }
    }

    return layout;
}

function createSelection(a, b, numFields) {
    // TODO: consider categorical selection
    return Array.from({ length: numFields }, (_, i) => ({
        range: [a, b],
        field: `field${i}`,
        type: "numerical",
    }));
}

function createFieldGroups(socketRef, fieldGroupsAmount, dataSetNum) {
    let socket = socketRef.socket;

    return new Promise((resolve) => {
        function sendLinkGroups() {
            for (let i = 0; i < fieldGroupsAmount; i++) {
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

            for (let i = 0; i < fieldGroupsAmount; i++) {
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

            resolve(); // Resolve the promise after sending all messages
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

function deleteFieldGroups(socketRef, fieldGroupsAmount, dataSetNum){
    let socket = socketRef.socket;
    for (let i = 0; i < fieldGroupsAmount; i++) {
        let message = {
            type: "link",
            links: [{
                group: `fieldGroup${i}`,
                field: `field${i}`,
                dataSet: `BenchMarkData${dataSetNum}`,
                action: "delete",
            }],
        };

        // console.log("Sent message: ", message);
        socket.send(JSON.stringify(message));
    }
}

function sendBrushTimings(pcRef, socketRef, selection, clientId){
    let timeToUpdatePlots = pcRef.pc.BENCHMARK.deltaUpdatePlots;
    let timeToProcessBrushLocally = pcRef.pc.BENCHMARK.deltaUpdateIndexes;

    let reducedSelection = new rangeSet();
    for (let [id, plot] of pcRef.pc._plots.entries()) {
        if (id !== 0) {
            reducedSelection.addSelectionArr(JSON.parse(JSON.stringify(plot.lastSelectionRange)));
        }
    }
    reducedSelection.addSelectionArr(JSON.parse(JSON.stringify(selection)));

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "brush",
            timeToProcessBrushLocally: timeToProcessBrushLocally,
            timeToUpdatePlots: timeToUpdatePlots,
            timeSent: Date.now(),
            range: reducedSelection.toArr(),
            clientId: clientId,
        },
    };

    let socket = socketRef.socket;
    socket.send(JSON.stringify(message));
}

async function brushBackAndForth(steps, stepSize, dimensionsSelected, pcRef, id, brushSize, socketRef, clientId) {
    let startPos = 0.2;
    let endPos = 0.8;
    let x = startPos; // Start position

    let forward = true;
    for (let i = 0; i < steps; i++) {
        // Move step
        if (forward) {
            x += stepSize;
            if (x >= endPos) forward = false; // Switch direction if reaching the end
        } else {
            x -= stepSize;
            if (x <= startPos) forward = true;
        }

        let startTime = performance.now();

        let a = x-(brushSize/2);
        let b = x+(brushSize/2);
        let selection= createSelection(a, b, dimensionsSelected);
        pcRef.pc.updatePlotsView(id, selection);

        sendBrushTimings(pcRef, socketRef, selection, clientId);

        let elapsed = performance.now() - startTime;
        let timeInterval = 50;
        let remainingTime = Math.max(timeInterval - elapsed, 0);

        if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
    }

    pcRef.pc.updatePlotsView(id, []);
    sendBrushTimings(pcRef, socketRef, [], clientId);
}

function sendClientInfo(
    clientInfo,
    socketRef,
    clientId
) {

    let socket = socketRef.socket;

    return new Promise((resolve) => {
        function sendClientInfo() {
            let message = {
                type: "BenchMark",
                benchMark: {
                    action: "addClientBenchMark",
                    clientInfo: clientInfo,
                    clientId,
                },
            };

            socket.send(JSON.stringify(message));

            resolve();
        }

        if (socket.readyState === WebSocket.OPEN) {
            sendClientInfo();
        } else {
            socket.addEventListener("open", () => {
                sendClientInfo();
            }, { once: true });
        }
    });
}

function sendStartTrigger(socketRef){
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

function waitForStartTrigger(socketRef, pcRef, clientId) {
    let socket = socketRef.socket;
    return new Promise((resolve) => {
        function handler(event) {
            const receivedData = JSON.parse(event.data);
            if (receivedData.type === "BenchMark" && receivedData.benchMark.action==="start") {
                console.log("BenchMark Started");
                socket.removeEventListener("message", handler); // Clean up listener

                socketRef.socket.onmessage = function(event) {
                    const receivedData = JSON.parse(event.data);

                    switch (receivedData.type) {
                        case "selection":
                            receivedBrushTimings(pcRef, socketRef, receivedData, clientId);
                            break;
                        case "link":
                            populateGroups(receivedData.links, pcRef.pc.fields(), socketRef, pcRef);
                            break;
                    }
                };

                resolve(receivedData); // Resolve promise with message data
            }
        }

        socket.addEventListener("message", handler);
    });
}

function sendEndTrigger(socketRef){
    let socket = socketRef.socket;

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "end",
        },
    };

    socket.send(JSON.stringify(message));
}

export async function benchMark(plots, url, clientId){

    let numberOfDataSets = 2;
    const config = {
        typeOfData: "evenly distributed", // TODO: types of data
        plotsAmount: 6,
        columnsAmount: 4,
        catColumnsAmount: 2,
        entriesAmount: 1000,
        dimensionsSelected: 3,
        catDimensionsSelected: 0,
        fieldGroupsAmount: 2,
        brushSize: 0.40,
        stepSize: 0.1,
        numberOfClientBrushing: 1,
        numberOfDataSets,
        testDuration: 1, // 0.05
        dataSetNum: clientId % numberOfDataSets,
        clientId,
    };

    const isInvalid =
        !(config.columnsAmount >= config.fieldGroupsAmount) ||
        !(config.catColumnsAmount >= config.catDimensionsSelected) ||
        !(config.columnsAmount >= config.dimensionsSelected) ||
        !(config.plotsAmount <= (config.columnsAmount * (config.columnsAmount + 1)) / 2);

    if (isInvalid) {
        console.error(`Invalid initial variables`);
        alert(`Invalid initial variables`);
    }

    const data = createData(config.entriesAmount, config.columnsAmount);
    const table = dataToTable(data);
    const layoutData = createLayout(config.plotsAmount, config.columnsAmount);

    const socketRef = { socket: undefined };
    const pcRef = { pc: undefined };

    setUpLayout(table, pcRef, plots, url, layoutData, socketRef, config.dataSetNum);

    await sendClientInfo(config, socketRef, clientId);

    pcRef.pc.BENCHMARK.isActive = true;
    let id = -1;
    pcRef.pc.addPlot(id, () => {});

    const isMainClient = clientId === 1;
    if (isMainClient) {
        for (let dataSetNum = 0; dataSetNum < config.numberOfDataSets; dataSetNum++) {
            await createFieldGroups(socketRef, config.fieldGroupsAmount, dataSetNum);
        }

        await sendStartTrigger(socketRef);
    }

    await waitForStartTrigger(socketRef, pcRef, clientId);

    if (clientId <= config.numberOfClientBrushing) {
        await brushBackAndForth(
            (config.testDuration * 1000 / 50) * 0.75,
            config.stepSize,
            config.dimensionsSelected,
            pcRef,
            id,
            config.brushSize,
            socketRef,
            clientId
        );
    }

    if (isMainClient) {
        await wait(5000);
        sendEndTrigger(socketRef);
        await wait(2000);

        for (let dataSetNum = 0; dataSetNum < config.numberOfDataSets; dataSetNum++) {
            deleteFieldGroups(socketRef, config.fieldGroupsAmount, dataSetNum);
        }
    }
}

