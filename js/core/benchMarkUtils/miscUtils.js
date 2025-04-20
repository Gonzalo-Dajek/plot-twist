export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function validateConfig(cfg) {
    const isValidConfig =
        cfg.numColumnsAmount > cfg.numDimensionsSelected &&
        cfg.numColumnsAmount > cfg.numFieldGroupsAmount &&
        cfg.catColumnsAmount > cfg.catDimensionsSelected &&
        cfg.catColumnsAmount > cfg.catFieldGroupsAmount;

    if (!isValidConfig) {
        console.error("INVALID CONFIG:");
        console.error(cfg);
    }

    return isValidConfig;
}

export function logTimingInfo(iterationStart, currentIndex, totalItems) {
    const iterationEnd = Date.now();
    const timeSpent = iterationEnd - iterationStart;
    const remainingItems = totalItems - (currentIndex + 1);
    const estimatedTimeLeft = timeSpent * remainingItems;

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const hrs = Math.floor(mins / 60);
        return `${hrs > 0 ? hrs + " h " : ""}${mins % 60} m ${seconds % 60} s`;
    };

    console.log(
        `Time spent: ${formatTime(timeSpent)}, Estimated time left: ${formatTime(estimatedTimeLeft)}`
    );
}
