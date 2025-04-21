import { initTopBarScroll } from "../../uiLogic/topBarScroll.js";
import { initExportLayout, initGridResizing, initLoadCsv, initLoadLayout } from "../../uiLogic/initUI.js";
import { initFieldGroups } from "../../uiLogic/fieldGroups.js";
import { PlotCoordinator } from "../plotCoordinator.js";
import { rangeSet } from "../rangeSet.js";
import { adjustBodyStyle, loadLayout } from "../../uiLogic/gridUtils.js";
import { createSocketMessageHandler } from "./webSocketPassiveCommunication.js";

export function benchMarkSetUp(
    data,
    pcRef,
    plots,
    url,
    layoutData,
    socketRef,
    dataSetNum,
    firstTimeInit,
    clientId,
    receivedBrushThrottle
) {
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
        const socket = socketRef.socket;

        socket.onopen = function() {
            pcRef.pc.addPlot(0, () => {
                const selection = new rangeSet();
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

        socket.onmessage = createSocketMessageHandler({
            pcRef,
            socketRef,
            clientId,
            receivedBrushThrottle,
        });

        socket.onerror = function(e) {
            console.log(e);
        };
    } else {
        document.getElementById("slide-menu-btn").style.display = "flex";
    }

    loadLayout(layoutData, pcRef, plots);
    adjustBodyStyle();
}
