export class rangeSet {
    _selectionArr = [];
    addSelectionArr(selectionArr, selectionMode) {
        for(let i=0; i<selectionArr.length; i++){
            this.addSelection(selectionArr[i], selectionMode);
        }
    }

    addSelection(selectionRange, selectionMode){
        if(selectionMode!=="AND"){
            console.log("SELECTION MODE ERROR");
        }

        let alreadyIsInArr = false;
        for(let i = 0; i<this._selectionArr.length; i++){
            if(this._selectionArr[i].field===selectionRange.field){
                alreadyIsInArr = true;
                let [x1, y1] = this._selectionArr[i].range;
                // interesection
                let start = Math.max(x1, selectionRange.range[0]);
                let end = Math.min(y1, selectionRange.range[1]);
                this._selectionArr[i].range=[start,end];
                break;
            }
        }
        if(!alreadyIsInArr){
            this._selectionArr.push(selectionRange);
            // this._selectionArr.push(JSON.parse(JSON.stringify(selectionRange))) // copy
        }
    }

    toArr() {
        return this._selectionArr;
    }
}
