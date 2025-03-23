import { scatterPlot } from "./plots/scatterPlot.js";
import { parallelCoordinates } from "./plots/parallelCoordinates.js";
import { histogram } from "./plots/histogram.js";
import { barPlot } from "./plots/barPlot.js";
import { initializeUI } from "./uiLogic/initUI.js";
import { benchMark } from "./core/benchMark.js";

function run(){
    let plots = [
        scatterPlot,
        histogram,
        barPlot,
        parallelCoordinates,
    ];

    // let url = "ws://localhost:5226/";
    let url = "ws://192.168.1.9:5226/";

    // TODO: make svg favicon and logo
    // TODO: make GitHub pretty with instructions
    // TODO: add introductory text before loadCSV

    const BENCHMARK = true;
    if(BENCHMARK){
        let clientId = prompt("Enter clientId:", "");
        alert(clientId);
        benchMark(plots, url, Number(clientId)).then();
    }else{
        initializeUI(plots, url);
    }
}

run();

