
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

export async function brushBackAndForth(
    steps,
    stepSize,
    numDimensionsSelected,
    catDimensionsSelected,
    pcRef,
    brushSize,
    socketRef,
    clientId,
    timeBetween,
    isStaggered,
    numberOfClientBrushing
) {
    let startPos = 0.2;
    let endPos = 0.8;
    let x = startPos;

    // Compute when this client should start brushing if staggered
    let startStep = 0;
    if (isStaggered) {
        const stepFraction = (numberOfClientBrushing - clientId) / numberOfClientBrushing;
        startStep = Math.floor(steps * stepFraction);
    }

    let forward = true;
    for (let i = 0; i < steps; i++) {
        // Move step
        if (forward) {
            x += stepSize;
            if (x >= endPos) forward = false;
        } else {
            x -= stepSize;
            if (x <= startPos) forward = true;
        }


        if (!isStaggered || i >= startStep) {
            let a = x - brushSize / 2;
            let b = x + brushSize / 2;
            let selection = createSelection(
                a,
                b,
                numDimensionsSelected,
                catDimensionsSelected
            );

            pcRef.pc.updatePlotsView(-1, selection);
        }

        await new Promise((resolve) => setTimeout(resolve, timeBetween));
    }

    pcRef.pc.updatePlotsView(-1, []);
}