import { initTopBarScroll } from "../../uiLogic/topBarScroll.js";
import { initExportLayout, initGridResizing, initLoadCsv, initLoadLayout } from "../../uiLogic/initUI.js";
import { initFieldGroups, populateGroups } from "../../uiLogic/fieldGroups.js";
import { PlotCoordinator } from "../plotCoordinator.js";
import { rangeSet } from "../rangeSet.js";
import throttle from "lodash-es/throttle.js";
import { adjustBodyStyle, loadLayout } from "../../uiLogic/gridUtils.js";

export function benchMarkSetUp(data, pcRef, plots, url, layoutData, socketRef, dataSetNum, firstTimeInit, clientId, receivedBrushThrottle) {
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
            });

            document.getElementById("slide-menu-btn").style.display = "flex";
        };

        socket.onmessage = function(event) {
            const receivedData = JSON.parse(event.data);
            let message;
            let throttledUpdatePlotsView;
            switch (receivedData.type) {
                case "selection":

                    throttledUpdatePlotsView = throttle((data) => {
                        pcRef.pc.updatePlotsView(0, data);
                    }, receivedBrushThrottle);

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