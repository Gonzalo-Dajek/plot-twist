import { PlotCoordinator } from "./plotCoordinator.js";
import { showOffErrorMsg } from "../uiLogic/crossDataSetLinks.js";
import { rangeSet } from "./rangeSet.js";
import { adjustBodyStyle } from "../uiLogic/gridUtils.js";

export class eventsCoordinator {
    _plotCoordinatorPerDataSet = [];

    _plotsModules = null;
    _linksModules = null;

    _url = null;
    _socket = null;

    _clientName = null;

    _localSelectionPerDataset = [];
    _serverSelectionPerClient = [];
    _serverSelectionPerDataSet = [];

    _dataSets = []; // Dict dsName -> colorIndex,fieldsArr
    _localColorPool =
        ["#5C6BC0",
        "#E4572E",
        "#00A676",
        "#C44D9F",
        "#F3A712"];

    constructor(plots, url, links, name) {
        this._plotsModules = plots;
        this._linksModules = links;
        this._url = url;
        this._clientName = name;
    }

    sendSelection(selection, dsName) {
        this._localSelectionPerDataset[dsName] = selection;
        if (this._socket.readyState === WebSocket.OPEN) {
            let msg = {
                type: "selection",
                clientsSelections: [
                    {
                        clientName: this._clientName,
                        selectionPerDataSet: [
                            {
                                dataSetName: dsName,
                                selection: selection,
                            },
                        ],
                    },
                ],
            };
            // console.log(msg);
            // console.log(JSON.stringify(msg));
            this._socket.send(JSON.stringify(msg));
        }
        // TODO: propagate selection to other plot coordinators
    }

    _selectionPerClientToPerDataSet(selectionPerClient) {
        const resultMap = new Map();

        for (const client of selectionPerClient) {
            for (const ds of client.selectionPerDataSet) {
                if (!resultMap.has(ds.dataSetName)) {
                    resultMap.set(ds.dataSetName, []);
                }

                resultMap.get(ds.dataSetName).push(...ds.selection);
            }
        }

        let nonCompressedSelections = Array.from(resultMap.entries()).map(
            ([dataSetName, selections]) => ({
                dataSetName,
                selection: selections,
            })
        );

        function compressSelection(selection) {
            let ranges = new rangeSet();
            ranges.addSelectionArr(selection);
            return ranges.toArr();
        }

        return nonCompressedSelections.map(ds => ({
            dataSetName: ds.dataSetName,
            selection: compressSelection(ds.selection)
        }));
    }

    createWebSocketConnection() {
        this._socket = new WebSocket(this._url);

        this._socket.onopen = () => {
            const message = {
                type: "addClient",
            };

            this._socket.send(JSON.stringify(message));
        }

        this._socket.onmessage = ({ data }) => {
            const msg = JSON.parse(data);
            if (msg.type === "selection") {
                // console.log(msg.clientsSelections);
                this._serverSelectionPerClient = msg.clientsSelections;
                this._serverSelectionPerDataSet = this._selectionPerClientToPerDataSet(msg.clientsSelections);

                this.updateStateOfPlotCoordinators();
            }else if (msg.type === "dataSets") {
                console.log("dataSets:", msg.dataSet);
                this._dataSets = Object.fromEntries(
                    msg.dataSet.map(ds => [ds.name, {
                        fields: ds.fields,
                        dataSetColorIndex: ds.dataSetColorIndex
                    }])
                );
                this.updateStateOfPlotCoordinators();
            } else if (msg.type === 'link') {
                // TODO: also handle dataSetColors
            }
            adjustBodyStyle();
        };

        this._socket.onclose = function () {
            console.log("WebSocket connection closed");
        };

        this._socket.onerror = function (error) {
            console.log("WebSocket error:", error);
            console.log("The server is offline");
            // showOffErrorMsg("The server is offline");
        };

        document.getElementById("slide-menu-btn").style.display = "flex";
    }

    plotTypes() {
        return this._plotsModules;
    }

    sendDataSetInfo(dataSet, dataSetName){
        let pc = this.getDataSetPlotCoordinator(dataSetName);
        // Find the current highest dataSetColorIndex
        const currentIndices = Object.values(this._dataSets).map(ds => ds.dataSetColorIndex ?? -1);
        let nextIndex = currentIndices.length ? Math.max(...currentIndices) + 1 : 0;
        this._dataSets[dataSetName] = {
            fields: pc.fields(),
            dataSetColorIndex: nextIndex,
        };

        if (this._socket.readyState === WebSocket.OPEN) {
            let msg = {
                type: "addDataSet",
                dataSet: [
                    {
                        name: dataSetName,
                        fields: pc.fields(),
                    }
                ],
            };
            // console.log(msg);
            // console.log(JSON.stringify(msg));
            this._socket.send(JSON.stringify(msg));
        }
        this.updateStateOfPlotCoordinators();

    }

    addDataSet(dataSet, dataSetName) {
        const existingIndex = this._plotCoordinatorPerDataSet.findIndex(pc => pc.dsName === dataSetName);

        // Create new PlotCoordinator
        const plotCoordinator = new PlotCoordinator();
        plotCoordinator.init(dataSet, dataSetName);
        plotCoordinator.onSelectionDo((selection, name) => {
            this.sendSelection(selection, name);
        });

        // Replace if exists, otherwise unshift
        if (existingIndex !== -1) {
            this._plotCoordinatorPerDataSet[existingIndex] = plotCoordinator;
        } else {
            this._plotCoordinatorPerDataSet.unshift(plotCoordinator);
        }

        this.sendDataSetInfo(dataSet, dataSetName);
        this.updateStateOfPlotCoordinators();
    }

    updateStateOfPlotCoordinators() {
        for (let plotCoordinator of this._plotCoordinatorPerDataSet) {
            let dsName = plotCoordinator.dsName;
            let dataSetColor = this._localColorPool[this._dataSets[dsName].dataSetColorIndex];
            let dsServerSelection = this._serverSelectionPerDataSet.find(ds => ds.dataSetName === dsName);
            dsServerSelection = dsServerSelection ? dsServerSelection.selection : [];
            plotCoordinator.updateColor(dataSetColor);
            plotCoordinator.throttledUpdatePlotsView(0, dsServerSelection);
        }
    }

    getDataSetPlotCoordinator(dataSetName) {
        return this._plotCoordinatorPerDataSet[0];
        // return this._plotCoordinatorPerDataSet.find(pc => pc.dsName === dataSetName);
    }

    removeAllPlots() {
        for (let plotCoordinator of this._plotCoordinatorPerDataSet) {
            plotCoordinator.removeAll();
        }
    }
}