import {
    setUpLoadCsv,
    setUpExportLayout,
    setUpLoadLayout,
    setUpTopBarScroll,
    setUpResize,
} from "./setUpUi.js";
// import { testPlots } from "./testingPlots.js";
import { rangeSet } from "./rangeSet.js";

// import {run} from "./benchMark.js";
// run();

let pcRef = { pc: undefined };
let data = [];
let defaultGridSize = { col: 3, row: 3 };
let socketRef = {socket: undefined };
// testPlots(pcRef, data, gridSize);

setUpTopBarScroll();
setUpLoadCsv(data, pcRef, defaultGridSize, socketRef, connectToWebSocket);
setUpExportLayout(defaultGridSize);
setUpLoadLayout(data, pcRef, defaultGridSize);
setUpResize("plotsContainer", defaultGridSize, pcRef, data);

// ------------------------------------------------------------------------------


function connectToWebSocket(socketRef, pcRef) {
    // Create a WebSocket connection to the C# server
    socketRef.socket = new WebSocket("ws://localhost:5226/");
    let socket = socketRef.socket;

    socket.onopen = function() {
        console.log("WebSocket is open now.");
        pcRef.pc.addPlot(0, () => {
            let selection = new rangeSet();
            for (let [id, plot] of pcRef.pc._plots.entries()) {
                if (id !== 0) {
                    selection.addSelectionArr(JSON.parse(JSON.stringify(plot.lastSelectionRange)), plot.selectionMode);
                }
            }

            const message = {
                type: "selection",
                range: selection.toArr(),
            };

            socket.send(JSON.stringify(message));
            console.log("Sent message:", message);
        });

        const message = {
            type: "addClient",
            dataSet: { name: pcRef.pc.dsName, fields: pcRef.pc.fields() },
        };

        socket.send(JSON.stringify(message));
    };

    // When a message is received
    socket.onmessage = function(event) {
        const receivedData = JSON.parse(event.data);
        // const output = document.getElementById("output");
        // output.innerText = `Received: ${receivedData.content}\n`;

        // console.log(receivedData)
        switch (receivedData.type) {
            case "selection":
                console.log("Message from server:", receivedData);
                pcRef.pc.updatePlotsView(0, receivedData.range ?? []);
                break;
            case "link":
                console.log(receivedData);
                populateGroups(receivedData.links, pcRef.pc.fields(), socketRef);
                break;
        }

    };

    // When the connection is closed
    socket.onclose = function() {
        console.log("WebSocket connection closed");
        document.getElementById("sendBtn").disabled = true;
    };

    // Handle connection errors
    socket.onerror = function(error) {
        console.error("WebSocket error:", error);
    };
}
// document.getElementById("connectBtn").addEventListener("click", connectToWebSocket);

// function getSelectedValues() {
//     const group = document.getElementById("group").value;
//     let field = document.getElementById("field").value;
//     if (field===""){
//         field = null;
//     }
//     return {
//         group,
//         field,
//     }
// }
//
// function createLinkGroup() {
//     const selectedValues = getSelectedValues();
//     document.getElementById("output").innerText = `Create ${JSON.stringify(selectedValues)}`;
//     let message = {
//         type: "link",
//         links: [{
//             group: selectedValues.group,
//             field: selectedValues.field,
//             dataSet: pcRef.pc.dsName,
//             action: "create",
//         }],
//     };
//     socket.send(JSON.stringify(message));
//     console.log("Sent message: ", message);
// }
//
// function deleteLinkGroup() {
//     const selectedValues = getSelectedValues();
//     document.getElementById("output").innerText = `Delete ${JSON.stringify(selectedValues)}`;
//     let message = {
//         type: "link",
//         links: [{
//             group: selectedValues.group,
//             field: selectedValues.field,
//             dataSet: pcRef.pc.dsName,
//             action: "delete",
//         }],
//     };
//     socket.send(JSON.stringify(message));
//     console.log("Sent message: ", message);
// }
// function updateFieldFromGroup() {
//     const selectedValues = getSelectedValues();
//     document.getElementById("output").innerText = `Update field from Group ${JSON.stringify(selectedValues)}`;
//     let message = {
//         type: "link",
//         links: [{
//             group: selectedValues.group,
//             field: selectedValues.field,
//             dataSet: pcRef.pc.dsName,
//             action: "update",
//         }],
//     };
//     socket.send(JSON.stringify(message));
//     console.log("Sent message: ", message);
// }

// document.getElementById("createGroupBtn").addEventListener("click", createLinkGroup);
// document.getElementById("deleteGroupBtn").addEventListener("click", deleteLinkGroup);
// document.getElementById("updateFieldBtn").addEventListener("click", updateFieldFromGroup);


document.getElementById("group-name-submit").addEventListener("click", function (){
    createGroup(socketRef)
});
function createGroup(socketRef){
    let socket = socketRef.socket;
    let text = document.getElementById("input-group-name").value;
    if(text!==""){
        // console.log(text);
        let message = {
            type: "link",
            links: [{
                group: text,
                field: null,
                dataSet: pcRef.pc.dsName,
                action: "create",
            }],
        };
        socket.send(JSON.stringify(message));
        console.log("Sent message: ", message);
    }
    document.getElementById("input-group-name").value = "";
}

function populateGroups(groupsArray, listOfFields, socketRef) {
    const groupsListDiv = document.getElementById("groups-list");
    groupsListDiv.innerHTML = ""; // Clear existing content

    listOfFields.unshift("None selected");
    groupsArray.forEach((obj) => {
        // Create a container for each group
        const groupDiv = document.createElement("div");
        groupDiv.classList.add("groups-item");
        groupDiv.classList.add("group");

        // Add the group name text
        const groupText = document.createElement("span");
        groupText.innerText = obj.group;
        groupDiv.appendChild(groupText);

        // Create the delete button
        const deleteButton = document.createElement("button");
        deleteButton.innerText = "Delete";
        deleteButton.onclick = () => deleteGroup(obj.group, socketRef);
        groupDiv.appendChild(deleteButton);

        // Create the dropdown for selecting fields
        const dropdown = document.createElement("select");
        listOfFields.forEach((field) => {
            const option = document.createElement("option");
            option.value = field;
            option.innerText = field;
            if (field === obj.field) option.selected = true; // Set default value
            dropdown.appendChild(option);
        });

        // Set the event for when a field is selected
        dropdown.onchange = (event) => updateFieldInGroup(obj.group, event.target.value, socketRef);
        groupDiv.appendChild(dropdown);

        // Append the constructed groupDiv to groupsListDiv
        groupsListDiv.appendChild(groupDiv);
    });
}

function deleteGroup(group, socketRef){
    let socket = socketRef.socket;
    let message = {
        type: "link",
        links: [{
            group: group,
            field: null,
            dataSet: pcRef.pc.dsName,
            action: "delete",
        }],
    };
    socket.send(JSON.stringify(message));
    console.log("Sent message: ", message);
}
function updateFieldInGroup(group, value, socketRef){
    let socket = socketRef.socket;
    let message;
    if(value!=="None selected"){
        message = {
            type: "link",
            links: [{
                group: group,
                field: value,
                dataSet: pcRef.pc.dsName,
                action: "update",
            }],
        };
    }else{
        message = {
            type: "link",
            links: [{
                group: group,
                field: null,
                dataSet: pcRef.pc.dsName,
                action: "update",
            }],
        };
    }

    socket.send(JSON.stringify(message));
    console.log("Sent message: ", message);
}
document.getElementById("slide-menu-btn").addEventListener("click", function() {
    document.querySelector(".group-component").classList.toggle("active");
    document.querySelector("#slide-menu-btn").classList.toggle("active");
});
