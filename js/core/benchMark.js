import { initTopBarScroll } from "../uiLogic/topBarScroll.js";
import { initFieldGroups, populateGroups } from "../uiLogic/fieldGroups.js";
import { initExportLayout, initGridResizing, initLoadCsv, initLoadLayout } from "../uiLogic/initUI.js";
import { adjustBodyStyle, loadLayout } from "../uiLogic/gridUtils.js";
import { PlotCoordinator } from "./plotCoordinator.js";
import { rangeSet } from "./rangeSet.js";
import * as d3 from "d3-random";
import throttle from "lodash-es/throttle.js";

function resetLayout() {
    // also removes all event listeners
    const freshBody = document.createElement("body");
    freshBody.innerHTML = `
        <div class="top-bar-dummy"></div>
        <div class="top-bar-fixedRectangle"></div>

        <div class="top-bar">
            <div class="top-bar-inner">

                <div class="indentFileUpload">
                    <label for="fileInput" class="custom-file-upload top-bar-button">
                        Upload data-set&nbsp;
                        <img src="assets/csv_icon.svg" alt="select CSV" class="csv-icon"/>
                    </label>
                    <input type="file" id="fileInput" class="file-input" />
                </div>

                <button id="loadDemo" class="top-bar-button">
                    Load Demo&nbsp;
                    <img src="assets/launch_icon.svg" class="csv-icon" alt="load demo">
                </button>

                <button id="exportLayoutButton" class="top-bar-button">
                    Save Layout&nbsp;
                    <img src="assets/download_icon.svg" class="csv-icon" alt="download layout file">
                </button>

                <div id="loadLayoutButton" class="indentFileUpload">
                    <label for="layoutInput" class="custom-file-upload top-bar-button">
                        Load layout&nbsp;
                        <img src="assets/upload_icon.svg" alt="upload layout file" class="csv-icon">
                    </label>
                    <input type="file" id="layoutInput" class="file-input" />
                </div>

            </div>
        </div>


        <div id="app-view">
            <div id="grid-container">
                <div id="plotsContainer"></div>
                <button id="col">+</button>
                <button id="row">+</button>
                <div></div>
            </div>
        </div>


        <div class="group-component">
            <span class="group-title">
                Cross data-set Field Groups
            </span>

            <div id="groups-list"></div>

            <div class="add-group-container">
                <label for="input-group-name">Group: </label>
                <input type="text" id="input-group-name">
                <button id="group-name-submit">Add Group</button>
            </div>
        </div>

        <button id="slide-menu-btn">
            <img src="assets/list_icon.svg" alt="Group links button">
            Field Groups
        </button>

        <script type="module" src="/js/main.js"></script>
    `;

    document.body.replaceWith(freshBody);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function dataToTable(matrix, catFieldsAmount) {
    return matrix.map(row =>
        Object.fromEntries(row.map((value, index) =>
            [index < row.length - catFieldsAmount ? `field${index}` : `catField${index - (row.length - catFieldsAmount)}`, value],
        )),
    );
}

function createData(rows, numCols, catCols, distributionType) {
    const data = Array.from({ length: rows }, () => Array(numCols + catCols).fill(0));
    const categories = ["A", "B", "C", "D", "E", "F", "G"];

    for (let col = 0; col < numCols; col++) {
        let values = [];

        switch (distributionType) {
            case "evenly distributed":
                values = Array.from({ length: rows }, () => Math.random());
                break;

            case "big clusters":
            case "small clusters": {
                const numClusters = 2;
                const clusterCenters = Array.from({ length: numClusters }, (_, i) => (i + 1) / (numClusters + 1));
                const spread = distributionType === "big clusters" ? 0.105 : 0.065;

                const rowClusters = Array.from({ length: rows }, () => clusterCenters[Math.floor(Math.random() * numClusters)]);

                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < numCols; col++) {
                        const value = d3.randomNormal(rowClusters[row], spread)();
                        data[row][col] = Math.max(0, Math.min(1, value));
                    }
                }
                break;
            }

            default:
                throw new Error("Invalid distribution type");
        }

        for (let row = 0; row < rows; row++) {
            data[row][col] = values[row];
        }
    }

    for (let col = numCols; col < numCols + catCols; col++) {
        for (let row = 0; row < rows; row++) {
            data[row][col] = categories[Math.floor(Math.random() * categories.length)];
        }
    }

    return data;
}

function receivedBrushTimings(pcRef, socketRef, receivedData, clientId) {
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

function setUpLayout(data, pcRef, plots, url, layoutData, socketRef, dataSetNum, firstTimeInit, clientId) {
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

    if (firstTimeInit) {
        socketRef.socket = new WebSocket(url);
        let socket = socketRef.socket;

        socket.onopen = function() {
            // console.log("WebSocket is open now.");
            pcRef.pc.addPlot(0, () => {
                let selection = new rangeSet();
                for (let [id, plot] of pcRef.pc._plots.entries()) {
                    if (id !== 0) {
                        selection.addSelectionArr(JSON.parse(JSON.stringify(plot.lastSelectionRange)));
                    }
                }

                const message = {
                    type: "selection",
                    range: selection.toArr(),
                };

                socket.send(JSON.stringify(message));
                // console.log("Sent message:", message);
            });

            document.getElementById("slide-menu-btn").style.display = "flex";
        };

        // When a message is received
        socket.onmessage = function(event) {
            const receivedData = JSON.parse(event.data);
            let message;
            let throttledUpdatePlotsView;
            switch (receivedData.type) {
                case "selection":
                    // console.log("Message from server:", receivedData);

                    throttledUpdatePlotsView = throttle((data) => {
                        pcRef.pc.updatePlotsView(0, data);
                    }, 100);

                    throttledUpdatePlotsView(receivedData.range ?? []);
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

        socket.onerror = function(e){
            console.log(e);
        }
    } else {
        document.getElementById("slide-menu-btn").style.display = "flex";
    }

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
                // layout[1].push({
                //     type: "Histogram",
                //     col: col + 1,
                //     row: row + 1,
                //     fields: [{ fieldName: "bin-variable", fieldSelected: `field${col}` }],
                //     options: [],
                // });
                // plotCount++;
            } else if (row < col) {
                // Upper triangle: Scatter Plot
                layout[1].push({
                    type: "Scatter Plot",
                    col: col,
                    row: row+1,
                    fields: [
                        { fieldName: "x-axis", fieldSelected: `field${row}` },
                        { fieldName: "y-axis", fieldSelected: `field${col}` },
                    ],
                    options: [
                        { optionName: "linear regression", optionCheckBox: false },
                        { optionName: "Spearman coefficient", optionCheckBox: false },
                        { optionName: "Pearson coefficient", optionCheckBox: false },
                    ],
                });
                plotCount++;
            }
        }
    }

    return layout;
}

function createSelection(a, b, numFields, catFields) {
    const numericalSelections = Array.from({ length: numFields }, (_, i) => ({
        range: [a, b],
        field: `field${i}`,
        type: "numerical",
    }));

    const categoricalSelections = Array.from({ length: catFields }, (_, i) => ({
        categories: ["A", "B", "C"],
        field: `catField${i}`,
        type: "categorical",
    }));

    return [...numericalSelections, ...categoricalSelections];
}

function createFieldGroups(socketRef, numFieldGroupsAmount, catFieldsGroupsAmount, dataSetNum) {
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

function deleteFieldGroups(socketRef, numFieldGroupsAmount, catFieldsGroupsAmount, dataSetNum) {
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

        // console.log("Sent message: ", message);
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

        // console.log("Sent message: ", message);
        socket.send(JSON.stringify(message));
    }
}

function sendBrushTimings(pcRef, socketRef, selection, clientId) {
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

async function brushBackAndForth(steps, stepSize, numDimensionsSelected, catDimensionsSelected, pcRef, id, brushSize, socketRef, clientId) {
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

        let a = x - (brushSize / 2);
        let b = x + (brushSize / 2);
        let selection = createSelection(a, b, numDimensionsSelected, catDimensionsSelected);
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

function sendClientInfo(clientInfo, socketRef, clientId, pcRef) {

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
                dataSet: { name: pcRef.pc.dsName, fields: pcRef.pc.fields() },
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

function sendStartTrigger(socketRef) {
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
            if (receivedData.type === "BenchMark" && receivedData.benchMark.action === "start") {
                console.log("BenchMark Started");
                socket.removeEventListener("message", handler); // Clean up listener

                // console.log(config);
                socketRef.socket.onmessage = function(event) {
                    const receivedData = JSON.parse(event.data);
                    let throttledReceivedBrushTimings;
                    let message;
                    switch (receivedData.type) {
                        case "selection":
                            throttledReceivedBrushTimings = throttle(receivedBrushTimings, 50);
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

                resolve(receivedData); // Resolve promise with message data
            }
        }

        socket.addEventListener("message", handler);
    });
}

function waitForEndTrigger(socketRef, pcRef, clientId) {
    let socket = socketRef.socket;
    return new Promise((resolve) => {
        function handler(event) {
            const receivedData = JSON.parse(event.data);
            if (receivedData.type === "BenchMark" && receivedData.benchMark.action === "end") {
                console.log("   BenchMark Ended");
                socket.removeEventListener("message", handler);

                socketRef.socket.onmessage = function(event) {
                    const receivedData = JSON.parse(event.data);
                    let message;
                    let throttledReceivedBrushTimings;
                    switch (receivedData.type) {
                        case "selection":
                            throttledReceivedBrushTimings = throttle(receivedBrushTimings, 50);
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

function sendEndTrigger(socketRef) {
    let socket = socketRef.socket;

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "end",
        },
    };

    socket.send(JSON.stringify(message));
}

function generateConfigs(config, stepsConfig, stepSizes = {}) {
    const numericKeys = Object.keys(config).filter(key => typeof config[key] === "number");
    const configs = [];

    const newConfig3 = { ...config };
    configs.push(newConfig3);

    numericKeys.forEach(key => {
        const originalValue = config[key];
        const stepSize = stepSizes[key];
        const steps = stepsConfig[key] * 2 + 1;

        for (let i = -Math.floor(steps / 2); i <= Math.floor(steps / 2); i++) {
            if (i === 0) continue;

            const newConfig = {
                ...config,
                [key]: originalValue + i * stepSize,
                testDuration: config.testDuration,
                dataSetNum: config.dataSetNum,
                clientId: config.clientId,
            };
            configs.push(newConfig);
        }
    });

    const newConfig1 = {
        ...config,
        dataDistribution: "big clusters",
        testDuration: config.testDuration,
        dataSetNum: config.dataSetNum,
        clientId: config.clientId,
    };
    configs.push(newConfig1);
    const newConfig2 = {
        ...config,
        dataDistribution: "small clusters",
        testDuration: config.testDuration,
        dataSetNum: config.dataSetNum,
        clientId: config.clientId,
    };
    configs.push(newConfig2);

    return configs;
}

export async function benchMark(plots, url, clientId) {
    // TODO: test multiple clients

    // TODO: brused dimensions selected
    const baseConfig = {
        plotsAmount: 6,
        numColumnsAmount: 30,
        catColumnsAmount: 5,
        entriesAmount: 1000,
        numDimensionsSelected: 5,
        catDimensionsSelected: 3,
        numFieldGroupsAmount: 2,
        catFieldGroupsAmount: 1,
        brushSize: 0.50,
        stepSize: 0.20, // =~ (1/stepSize)*50 ms
        numberOfClientBrushing: 3,
        numberOfDataSets: 3,
        dataDistribution: "evenly distributed",
        testDuration: 0.05, // TODO: 90
        dataSetNum: null,
        clientId,
    };
    baseConfig.dataSetNum = clientId % baseConfig.numberOfDataSets;

    const stepSizes = {
        plotsAmount: 1,
        numColumnsAmount: 2,
        catColumnsAmount: 1,
        entriesAmount: 100,
        numDimensionsSelected: 1,
        catDimensionsSelected: 1,
        numFieldGroupsAmount: 1,
        catFieldGroupsAmount: 1,
        brushSize: 0.05,
        stepSize: 0.05,
        numberOfClientBrushing: 1,
        numberOfDataSets: 1,
    };

    const stepsAmounts = {
        plotsAmount: 4,
        numColumnsAmount: 11,
        catColumnsAmount: 4,
        entriesAmount: 9,
        numDimensionsSelected: 5,
        catDimensionsSelected: 3,
        numFieldGroupsAmount: 2,
        catFieldGroupsAmount: 1,
        brushSize: 5,
        stepSize: 3,
        numberOfClientBrushing: 2,
        numberOfDataSets: 2,
    };

    let socketRef;
    let firstTimeInit = true;
    const isMainClient = clientId === 1;
    const modifiedConfigs = generateConfigs(baseConfig, stepsAmounts, stepSizes);

    for (let i = 0; i < modifiedConfigs.length; i++) {
        const cfg = modifiedConfigs[i];
        const percentage = ((i + 1) / modifiedConfigs.length) * 100;
        console.log(`(${i+1} / ${modifiedConfigs.length}): ${percentage.toFixed(2)}%`);
    //     {
    //         let cfg = baseConfig;


        if (isMainClient && !firstTimeInit) {
            await wait(60000);
        }

        const isValidConfig = cfg.numColumnsAmount > cfg.numDimensionsSelected &&
            cfg.numColumnsAmount > cfg.numFieldGroupsAmount &&
            cfg.catColumnsAmount > cfg.catDimensionsSelected &&
            cfg.catColumnsAmount > cfg.catFieldGroupsAmount;
        if(!isValidConfig){
            console.error("INVALID CONFIG: ");
            console.error(cfg);
        }

        const data = createData(cfg.entriesAmount, cfg.numColumnsAmount, cfg.catColumnsAmount, cfg.dataDistribution);
        const table = dataToTable(data, cfg.catColumnsAmount);
        const layoutData = createLayout(cfg.plotsAmount, cfg.numColumnsAmount);

        if (firstTimeInit) {
            socketRef = { socket: undefined };
        }
        const pcRef = { pc: undefined };

        setUpLayout(table, pcRef, plots, url, layoutData, socketRef, cfg.dataSetNum, firstTimeInit, clientId);

        await sendClientInfo(cfg, socketRef, clientId, pcRef);

        if(!firstTimeInit){
            pcRef.pc.addPlot(0, () => {
                let selection = new rangeSet();
                for (let [id, plot] of pcRef.pc._plots.entries()) {
                    if (id !== 0) {
                        selection.addSelectionArr(JSON.parse(JSON.stringify(plot.lastSelectionRange)));
                    }
                }

                const message = {
                    type: "selection",
                    range: selection.toArr(),
                };

                socketRef.socket.send(JSON.stringify(message));
            });
        }

        pcRef.pc.BENCHMARK.isActive = true;
        let id = -1;
        pcRef.pc.addPlot(id, () => {
        });

        if (isMainClient) {
            for (let dataSetNum = 0; dataSetNum < cfg.numberOfDataSets; dataSetNum++) {
                await createFieldGroups(socketRef, cfg.numFieldGroupsAmount, cfg.catFieldGroupsAmount, dataSetNum);
            }

            await sendStartTrigger(socketRef);
        }

        await waitForStartTrigger(socketRef, pcRef, clientId, cfg);

        console.log(cfg);

        if (clientId <= cfg.numberOfClientBrushing) {
            await brushBackAndForth(
                (cfg.testDuration * 1000 / 50) * 0.75,
                cfg.stepSize,
                cfg.numDimensionsSelected,
                cfg.catDimensionsSelected,
                pcRef,
                id,
                cfg.brushSize,
                socketRef,
                clientId,
            );
        }

        if (isMainClient) {
            await wait(1000);

            for (let dataSetNum = 0; dataSetNum < cfg.numberOfDataSets; dataSetNum++) {
                deleteFieldGroups(socketRef, cfg.numFieldGroupsAmount, cfg.catFieldGroupsAmount, dataSetNum);
            }

            await wait(60000);
            sendEndTrigger(socketRef);
        }

        await waitForEndTrigger(socketRef, pcRef, clientId);

        resetLayout();

        await wait(1000);

        firstTimeInit = false;
    }
}
