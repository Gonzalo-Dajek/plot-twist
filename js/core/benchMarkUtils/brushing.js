import { rangeSet } from "../rangeSet.js";

function createSelection(a, b, numFields, catFields) {
    const numericalSelections = Array.from({ length: numFields }, (_, i) => ({
        range: [a, b],
        field: `field${i}`,
        type: "numerical",
    }));

    const categoricalSelections = Array.from({ length: catFields }, (_, i) => ({
        categories: ["A", "B", "C"],
        field: `catField${i}`,
        type: "categorical",
    }));

    return [...numericalSelections, ...categoricalSelections];
}

function sendBrushTimings(pcRef, socketRef, selection, clientId, brushId) {
    let timeToUpdatePlots = pcRef.pc.BENCHMARK.deltaUpdatePlots;
    let timeToProcessBrushLocally = pcRef.pc.BENCHMARK.deltaUpdateIndexes;

    let reducedSelection = new rangeSet();
    for (let [id, plot] of pcRef.pc._plots.entries()) {
        if (id !== 0) {
            reducedSelection.addSelectionArr(
                JSON.parse(JSON.stringify(plot.lastSelectionRange))
            );
        }
    }
    reducedSelection.addSelectionArr(JSON.parse(JSON.stringify(selection)));

    let message = {
        type: "BenchMark",
        benchMark: {
            action: "brush",
            timeToProcessBrushLocally: timeToProcessBrushLocally,
            timeToUpdatePlots: timeToUpdatePlots,
            timeSent: Date.now(),
            range: reducedSelection.toArr(),
            clientId: clientId,
            brushId: brushId,
        },
    };

    let socket = socketRef.socket;
    socket.send(JSON.stringify(message));
}

export async function brushBackAndForth(
    steps,
    stepSize,
    numDimensionsSelected,
    catDimensionsSelected,
    pcRef,
    id,
    brushSize,
    socketRef,
    clientId,
    timeBetween
) {
    let startPos = 0.2;
    let endPos = 0.8;
    let x = startPos;

    let forward = true;
    let brushId = 0;
    for (let i = 0; i < steps; i++) {
        // Move step
        if (forward) {
            x += stepSize;
            if (x >= endPos) forward = false; // Switch direction if reaching the end
        } else {
            x -= stepSize;
            if (x <= startPos) forward = true;
        }

        let startTime = performance.now();

        let a = x - brushSize / 2;
        let b = x + brushSize / 2;
        let selection = createSelection(
            a,
            b,
            numDimensionsSelected,
            catDimensionsSelected
        );
        pcRef.pc.throttledUpdatePlotsView(id, selection);

        sendBrushTimings(pcRef, socketRef, selection, clientId, brushId);

        let elapsed = performance.now() - startTime;
        let remainingTime = Math.max(timeBetween - elapsed, 0);

        if (remainingTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        brushId++;
    }

    pcRef.pc.updatePlotsView(id, []);
    sendBrushTimings(pcRef, socketRef, [], clientId, brushId);
}