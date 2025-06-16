
import deleteIcon from '../../assets/delete_icon.svg';

export function showOffErrorMsg(errorMsg) {
    let containerDiv = document.querySelector(".error-msg-container");

    if (!containerDiv) {
        containerDiv = document.createElement("div");
        containerDiv.className = "error-msg-container";
        document.body.appendChild(containerDiv);
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = "error-msg";
    messageDiv.textContent = errorMsg;

    const closeButton = document.createElement("span");
    closeButton.className = "close-button";

    const icon = document.createElement("img");
    icon.src = deleteIcon;
    icon.alt = "Close";
    icon.className = "close-icon";

    icon.onclick = function () {
        messageDiv.remove();
    };

    closeButton.appendChild(icon);
    messageDiv.appendChild(closeButton);
    containerDiv.appendChild(messageDiv);
}

export function initCrossDataSetLinkTable(eventsCoordinatorRef) {
    const links = eventsCoordinatorRef.eventsCoordinator._linksModules;
    const select = document.getElementById("field-group-name");

    // populate dropdown
    for (let LinkClass of links) {
        const name = LinkClass.optionSelectName;
        const opt  = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    }

    // on submit: instantiate matching classes and call onDraw()
    document
        .getElementById("group-name-submit")
        .addEventListener("click", () => {
            const chosen = select.value;

            for (let LinkClass of links) {
                if (LinkClass.optionSelectName === chosen) {
                    // instantiate with your dataSets
                    const instance = new LinkClass(eventsCoordinatorRef.eventsCoordinator._dataSets);

                    // 1) outer wrapper
                    const wrapper = document.createElement("div");
                    wrapper.classList.add("group-wrapper");

                    // 2) delete‑button bar with title
                    const deleteBar = document.createElement("div");
                    deleteBar.classList.add("group-deleteBar");

                    const titleDiv = document.createElement("div");
                    titleDiv.classList.add("group-title");
                    titleDiv.textContent = LinkClass.optionSelectName;

                    const delBtn = document.createElement("button");
                    delBtn.textContent = "Delete";
                    delBtn.classList.add("group-deleteBtn");
                    delBtn.addEventListener("click", () => wrapper.remove());

                    deleteBar.appendChild(titleDiv);
                    deleteBar.appendChild(delBtn);
                    wrapper.appendChild(deleteBar);

                    // 3) content area
                    const body = document.createElement("div");
                    body.classList.add("group-body");
                    wrapper.appendChild(body);

                    // 4) render inside
                    const updateFun = () => {
                        body.textContent = "";
                        instance.display(body, updateFun);
                    };
                    instance.display(body, updateFun);

                    // 5) append into your menu list
                    document.getElementById("groups-list").appendChild(wrapper);
                    return;
                }
            }
        });

    document.getElementById("slide-menu-btn")
        .addEventListener("click", () => {
            document.querySelector(".group-component").classList.toggle("active");
            document.querySelector("#slide-menu-btn").classList.toggle("active");
        });
}


// export function connectToWebSocket(socketRef, pcRef, url) {
//
//     socketRef.socket = new WebSocket(url);
//     let socket = socketRef.socket;
//
//     socket.onopen = function() {
//         pcRef.pc.addPlot(0, () => {
//             let selection = new rangeSet();
//             for (let [id, plot] of pcRef.pc._plotsModules.entries()) {
//                 if (id !== 0) {
//                     selection.addSelectionArr(JSON.parse(JSON.stringify(plot.lastSelectionRange)));
//                 }
//             }
//
//             const message = {
//                 type: "selection",
//                 range: selection.toArr(),
//             };
//
//             socket.send(JSON.stringify(message));
//             // console.log("Sent message:", message);
//         });
//
//         const message = {
//             type: "addClient",
//             dataSet: { name: pcRef.pc.dsName, fields: pcRef.pc.fields() },
//         };
//
//         socket.send(JSON.stringify(message));
//
//         document.getElementById("slide-menu-btn").style.display = "flex";
//     };
//
//     // When a message is received
//     socket.onmessage = ({ data }) => {
//         const msg = JSON.parse(data);
//         if (msg.type === 'selection') {
//             // processSelection(msg.range ?? []);
//             pcRef.pc.throttledUpdatePlotsView(0, msg.range[0].selectionPerDataSet[0] ?? []);
//         } else if (msg.type === 'link') {
//             populateGroups(msg.links, pcRef.pc.fields(), socketRef, pcRef);
//         }
//     };
//
//     // socket.onmessage = function(event) {
//     //     const receivedData = JSON.parse(event.data);
//     //
//     //     // console.log("Message from server:", receivedData);
//     //     switch (receivedData.type) {
//     //         case "selection":
//     //             pcRef.pc.throttledUpdatePlotsView(0, receivedData.range ?? []);
//     //
//     //             break;
//     //         case "link":
//     //             populateGroups(receivedData.links, pcRef.pc.fields(), socketRef, pcRef);
//     //             break;
//     //     }
//     // };
//
//     // When the connection is closed
//     socket.onclose = function() {
//         // console.log("WebSocket connection closed");
//         showOffErrorMsg("The tool is running in offline mode")
//         pcRef.pc.removePlot(0);
//         pcRef.pc.addPlot(0, ()=> {});
//     };
//
//     // Handle connection errors
//     socket.onerror = function( error ) {
//         console.log("WebSocket error:", error);
//         console.log("The tool is currently in offline mode");
//         pcRef.pc.removePlot(0);
//         pcRef.pc.addPlot(0, ()=> {});
//         // showOffErrorMsg("The tool is running in offline mode")
//     };
// }



// function createGroup(socketRef, pcRef) {
//     let socket = socketRef.socket;
//     let text = document.getElementById("state-group-name").value;
//     if (text !== "") {
//         let message = {
//             type: "link",
//             links: [{
//                 group: text,
//                 field: null,
//                 dataSet: pcRef.pc.dsName,
//                 action: "create",
//             }],
//         };
//         socket.send(JSON.stringify(message));
//         console.log("Sent message: ", message);
//     }
//     document.getElementById("state-group-name").value = "";
// }

// export function populateGroups(groupsArray, listOfFields, socketRef, pcRef) {
//     const groupsListDiv = document.getElementById("groups-list");
//     groupsListDiv.innerHTML = ""; // Clear existing content
//
//     listOfFields.unshift("None selected");
//     groupsArray.forEach((obj) => {
//         // Create a container for each group
//         const groupDiv = document.createElement("div");
//         groupDiv.classList.add("groups-item");
//         groupDiv.classList.add("group");
//
//         // Add the group name text
//         const groupText = document.createElement("span");
//         groupText.innerText = obj.group;
//         groupDiv.appendChild(groupText);
//
//         // Create the delete button
//         const deleteButton = document.createElement("button");
//         deleteButton.innerText = "Delete";
//         deleteButton.onclick = () => deleteGroup(obj.group, socketRef, pcRef);
//         groupDiv.appendChild(deleteButton);
//
//         // Create the dropdown for selecting fields
//         const dropdown = document.createElement("select");
//         listOfFields.forEach((field) => {
//             const option = document.createElement("option");
//             option.value = field;
//             option.innerText = field;
//             if (field === obj.field) option.selected = true; // Set default value
//             dropdown.appendChild(option);
//         });
//
//         // Set the event for when a field is selected
//         dropdown.onchange = (event) => updateFieldInGroup(obj.group, event.target.value, socketRef, pcRef);
//         groupDiv.appendChild(dropdown);
//
//         groupsListDiv.appendChild(groupDiv);
//     });
// }

// function deleteGroup(group, socketRef, pcRef) {
//     let socket = socketRef.socket;
//     let message = {
//         type: "link",
//         links: [{
//             group: group,
//             field: null,
//             dataSet: pcRef.pc.dsName,
//             action: "delete",
//         }],
//     };
//     socket.send(JSON.stringify(message));
//     console.log("Sent message: ", message);
// }

// function updateFieldInGroup(group, value, socketRef, pcRef) {
//     let socket = socketRef.socket;
//     let message;
//     if (value !== "None selected") {
//         message = {
//             type: "link",
//             links: [{
//                 group: group,
//                 field: value,
//                 dataSet: pcRef.pc.dsName,
//                 action: "update",
//             }],
//         };
//     } else {
//         message = {
//             type: "link",
//             links: [{
//                 group: group,
//                 field: null,
//                 dataSet: pcRef.pc.dsName,
//                 action: "update",
//             }],
//         };
//     }
//
//     socket.send(JSON.stringify(message));
//     console.log("Sent message: ", message);
// }
