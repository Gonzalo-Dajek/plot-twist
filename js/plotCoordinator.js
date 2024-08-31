
export class PlotCoordinator {
    _entries= [];
    _fields = {};
    _plots = new Map;
    _idCounter = 0;
    constructor() {
    }

    addPlot(id, updateFunction){
        this._plots[id]={
            lastIndexesSelected: [],
            plotUpdateFunction: updateFunction,
        }
    }

    removePlot(id){
        this._plots.delete(id);
    }

    updatePlotsView(id, selectedEntries){
        let set1 = new Set(this._plots[id].lastIndexesSelected);
        let set2 = new Set(selectedEntries);

        const newlySelectedIndexes = [...set1].filter(item => !set2.has(item));
        const deselectedIndexes = [...set2].filter(item => !set1.has(item));

        let changes = [];

        for(let index of newlySelectedIndexes){
            let counter = ++(this._entries[index].selectedCounter);
            if (counter === 1){
                changes.push(index);
            }
        }

        for(let index of deselectedIndexes){
            let counter = --(this._entries[index].selectedCounter);
            if (counter === 0){
                changes.push(index);
            }
        }

        for(let plot of this._plots){
            plot.plotUpdateFunction(changes); // TODO: ??? queda ser definida para scatter plot en la linea 120
        }

        this._plots[id].lastIndexesSelected = selectedEntries;
    }

    newPlotId(){
        this._idCounter++;
        return this._idCounter;
    }

    fields(){
        return this._fields;
    }

    init(entries){
        this._entries=entries;

        let n = entries.length;
        if (n === 0) {
            return;
        }

        for (let i = 0; i < n; i++) {
            // TODO: usar symbol types para evitar colisiones?
            this._entries[i]["selectedCounter"]=0;
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
