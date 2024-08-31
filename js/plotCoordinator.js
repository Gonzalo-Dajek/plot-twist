export class PlotCoordinator {
    _entries = [];
    // _entries[index] = {Sex: Male, age: 31, ... , selectedCounter: 0}
    _fields = {};
    // _fields.Medal = [["gold",0], ["silver",1], ... ]
    _plots = new Map();
    // _plots[id] = {lastIndexesSelected: [2,1,5,7],
    //               plotUpdateFunction: howToUpdatePlot}
    _idCounter = 0;
    _entriesSelectCounter = [];

    constructor() {}

    addPlot(id, updateFunction) {
        this._plots[id] = {
            lastIndexesSelected: [],
            plotUpdateFunction: updateFunction,
        };

        for (let i = 0; i < this._entries.length; i++) {
            this._plots[id].lastIndexesSelected.push(i);
        }

        let n = this._entriesSelectCounter.length;
        for (let i = 0; i < n; i++) {
            this._entriesSelectCounter[i]++;
        }
    }

    removePlot(id) {
        let indexesSelected = this._plots[id].lastIndexesSelected;
        for (let i = 0; i < indexesSelected.length; i++) {
            this._entriesSelectCounter[indexesSelected[i]]--;
        }

        this._plots.delete(id);
    }

    updatePlotsView(id, selectedEntries) {
        let set1 = new Set(this._plots[id].lastIndexesSelected);
        let set2 = new Set(selectedEntries);

        const newlySelectedIndexes = [...set1].filter(
            (item) => !set2.has(item)
        );
        const deselectedIndexes = [...set2].filter((item) => !set1.has(item));

        let changes = {
            changeToSelected: [],
            changeToDeselected: [],
        };

        for (let index of newlySelectedIndexes) {
            let counter = ++this._entriesSelectCounter[index];
            if (counter === this._plots.size) {
                changes.changeToSelected.push(index);
            }
        }

        for (let index of deselectedIndexes) {
            let counter = --this._entriesSelectCounter[index];
            if (counter < this._plots.size) {
                changes.changeToDeselected.push(index);
            }
        }

        for (let plot of this._plots) {
            plot.plotUpdateFunction(changes); // TODO: ??? queda ser definida para scatter plot en la linea 120
        }

        this._plots[id].lastIndexesSelected = selectedEntries;
    }

    newPlotId() {
        return ++this._idCounter;
    }

    fields() {
        return this._fields;
    }

    init(entries) {
        this._entries = entries;

        let n = entries.length;
        if (n === 0) {
            return;
        }

        this._entriesSelectCounter.length = n;
        for (let i = 0; i < n; i++) {
            this._entriesSelectCounter = 0;
        }

        for (let field in entries[0]) {
            this._fields[field] = [];

            for (let i = 0; i < n; i++) {
                let entry_i = entries[i];
                this._fields[field].push([entry_i[field], i]);
            }
        }
        console.log("pc.fields:");
        console.log(this._fields);
    }
}
