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

    // TODO: add brush id to trace from who it belongs?

    // TODO: make svg favicon and logo
    // TODO: make GitHub pretty with instructions
        // TODO: put some practical use cases in the description
        // TODO: example usage
        // TODO: add gif
        // TODO: sales pitch
    // TODO: add introductory text before loadCSV
    // TODO: add iris dataset
    // TODO: fix scatter plot dot size so it is smaller
    // TODO: fix labels so they are always on top and properly placed
    // TODO: clean plots code

    // TODO: test backend install instructions
    // TODO: add delta to the backend benchmarking
    // TODO: close port

    const BENCHMARK = true;
    if(BENCHMARK){
        let clientId = prompt("Enter clientId:", "");
        benchMark(plots, url, Number(clientId)).then();
    }else{
        initializeUI(plots, url);
    }
}

run();

