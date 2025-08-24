import { EditorState, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { csharp } from '@replit/codemirror-lang-csharp';
import { githubLight } from '@fsegurai/codemirror-theme-github-light';
import { autocompletion } from '@codemirror/autocomplete';

export class directFieldLink {
    static UIWidgetName = "Direct Link";
    static _views = new Map();

    fieldPerDataset = null;
    state = { dataSet1: null, dataSet2: null, inputField: "" };
    id = null;
    updateFun = null;
    isError = false;
    themeCompartment = new Compartment();

    // 🔧 High z-index for autocomplete
    _highZIndexAutocomplete = EditorView.theme({
        ".cm-tooltip-autocomplete": {
            position: 'fixed',
            zIndex: 100000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            top: 'auto',
            left: 'auto',
        },
    });

    constructor(fieldsPerDataSet, id, newState, isError) {
        if (newState) this.state = newState;
        if (isError) this.isError = isError;
        this.id = id;
        this.fieldPerDataset = fieldsPerDataSet;
    }

    changeUpdateFunc(newUpdateFunc) {
        this.updateFun = newUpdateFunc;
    }

    _destroyEditor(viewKey) {
        const view = directFieldLink._views.get(viewKey);
        if (!view) return;
        try {
            view.destroy?.();
            view.dom?.parentNode?.removeChild(view.dom);
        } catch {}
        directFieldLink._views.delete(viewKey);
    }

    _resizeEditor(holder, view) {
        requestAnimationFrame(() => {
            holder.style.height = view.contentDOM.scrollHeight + 15 + "px";
        });
    }
    _completionSource = (context) => {
        // Match X. or X.fo (variable + optional partial property)
        const word = context.matchBefore(/([XY])\.\w*$/);
        if (!word) return null;

        const [varName, partial] = word.text.split('.'); // varName = X or Y, partial = typed after dot
        let fields = null;

        if (varName === 'X' && this.state.dataSet1) {
            fields = this.fieldPerDataset[this.state.dataSet1]?.fields;
        } else if (varName === 'Y' && this.state.dataSet2) {
            fields = this.fieldPerDataset[this.state.dataSet2]?.fields;
        }

        if (!Array.isArray(fields)) return null;

        const filteredFields = fields.filter(field => field.toLowerCase().startsWith(partial.toLowerCase()));

        return {
            from: word.from + varName.length + 1, // start completion after the dot
            options: filteredFields.map(field => ({
                label: field.replace(/ /g, "_"),
                type: 'property'
            }))
        };
    };

    _createEditor(value) {
        const wrapper = document.createElement('div');
        wrapper.className = 'links-item-input';
        wrapper.style.width = '100%';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';

        const editorHolder = document.createElement('div');
        editorHolder.className = 'links-item__cm-editor';
        editorHolder.style.width = '100%';
        editorHolder.style.minHeight = '50px';
        editorHolder.style.border = this.isError ? '1px solid #d9534f' : '1px solid #ccc';
        editorHolder.style.paddingBottom = '15px';
        wrapper.appendChild(editorHolder);

        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'links-item__accept-btn';
        acceptBtn.textContent = 'Update';
        acceptBtn.style.width = '100%';
        acceptBtn.style.boxSizing = 'border-box';
        wrapper.appendChild(acceptBtn);

        const startState = EditorState.create({
            doc: value || '',
            extensions: [
                basicSetup,
                csharp(),
                this.themeCompartment.of(githubLight),
                autocompletion({
                    override: [this._completionSource],
                    container: document.body, // append tooltips to body
                }),
                this._highZIndexAutocomplete,
                EditorView.updateListener.of(update => {
                    if (update.docChanged) {
                        this.state.inputField = update.state.doc.toString();
                        this._resizeEditor(editorHolder, update.view);
                    }
                })
            ]
        });

        const view = new EditorView({ state: startState, parent: editorHolder });
        this._resizeEditor(editorHolder, view);

        const viewKey = `cm-${this.id}`;
        directFieldLink._views.set(viewKey, view);

        acceptBtn.onclick = () => {
            this.state.inputField = view.state.doc.toString();
            this.updateFun?.(this, true);
        };

        return wrapper;
    }

    setTheme(newTheme) {
        const view = directFieldLink._views.get(`cm-${this.id}`);
        if (view) {
            view.dispatch({
                effects: this.themeCompartment.reconfigure(newTheme)
            });
        }
    }

    display(containerDiv) {
        containerDiv.innerHTML = "";
        const viewKey = `cm-${this.id}`;
        this._destroyEditor(viewKey);

        Object.entries(this.state).forEach(([key, val]) => {
            if (key === 'inputField') {
                const editorWrapper = this._createEditor(val);
                containerDiv.appendChild(editorWrapper);
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'links-item';

            const lbl = document.createElement('span');
            lbl.className = 'links-item__label';
            lbl.textContent = key === "dataSet1" ? "X : From" : "Y : To";
            wrapper.appendChild(lbl);

            const dsSelect = document.createElement('select');
            dsSelect.className = 'links-item__dataset-select';
            if (this.isError) dsSelect.classList.add('links-item__dataset-select__error');
            dsSelect.add(new Option('-- Select Dataset --', ''));
            Object.keys(this.fieldPerDataset || {}).forEach(ds => dsSelect.add(new Option(ds, ds)));
            dsSelect.value = val || '';
            dsSelect.onchange = () => {
                this.state[key] = dsSelect.value;
            };
            wrapper.appendChild(dsSelect);

            containerDiv.appendChild(wrapper);
        });
    }
}
