export class PlotCoordinator {
    _entries = [];
    // _entries[index] = {Sex: Male, age: 31, ... , selectedCounter: 0}
    _plots = new Map();
    // _plots.get(id) = {lastIndexesSelected: [2,1,5,7],
    //                   plotUpdateFunction: howToUpdatePlot}
    _idCounter = 0;
    _entriesSelectCounter;
    _BENCHMARK= {
        isActive: false,
        deltaUpdateIndexes: undefined,
        deltaUpdatePlots: undefined,
    };
    _benchMark(where){
        if(this._BENCHMARK.isActive){
            let startTime, endTime;
            switch (where){
                case "preIndexUpdate":
                    this._BENCHMARK.updateIndexStart=performance.now();
                    break;
                case "postIndexUpdate":
                    startTime = this._BENCHMARK.updateIndexStart;
                    endTime = performance.now();
                    this._BENCHMARK.deltaUpdateIndexes=endTime-startTime;
                    break;
                case "prePlotsUpdate":
                    this._BENCHMARK.updatePlotsStart=performance.now();
                    break;
                case "postPlotsUpdate":
                    startTime = this._BENCHMARK.updatePlotsStart;
                    endTime = performance.now();
                    this._BENCHMARK.deltaUpdatePlots=endTime-startTime;
                    break;
            }
        }
    }

    constructor() {}

    newPlotId() {
        return ++this._idCounter;
    }

    addPlot(id, updateFunction) {
        this._plots.set(id, {
            lastIndexesSelected: [],
            plotUpdateFunction: updateFunction,
        });

        for (let i = 0; i < this._entries.length; i++) {
            this._plots.get(id).lastIndexesSelected.push(i);
        }

        let n = this._entriesSelectCounter.length;
        for (let i = 0; i < n; i++) {
            this._entriesSelectCounter[i]++;
        }

        this.updatePlotsView(id, this._plots.get(id).lastIndexesSelected);
    }

    removePlot(id) {
        let indexesSelected = this._plots.get(id).lastIndexesSelected;
        for (let i = 0; i < indexesSelected.length; i++) {
            this._entriesSelectCounter[indexesSelected[i]]--;
        }

        this._plots.delete(id);
    }

    updatePlotsView(id, newlySelected) {
        let lastSelected = this._plots.get(id).lastIndexesSelected;

        this._benchMark("preIndexUpdate");
        for (let index of lastSelected) {
            this._entriesSelectCounter[index]--;
        }
        for (let index of newlySelected) {
            this._entriesSelectCounter[index]++;
        }
        this._benchMark("postIndexUpdate");

        this._benchMark("prePlotsUpdate");
        for (let plot of this._plots.values()) {
            plot.plotUpdateFunction();
        }
        this._benchMark("postPlotsUpdate");

        // console.log("Delta update Plots:  ",this._BENCHMARK.deltaUpdatePlots);
        // console.log("Delta update Indexes:  ",this._BENCHMARK.deltaUpdateIndexes);

        this._plots.get(id).lastIndexesSelected = newlySelected;
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
        return this._entriesSelectCounter[entry] === this._plots.size;
    }

    init(entries) {
        this._entries = entries;

        let n = entries.length;
        if (n === 0) {
            return;
        }

        this._entriesSelectCounter = Array(n);
        for (let i = 0; i < n; i++) {
            this._entriesSelectCounter[i] = 0;
        }
    }
}
