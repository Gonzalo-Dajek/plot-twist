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

    const BENCHMARK = true;
    if(BENCHMARK){
        benchMark(plots, url).then();
    }else{
        initializeUI(plots, url);
    }
}

run();

