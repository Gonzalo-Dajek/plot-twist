import { resetLayout } from "./benchMarkUtils/resetLayout.js";
import { createData, dataToTable } from "./benchMarkUtils/dataCreation.js";
import { benchMarkSetUp } from "./benchMarkUtils/setUp.js";
import { logTimingInfo, validateConfig, wait } from "./benchMarkUtils/miscUtils.js";
import * as layout from "./benchMarkUtils/createLayout.js";
import {
    sendBenchMarkTimings,
    sendEndTrigger,
    sendStartTrigger,
    waitForEndTrigger,
    waitForStartTrigger,
} from "./benchMarkUtils/webSocketPassiveCommunication.js";
import { createFieldGroups, deleteFieldGroups, sendClientInfo, setupSelectionBroadcast } from "./benchMarkUtils/webSocketActiveCommunication.js";
import { brushBackAndForth } from "./benchMarkUtils/brushing.js";
import { loadLayout } from "../uiLogic/gridUtils.js";

// TODO: change the benchmarking timing events to simple ACKs -
// TODO: add serve node functionality -
// TODO: add throttle to the server -
// TODO: make presentation -
// TODO: add basic custom complex function functionality -

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
// TODO: close port

export async function benchMark(plots, url) {
    let clientId = prompt("Enter clientId:", "");
    clientId = Number(clientId);

    // BASE CASE------------------------------------------------------------------------------------------------------//
    let timeBetween = 50; // 50
    let waitBetweenTestDuration = 20*1000;
    let isStaggered = false;
    let testDuration = 40; // 40
    const baseConfig = {
        dataDistribution: "evenly distributed",
        plotsAmount: 4,
        numColumnsAmount: 30,
        catColumnsAmount: 5,
        entriesAmount: 1000,
        numDimensionsSelected: 2,
        catDimensionsSelected: 0,
        numFieldGroupsAmount: 2,
        catFieldGroupsAmount: 1,
        brushSize: 0.4,
        stepSize: 0.04,
        numberOfClientBrushing: 2,
        numberOfDataSets: 2,
        testDuration: testDuration,
        dataSetNum: null,
        clientId,
    };
    // BASE CASE------------------------------------------------------------------------------------------------------//

    baseConfig.dataSetNum = clientId % baseConfig.numberOfDataSets;
    let isCustomLayoutSelected = false;
    let layoutData;

    // BENCHMARK CONFIGS HERE-----------------------------------------------------------------------------------------//
    let modifiedConfigs;
    // modifiedConfigs = [{ ...baseConfig }];
    // modifiedConfigs = layout.generateConfigsSinglePlot(baseConfig);
    // modifiedConfigs = layout.generateConfigsPassFailMatrix(baseConfig);
    // modifiedConfigs = layout.generateConfigsBrushSizeAndTypeOfData(baseConfig)
    // modifiedConfigs = layout.generateConfigsAmountOfEntries(baseConfig);
    // modifiedConfigs = layout.generateConfigsBrushSizeVsStepSize(baseConfig);
    modifiedConfigs = layout.generateConfigsStaggeredBrushingEventWith4Clients(baseConfig)
    isStaggered = true;
    // modifiedConfigs = layout.generateConfigsForEventAnalysis2Clients(baseConfig)
    // modifiedConfigs = layout.generateConfigsBigIntervalBetweenBrushes(baseConfig);
    // timeBetween = 500;
    // [isCustomLayoutSelected, layoutData] = layout.singleScatterLayout();


    // modifiedConfigs.splice(0, 57)
    // modifiedConfigs.unshift(modifiedConfigs[0]);
    // modifiedConfigs.unshift(modifiedConfigs[0]);
    // modifiedConfigs.unshift(modifiedConfigs[0]);

    // BENCHMARK CONFIGS HERE-----------------------------------------------------------------------------------------//
    let brushIdRef = {
        brushId: 0,
    }
    let socketRef;
    let firstTimeInit = true;
    for (let i = 0; i < modifiedConfigs.length; i++) {
        const cfg = modifiedConfigs[i];
        validateConfig(cfg);

        // Log Percentage of completion
        const percentage = ((i + 1) / modifiedConfigs.length) * 100;
        console.log(
            `(${i + 1} / ${modifiedConfigs.length}): ${percentage.toFixed(2)}%`
        );
        const iterationStart = Date.now();
        console.log(cfg);

        // the main client should start after all the other clients have already been set up
        const isMainClient = clientId === 1;
        if (isMainClient && !firstTimeInit) {
            await wait(waitBetweenTestDuration);
        }

        // create the data and layout from the config information
        const data = createData(
            cfg.entriesAmount,
            cfg.numColumnsAmount,
            cfg.catColumnsAmount,
            cfg.dataDistribution
        );
        const table = dataToTable(data, cfg.catColumnsAmount);
        if (!isCustomLayoutSelected) {
            layoutData = layout.createScatterLayout(
                cfg.plotsAmount,
                cfg.numColumnsAmount
            );
        }

        // set up the whole app in benchmarking mode
        if (firstTimeInit) {
            socketRef = { socket: undefined };
        }
        const pcRef = { pc: undefined };
        benchMarkSetUp(
            table,
            pcRef,
            plots,
            url,
            layoutData,
            socketRef,
            cfg.dataSetNum,
            firstTimeInit,
            clientId,
            brushIdRef
        );
        await sendClientInfo(cfg, socketRef, clientId, pcRef);

        // set up message sending when a brush selection is made
        if (!firstTimeInit) {
            setupSelectionBroadcast(pcRef, socketRef, clientId, brushIdRef);
        }
        loadLayout(layoutData, pcRef, plots);

        // set up dummy plot to have the benchmark make selections
        pcRef.pc.BENCHMARK.isActive = true;
        pcRef.pc.addPlot(-1,
            (measurement, wasSent)=>{
                sendBenchMarkTimings(socketRef, pcRef, brushIdRef, clientId, measurement, wasSent);
            }
        );

        // have the main client make all the field groups
        if (isMainClient) {
            for (let dataSetNum = 0; dataSetNum < cfg.numberOfDataSets; dataSetNum++) {
                await createFieldGroups(
                    socketRef,
                    cfg.numFieldGroupsAmount,
                    cfg.catFieldGroupsAmount,
                    dataSetNum
                );
            }
            await sendStartTrigger(socketRef);
        }

        // when the start trigger is received start brushing back and forth (if it is an active client)
        await waitForStartTrigger(socketRef);

        if (clientId <= cfg.numberOfClientBrushing) {
            await brushBackAndForth(
                ((cfg.testDuration * 1000) / timeBetween),
                cfg.stepSize,
                cfg.numDimensionsSelected,
                cfg.catDimensionsSelected,
                pcRef,
                cfg.brushSize,
                socketRef,
                clientId,
                timeBetween,
                isStaggered,
                cfg.numberOfClientBrushing
            );
        }

        // have the main client clean up and send the end trigger
        if (isMainClient) {
            for (
                let dataSetNum = 0;
                dataSetNum < cfg.numberOfDataSets;
                dataSetNum++
            ) {
                deleteFieldGroups(
                    socketRef,
                    cfg.numFieldGroupsAmount,
                    cfg.catFieldGroupsAmount,
                    dataSetNum
                );
            }
            await wait(waitBetweenTestDuration);
            sendEndTrigger(socketRef);
        }

        // finish when the end trigger is received
        await waitForEndTrigger(socketRef, pcRef);
        resetLayout();
        await wait(100);
        firstTimeInit = false;

        logTimingInfo(iterationStart, i, modifiedConfigs.length);
    }
}
