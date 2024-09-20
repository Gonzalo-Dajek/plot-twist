import { PlotCoordinator } from "./plotCoordinator.js";
import {
    setUpLoadFile,
    setUpExport,
    setUpLayoutFileLoader,
} from "./setUpUi.js";
// import { testPlots } from "./testingPlots.js";

// import {run} from "./benchMark.js";
// run();

let pc = new PlotCoordinator("index");
let data = [];

// testPlots();

setUpLoadFile(data,pc);
setUpExport();
setUpLayoutFileLoader(data,pc);




