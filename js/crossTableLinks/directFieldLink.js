

export class directFieldLink {
    static optionSelectName= "Direct Link";
    fieldPerDataset  = null;
    state = [
        {
            option: "from",
            dataSet: "athlete_events_500.csv",
            field: "Weight"
        },
        {
            option: "to",
            dataSet: "athlete_events_500.csv",
            field: "Weight"
        },
    ];

    constructor(fieldsPerDataSet, state2) {
        if (state2) {
            this.state=state2;
        }
        this.fieldPerDataset = fieldsPerDataSet;
    }

    display(containerDiv, updateFun) {

        // 1) state/select pairs
        this.state.forEach((item, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'links-item';

            // label
            const lbl = document.createElement('span');
            lbl.className = 'links-item__label';
            lbl.textContent = item.option;
            wrapper.appendChild(lbl);

            // delete button
            const btn = document.createElement('button');
            btn.className = 'links-item__delete-btn';
            btn.textContent = 'X';
            btn.onclick = () => {
                this.state.splice(idx, 1);
                updateFun(this);
            };
            wrapper.appendChild(btn);

            // dataset dropdown
            const dsSelect = document.createElement('select');
            dsSelect.className = 'links-item__dataset-select';
            dsSelect.add(new Option('-- Select Dataset --', ''));
            Object.keys(this.fieldPerDataset).forEach(ds => {
                dsSelect.add(new Option(ds, ds));
            });
            dsSelect.value = item.dataSet || '';
            wrapper.appendChild(dsSelect);

            // field dropdown
            const fieldSelect = document.createElement('select');
            fieldSelect.className = 'links-item__field-select';
            wrapper.appendChild(fieldSelect);

            const refreshFields = () => {
                fieldSelect.innerHTML = '';
                if (!item.dataSet || !this.fieldPerDataset[item.dataSet]) return;
                this.fieldPerDataset[item.dataSet].fields.forEach(val => {
                    fieldSelect.add(new Option(val, val));
                });
                fieldSelect.value = item.field || '';
            };

            dsSelect.onchange = () => {
                item.dataSet = dsSelect.value;
                item.field = '';
                refreshFields();
                updateFun(this);
            };

            fieldSelect.onchange = () => {
                item.field = fieldSelect.value;
                updateFun(this);
            };

            refreshFields();
            containerDiv.appendChild(wrapper);
        });

        // update‑state button area
        const updateButtonWrapper = document.createElement('div');
        updateButtonWrapper.className = 'add-link-container';

        const updateButton = document.createElement('button');
        updateButton.className = 'add-link-container__button';
        updateButton.textContent = '+';
        updateButton.onclick = () => {
            if (this.state.length > 0) {
                this.state[0] = {
                    option: "from",
                    dataSet: "athlete_events_500.csv",
                    field: "Weight"
                };
            }
            this.state.push({ option: null, dataSet: null, field: null });
            updateFun(this);
        };

        updateButtonWrapper.appendChild(updateButton);
        containerDiv.appendChild(updateButtonWrapper);
    }


    isSelected(dsName, entry, selectionPerDataSet){
        return {
            isSelected:true,
            by: "dsName",
        };
    }
}