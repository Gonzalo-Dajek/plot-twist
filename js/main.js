import { scatterPlot } from "./plots/scatterPlot.js";
import { parallelCoordinates } from "./plots/parallelCoordinates.js";
import { histogram } from "./plots/histogram.js";
import { barPlot } from "./plots/barPlot.js";
import { initializeUI } from "./uiLogic/initUI.js";
import { benchMark } from "./core/benchMark.js";
import { directFieldLink } from "./crossTableLinks/directFieldLink.js";

function run(){
    let plots = [
        scatterPlot,
        histogram,
        barPlot,
        parallelCoordinates,
    ];

    let crossTableLinks = [
        directFieldLink,
    ];


    // TODO: add ui to links
    // TODO: add custom linking in plotCoordinator
        // TODO: edit crossDataSetLinks.js

    // TODO: change layout export to include dataset it came from
    // TODO: change brush borders to purple
    // TODO: add selections from other clients in each plot
    // TODO: add mulitple plots in same client functionality

    // TODO: edit createFieldGroups and delete fieldGroups in webSocketActiveCommunication.js

    let ip = "181.94.71.141";
    let url = `ws://${ip}:5226/`;
    const BENCHMARK = false;

    if(BENCHMARK){
        benchMark(plots, url, crossTableLinks).then();
    }else{
        initializeUI(plots, url, crossTableLinks);
    }
}

run();

