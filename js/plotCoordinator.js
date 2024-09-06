export class PlotCoordinator {
    _entries = [];
    // _entries[index] = {Sex: Male, age: 31, ... , selectedCounter: 0}
    _fields = {};
    // _fields.Medal = [["gold",0], ["silver",1], ... ]
    _plots = new Map();
    // _plots.get(id) = {lastIndexesSelected: [2,1,5,7],
    //                   plotUpdateFunction: howToUpdatePlot}
    _idCounter = 0;
    _entriesSelectCounter;

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

        for (let index of lastSelected) {
            this._entriesSelectCounter[index]--;
        }
        for (let index of newlySelected) {
            this._entriesSelectCounter[index]++;
        }

        for (let plot of this._plots.values()) {
            // console.log("PlotUpdateFunction" + id);
            plot.plotUpdateFunction();
        }

        this._plots.get(id).lastIndexesSelected = newlySelected;
    }

    fields() {
        let fields = [];
        for (let key in this._fields) {
            fields.push(key);
        }

        return fields;
    }

    fieldEntries(field) {
        return this._fields[field];
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

        for (let field in entries[0]) {
            this._fields[field] = [];

            for (let i = 0; i < n; i++) {
                let entry_i = entries[i];
                this._fields[field].push([entry_i[field], i]);
            }
        }
    }
}
