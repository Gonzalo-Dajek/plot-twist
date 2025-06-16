import { initTopBarScroll } from "../../uiLogic/topBarScroll.js";
import { initExportLayout, initGridResizing, initLoadCsv, initLoadLayout } from "../../uiLogic/initUI.js";
// import { updateCrossDataSetLinkTable } from "../../uiLogic/crossDataSetLinksTable.js";
import { PlotCoordinator } from "../plotCoordinator.js";
import { adjustBodyStyle} from "../../uiLogic/gridUtils.js";
import { createSocketMessageHandler } from "./webSocketPassiveCommunication.js";
import { setupSelectionBroadcast } from "./webSocketActiveCommunication.js";

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
    brushIdRef
) {
    initTopBarScroll();
    initExportLayout();
    initLoadLayout(pcRef, plots);
    initGridResizing(pcRef, plots);
    // updateCrossDataSetLinkTable(pcRef, socketRef);
    initLoadCsv(socketRef, url, plots, "TODO");

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

    if(firstTimeInit){
        socketRef.socket = new WebSocket(url);
        const socket = socketRef.socket;

        socket.onopen = function() {
            setupSelectionBroadcast(pcRef, socketRef, clientId, brushIdRef);
            document.getElementById("slide-menu-btn").style.display = "flex";
        };

        socket.onerror = function(e) {
            console.log(e);
        };
    } else {
        document.getElementById("slide-menu-btn").style.display = "flex";
    }
    socketRef.socket.onmessage = createSocketMessageHandler({
        pcRef,
        socketRef
    });

    adjustBodyStyle();
}
