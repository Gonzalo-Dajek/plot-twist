export class PlotCoordinator {
    _entries = [];
    // _entries[index] = {Sex: Male, age: 31, ... , selectedCounter: 0}
    _plots = new Map();
    // _plots.get(id) = {lastIndexesSelected: [2,1,5,7],
    //                   plotUpdateFunction: howToUpdatePlot}
    _idCounter = 0;
    _entriesSelectCounter;
    _dataStructure;
    _BENCHMARK = {
        isActive: false,
        deltaUpdateIndexes: undefined,
        deltaUpdatePlots: undefined,
    };

    _benchMark(where) {
        if (this._BENCHMARK.isActive) {
            let startTime, endTime;
            switch (where) {
                case "preIndexUpdate":
                    this._BENCHMARK.updateIndexStart = performance.now();
                    break;
                case "postIndexUpdate":
                    startTime = this._BENCHMARK.updateIndexStart;
                    endTime = performance.now();
                    this._BENCHMARK.deltaUpdateIndexes = endTime - startTime;
                    break;
                case "prePlotsUpdate":
                    this._BENCHMARK.updatePlotsStart = performance.now();
                    break;
                case "postPlotsUpdate":
                    startTime = this._BENCHMARK.updatePlotsStart;
                    endTime = performance.now();
                    this._BENCHMARK.deltaUpdatePlots = endTime - startTime;
                    break;
            }
        }
    }

    constructor(type) {
        if (type) {
            this._dataStructure = type;
        } else {
            console.error("Plot Coordinator type missing");
        }
    }

    newPlotId() {
        return ++this._idCounter;
    }

    addPlot(id, updateFunction) {
        this._plots.set(id, {
            // lastSelection:[],
            selectionMode:"AND",
            lastIndexesSelected:[],
            plotUpdateFunction: updateFunction,
        });

        for (let i = 0; i < this._entries.length; i++) {
            this._plots.get(id).lastIndexesSelected.push(i);
        }

        let n = this._entriesSelectCounter.length;
        for (let i = 0; i < n; i++) {
            this._entriesSelectCounter[i]++;
        }

        this.updatePlotsView(id, []);
    }

    removePlot(id) {
        let indexesSelected = this._plots.get(id).lastIndexesSelected;
        for (let i = 0; i < indexesSelected.length; i++) {
            this._entriesSelectCounter[indexesSelected[i]]--;
        }

        this._plots.delete(id);
        for (let plot of this._plots.values()) {
            plot.plotUpdateFunction();
        }
    }

    _isSelectedRange(d, selectionArr, id) {
        // TODO: id << para NAND?
        // console.log(selectionArr);
        for(let selection of selectionArr){
            const field = selection.field;

            if(selection.type==="numerical"){
                if(selection.range){
                    const from = selection.range[0];
                    const to = selection.range[1];
                    if(!(from<=d[field] && d[field]<=to)){
                        return false;
                    }
                }
            }else{
                const categories = selection.categories;
                let isSelected = false;
                for(let cat of categories){
                    if(d[field]===cat){
                        isSelected = true;
                        break;
                    }
                }
                if(!isSelected){
                    return false;
                }
            }
        }
        return true;
    }

    updatePlotsView(id, newSelection) {

        this._benchMark("preIndexUpdate");
        let lastSelectedIndexes = this._plots.get(id).lastIndexesSelected;

        let newlySelectedIndexes = this._entries
            .map((d, i) => i)
            .filter(i => this._isSelectedRange(this._entries[i], newSelection, id));

        for (let index of lastSelectedIndexes) {
            this._entriesSelectCounter[index]--;
        }
        for (let index of newlySelectedIndexes) {
            this._entriesSelectCounter[index]++;
        }

        this._plots.get(id).lastIndexesSelected = newlySelectedIndexes;
        this._benchMark("postIndexUpdate");

        this._benchMark("prePlotsUpdate");
        for (let plot of this._plots.values()) {
            plot.plotUpdateFunction();
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
        return this._entriesSelectCounter[entry] === this._plots.size;
    }

    changeSelectionMode(id, selectMode){
        this._plots.get(id).selectionMode = selectMode;
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
