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

    let ip = "181.94.71.141";
    let url = `ws://${ip}:5226/`;
    const BENCHMARK = true;

    if(BENCHMARK){
        benchMark(plots, url).then();
    }else{
        initializeUI(plots, url);
    }
}

run();

