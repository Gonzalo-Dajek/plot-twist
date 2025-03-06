import { rangeSet } from "../core/rangeSet.js";

export function initFieldGroups(pcRef, socketRef) {
    document.getElementById("group-name-submit").addEventListener("click", function() {
        createGroup(socketRef, pcRef);
    });

    document.getElementById("slide-menu-btn").addEventListener("click", function() {
        document.querySelector(".group-component").classList.toggle("active");
        document.querySelector("#slide-menu-btn").classList.toggle("active");
    });

}

export function connectToWebSocket(socketRef, pcRef, url) {

    // Create a WebSocket connection to the backend

    socketRef.socket = new WebSocket(url); // todo: handle error gracefully
    let socket = socketRef.socket;

    socket.onopen = function() {
        // console.log("WebSocket is open now.");
        pcRef.pc.addPlot(0, () => {
            let selection = new rangeSet();
            for (let [id, plot] of pcRef.pc._plots.entries()) {
                if (id !== 0) {
                    selection.addSelectionArr(JSON.parse(JSON.stringify(plot.lastSelectionRange)));
                }
            }

            const message = {
                type: "selection",
                range: selection.toArr(),
            };

            socket.send(JSON.stringify(message));
            // console.log("Sent message:", message);
        });

        const message = {
            type: "addClient",
            dataSet: { name: pcRef.pc.dsName, fields: pcRef.pc.fields() },
        };

        socket.send(JSON.stringify(message));

        document.getElementById("slide-menu-btn").style.display = "flex";
    };

    // When a message is received
    socket.onmessage = function(event) {
        const receivedData = JSON.parse(event.data);

        switch (receivedData.type) {
            case "selection":
                // console.log("Message from server:", receivedData);
                pcRef.pc.updatePlotsView(0, receivedData.range ?? []);
                break;
            case "link":
                populateGroups(receivedData.links, pcRef.pc.fields(), socketRef, pcRef);
                break;
        }
    };

    // When the connection is closed
    socket.onclose = function() {
        console.log("WebSocket connection closed");
        // document.getElementById("sendBtn").disabled = true;
    };

    // Handle connection errors
    socket.onerror = function( error ) {
        pcRef.pc.addPlot(0, ()=>{});
        console.log("WebSocket error:", error);
    };
}

function createGroup(socketRef, pcRef) {
    let socket = socketRef.socket;
    let text = document.getElementById("input-group-name").value;
    if (text !== "") {
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

export function populateGroups(groupsArray, listOfFields, socketRef, pcRef) {
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
        deleteButton.onclick = () => deleteGroup(obj.group, socketRef, pcRef);
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
        dropdown.onchange = (event) => updateFieldInGroup(obj.group, event.target.value, socketRef, pcRef);
        groupDiv.appendChild(dropdown);

        groupsListDiv.appendChild(groupDiv);
    });
}

function deleteGroup(group, socketRef, pcRef) {
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

function updateFieldInGroup(group, value, socketRef, pcRef) {
    let socket = socketRef.socket;
    let message;
    if (value !== "None selected") {
        message = {
            type: "link",
            links: [{
                group: group,
                field: value,
                dataSet: pcRef.pc.dsName,
                action: "update",
            }],
        };
    } else {
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
