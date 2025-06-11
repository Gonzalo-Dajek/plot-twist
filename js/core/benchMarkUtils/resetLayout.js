import csvIcon from '../../../assets/csv_icon.svg';
import launchIcon from '../../../assets/launch_icon.svg';
import downloadIcon from '../../../assets/download_icon.svg';
import uploadIcon from '../../../assets/upload_icon.svg';
import listIcon from '../../../assets/list_icon.svg';

export function resetLayout() {
    const freshBody = document.createElement("body");

    freshBody.innerHTML = `
        <div class="top-bar-dummy"></div>
        <div class="top-bar-fixedRectangle"></div>

        <div class="top-bar">
            <div class="top-bar-inner">

                <div class="indentFileUpload">
                    <label for="fileInput" class="custom-file-upload top-bar-button">
                        Upload data-set&nbsp;
                        <img class="csv-icon" />
                    </label>
                    <input type="file" id="fileInput" class="file-input" />
                </div>

                <button id="loadDemo" class="top-bar-button">
                    Load Demo&nbsp;
                    <img class="csv-icon">
                </button>

                <button id="exportLayoutButton" class="top-bar-button">
                    Save Layout&nbsp;
                    <img class="csv-icon">
                </button>

                <div id="loadLayoutButton" class="indentFileUpload">
                    <label for="layoutInput" class="custom-file-upload top-bar-button">
                        Load layout&nbsp;
                        <img class="csv-icon">
                    </label>
                    <input type="file" id="layoutInput" class="file-input" />
                </div>

            </div>
        </div>

        <div id="app-view">
            <div id="grid-container">
                <div id="plotsContainer"></div>
                <button id="col">+</button>
                <button id="row">+</button>
                <div></div>
            </div>
        </div>

        <div class="group-component">
            <span class="group-title">
                Cross data-set Field Groups
            </span>

            <div id="groups-list"></div>

            <div class="add-group-container">
                <label for="input-group-name">Group: </label>
                <input type="text" id="input-group-name">
                <button id="group-name-submit">Add Group</button>
            </div>
        </div>

        <button id="slide-menu-btn">
            <img alt="Group links button">
            Field Groups
        </button>

        <script type="module" src="/js/main.js"></script>
    `;

    document.body.replaceWith(freshBody);

    // Set image sources
    freshBody.querySelector('label[for="fileInput"] img').src = csvIcon;
    freshBody.querySelector('#loadDemo img').src = launchIcon;
    freshBody.querySelector('#exportLayoutButton img').src = downloadIcon;
    freshBody.querySelector('label[for="layoutInput"] img').src = uploadIcon;
    freshBody.querySelector('#slide-menu-btn img').src = listIcon;
}
