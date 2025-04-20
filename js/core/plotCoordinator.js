import throttle from "lodash-es/throttle.js";

/**
 * Responsible for coordinating the brushing between different plots
 */
export class PlotCoordinator {
    _entries = [];
    /** Stores the parsed csv data. Each entry in _entries is a row from the csv.
     *
     * Example: _entries[index] = {Sex: Male, age: 31, ... }
     */

    _plots = new Map();
    /** Maps each plot ID to an object consisting of:
     * lastIndexesSelected: An array of indexes representing the last selected entries made by that plot.
     * plotUpdateFunction: A function that updates the plot based on the current selections by all plots.
     * lastSelectionRanges: Array of objects, each containing a `[from, to]` range and the corresponding field.
     *
     * Example: _plots.get(id) = {
     *     lastSelectionRanges: [{
     *          range: [21.5, 41.7],
     *          field: "Age",
     *          type: "numerical"
     *          }, ...],
     *     lastIndexesSelected: [1, 2, 5, 7],
     *     plotUpdateFunction: (howToUpdatePlot) => { ... }
     * }
     */

    _idCounter = 1; // Unique ID for each new plot

    _entrySelectionTracker = [];
    /** Tracks how many times each entry is being selected.
     * An array of integers where each index corresponds to an entry in _entries.
     * _entrySelectionTracker[entryIndex] stores how many times that entry is currently being selected.
     * A count increases for each plot selecting the entry and once more if selected by the intersection of all other clients and decreases if no longer selected.
     */

    dsName = ""; // name of the dataset

    BENCHMARK = {
        isActive: false,
        deltaUpdateIndexes: undefined,
        deltaUpdatePlots: undefined,
    };

    _benchMark(where) {
        if (this.BENCHMARK.isActive) {
            let startTime, endTime;
            switch (where) {
                case "preIndexUpdate":
                    this.BENCHMARK.updateIndexStart = performance.now();
                    break;
                case "postIndexUpdate":
                    startTime = this.BENCHMARK.updateIndexStart;
                    endTime = performance.now();
                    this.BENCHMARK.deltaUpdateIndexes = endTime - startTime;
                    break;
                case "prePlotsUpdate":
                    this.BENCHMARK.updatePlotsStart = performance.now();
                    break;
                case "postPlotsUpdate":
                    startTime = this.BENCHMARK.updatePlotsStart;
                    endTime = performance.now();
                    this.BENCHMARK.deltaUpdatePlots = endTime - startTime;
                    break;
            }
        }
    }

    newPlotId() {
        return ++this._idCounter;
    }

    addPlot(id, updateFunction) {
        this._plots.set(id, {
            lastSelectionRange: [],
            lastIndexesSelected: [],
            plotUpdateFunction: updateFunction,
        });

        for (let i = 0; i < this._entries.length; i++) {
            this._plots.get(id).lastIndexesSelected.push(i);
        }

        for (let i = 0; i < this._entrySelectionTracker.length; i++) {
            this._entrySelectionTracker[i]++;
        }

        this.updatePlotsView(id, []);
        // an empty selection `[]` implicitly means that all entries are selected (no brush = full selection).
    }

    removePlot(id) {
        let indexesSelected = this._plots.get(id).lastIndexesSelected;
        for (let i = 0; i < indexesSelected.length; i++) {
            this._entrySelectionTracker[indexesSelected[i]]--;
        }

        this._plots.delete(id);
        for (let plot of this._plots.values()) {
            plot.plotUpdateFunction();
        }
    }

    removeAll() {
        let keepWebSocket = this._plots.get(0);

        for (let [key, plot] of this._plots.entries()) {
            if (key === 0) continue;

            let indexesSelected = plot.lastIndexesSelected;
            for (let i = 0; i < indexesSelected.length; i++) {
                this._entrySelectionTracker[indexesSelected[i]]--;
            }
        }

        this._plots.clear();
        this._plots.set(0, keepWebSocket);
    }

    _isSelectedRange(d, selectionArr) {
        for (let selection of selectionArr) {
            const field = selection.field;

            if (selection.type === "numerical") {
                if (selection.range) {
                    const from = selection.range[0];
                    const to = selection.range[1];
                    if (!(from <= d[field] && d[field] <= to)) {
                        return false;
                    }
                }
            } else { // selection.type === "categorical"; ie: string
                const categories = selection.categories;
                let isSelected = false;
                for (let cat of categories) {
                    if (d[field] === cat) {
                        isSelected = true;
                        break;
                    }
                }
                if (!isSelected) {
                    return false;
                }
            }
        }

        return true;
    }

    throttledUpdatePlotsView = throttle(this.updatePlotsView, 50);

    updatePlotsView(triggeringPlotId, newSelection) {
        this._plots.get(triggeringPlotId).lastSelectionRange = newSelection;

        this._benchMark("preIndexUpdate");
        let lastSelectedIndexes = this._plots.get(triggeringPlotId).lastIndexesSelected;

        let newlySelectedIndexes = this._entries
            .map((d, i) => i)
            .filter((i) => {
                return this._isSelectedRange(
                    this._entries[i],
                    newSelection
                );
            });

        for (let index of lastSelectedIndexes) {
            this._entrySelectionTracker[index]--;
        }
        for (let index of newlySelectedIndexes) {
            this._entrySelectionTracker[index]++;
        }

        this._plots.get(triggeringPlotId).lastIndexesSelected = newlySelectedIndexes;
        this._benchMark("postIndexUpdate");

        this._benchMark("prePlotsUpdate");
        for (let [plotToUpdateId, plot] of this._plots.entries()) {
            if ((triggeringPlotId === 0 && plotToUpdateId !== 0) || (triggeringPlotId !== 0)) {
                if(triggeringPlotId === -1 && plotToUpdateId === 0) continue; // id === -1 is designated for benchmarking purposes
                plot.plotUpdateFunction();
            }
        }
        this._benchMark("postPlotsUpdate");
    }

    fields() {
        let fields = [];
        if (this._entries.length > 0) {
            for (let field in this._entries[0]) {
                fields.push(field);
            }
        }

        return fields;
    }

    isSelected(entry) {
        return this._entrySelectionTracker[entry] === this._plots.size;
    }

    entries(){
        return this._entries;
    }

    init(entries, dsName) {
        this.dsName = dsName;
        this._entries = entries;

        let n = entries.length;
        this._entrySelectionTracker = Array(n);
        for (let i = 0; i < n; i++) {
            this._entrySelectionTracker[i] = 0;
        }
    }
}
