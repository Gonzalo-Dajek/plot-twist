
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
                        <img src="assets/csv_icon.svg" alt="select CSV" class="csv-icon"/>
                    </label>
                    <input type="file" id="fileInput" class="file-input" />
                </div>

                <button id="loadDemo" class="top-bar-button">
                    Load Demo&nbsp;
                    <img src="assets/launch_icon.svg" class="csv-icon" alt="load demo">
                </button>

                <button id="exportLayoutButton" class="top-bar-button">
                    Save Layout&nbsp;
                    <img src="assets/download_icon.svg" class="csv-icon" alt="download layout file">
                </button>

                <div id="loadLayoutButton" class="indentFileUpload">
                    <label for="layoutInput" class="custom-file-upload top-bar-button">
                        Load layout&nbsp;
                        <img src="assets/upload_icon.svg" alt="upload layout file" class="csv-icon">
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
            <img src="assets/list_icon.svg" alt="Group links button">
            Field Groups
        </button>

        <script type="module" src="/js/main.js"></script>
    `;

    document.body.replaceWith(freshBody);
}