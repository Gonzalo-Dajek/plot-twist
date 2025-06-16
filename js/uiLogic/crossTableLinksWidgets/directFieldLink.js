
export class directFieldLink {
    static UIWidgetName= "Direct Link";
    fieldPerDataset  = null;
    state = {
        dataSet1: null,
        dataSet2: null,
        inputField: ""
    };

    id = null;
    updateFun = null;

    constructor(fieldsPerDataSet, id, newState) {
        if (newState) {
            this.state=newState;
        }
        this.id = id;
        this.fieldPerDataset = fieldsPerDataSet;
    }

    changeUpdateFunc(newUpdateFunc) {
        this.updateFun = newUpdateFunc;
    }

    display(containerDiv) {
        containerDiv.innerHTML="";

        // 1) state/select pairs
        Object.entries(this.state).forEach(([key, val]) => {
            const wrapper = document.createElement('div');

            // label
            const lbl = document.createElement('span');
            lbl.className = 'links-item__label';
            if(key==="dataSet1"){
                lbl.textContent = "From";
                wrapper.appendChild(lbl);
            }
            if(key==="dataSet2"){
                lbl.textContent = "To";
                wrapper.appendChild(lbl);
            }

            if (key === "dataSet1" || key === "dataSet2") {
                wrapper.className = 'links-item';

                // dataset dropdown
                const dsSelect = document.createElement('select');
                dsSelect.className = 'links-item__dataset-select';
                dsSelect.add(new Option('-- Select Dataset --', ''));
                Object.keys(this.fieldPerDataset).forEach(ds => {
                    dsSelect.add(new Option(ds, ds));
                });
                dsSelect.value = val || '';
                wrapper.appendChild(dsSelect);

                // field dropdown
                // const fieldSelect = document.createElement('select');
                // fieldSelect.className = 'links-item__field-select';
                // wrapper.appendChild(fieldSelect);
                //
                // const refreshFields = () => {
                //     fieldSelect.innerHTML = '';
                //     if (!item.dataSet || !this.fieldPerDataset[item.dataSet]) return;
                //     this.fieldPerDataset[item.dataSet].fields.forEach(val => {
                //         fieldSelect.add(new Option(val, val));
                //     });
                //     fieldSelect.value = item.field || '';
                // };

                dsSelect.onchange = () => {
                    this.state[key] = dsSelect.value;
                    // item.field = '';
                    // refreshFields();
                    this.updateFun(this, true);
                };

                // fieldSelect.onchange = () => {
                //     item.field = fieldSelect.value;
                //     this.updateFun(this, true);
                // };
                //
                // refreshFields();
            }

            // text input + accept button
            if ('inputField' === key) {
                wrapper.className = 'links-item-input';

                const textInput = document.createElement('textarea');
                textInput.className = 'links-item__text-input';
                textInput.value = val || '';
                wrapper.appendChild(textInput);

                const acceptBtn = document.createElement('button');
                acceptBtn.type = 'button';
                acceptBtn.className = 'links-item__accept-btn';
                acceptBtn.textContent = 'Submit';
                acceptBtn.onclick = () => {
                    this.state[key] = textInput.value;
                    this.updateFun(this, true);
                };
                wrapper.appendChild(acceptBtn);
            }

            containerDiv.appendChild(wrapper);
        });
    }
}