import {
    setUpLoadCsv,
    setUpExportLayout,
    setUpLoadLayout,
    setUpTopBarScroll,
    setUpResize,
} from "./setUpUi.js";
import { testPlots } from "./testingPlots.js";
import { rangeSet } from "./rangeSet.js";

// import {run} from "./benchMark.js";
// run();

let pcRef = { pc: undefined };
let data = [];
let gridSize = { col: 3, row: 3 };
let lsRef = { ls: undefined };
// testPlots(pcRef, data, gridSize);

setUpTopBarScroll();
setUpLoadCsv(data, pcRef, gridSize);
setUpExportLayout(gridSize);
setUpLoadLayout(data, pcRef, gridSize);
setUpResize("plotsContainer", gridSize, pcRef, data);

// ------------------------------------------------------------------------------

// async function debugFetch() {
//     try {
//         const response = await fetch("http://localhost:5226/hello");
//
//         if (response.ok) {
//             const data = await response.json(); // Parse JSON from response
//             console.log(data.m); // Log the response data to the console
//         } else {
//             console.error("Error fetching data:", response.statusText);
//         }
//     } catch (error) {
//         console.error("Fetch error:", error);
//     }
// }
//
// // Add event listener to the button
// document.getElementById("fetch-button-debug").addEventListener("click", debugFetch);

let socket;


document.getElementById("connectBtn").addEventListener("click", function() {
    // Create a WebSocket connection to the C# server
    socket = new WebSocket("ws://localhost:5226/");


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
});

function getSelectedValues() {
    const dataSet1 = document.getElementById("dataSet1").value;
    const dataSet2 = document.getElementById("dataSet2").value;
    const field1 = document.getElementById("field1").value;
    const field2 = document.getElementById("field2").value;
    return {
        dataSet1,
        dataSet2,
        field1,
        field2,
    }
}

function createLink() {
    const selectedValues = getSelectedValues();
    document.getElementById("output").innerText = `Create ${JSON.stringify(selectedValues)}`;
    let message = {
        type: "link",
        links: [{
            dataSet1: selectedValues.dataSet1,
            dataSet2: selectedValues.dataSet2,
            field1: selectedValues.field1,
            field2: selectedValues.field2,
            timeOfCreation: Date.now(),
            action: "add",
        }],
    };
    socket.send(JSON.stringify(message));
    console.log("Sent message: ", message);
}

function deleteLink() {
    const selectedValues = getSelectedValues();
    document.getElementById("output").innerText = `Delete ${JSON.stringify(selectedValues)}`;
    let message = {
        type: "link",
        links: [{
            dataSet1: selectedValues.dataSet1,
            dataSet2: selectedValues.dataSet2,
            field1: selectedValues.field1,
            field2: selectedValues.field2,
            timeOfCreation: Date.now(),
            action: "delete",
        }],
    };
    socket.send(JSON.stringify(message));
    console.log("Sent message: ", message);
}
function relink() {
    const selectedValues = getSelectedValues();
    document.getElementById("output").innerText = `relink ${JSON.stringify(selectedValues)}`;
    let message = {
        type: "link",
        links: [{
            dataSet1: selectedValues.dataSet1,
            dataSet2: selectedValues.dataSet2,
            field1: selectedValues.field1,
            field2: selectedValues.field2,
            timeOfCreation: Date.now(),
            action: "relink",
        }],
    };
    socket.send(JSON.stringify(message));
    console.log("Sent message: ", message);
}
function unlink() {
    const selectedValues = getSelectedValues();
    document.getElementById("output").innerText = `unlink ${JSON.stringify(selectedValues)}`;
    let message = {
        type: "link",
        links: [{
            dataSet1: selectedValues.dataSet1,
            dataSet2: selectedValues.dataSet2,
            field1: selectedValues.field1,
            field2: selectedValues.field2,
            timeOfCreation: Date.now(),
            action: "unlink",
        }],
    };
    socket.send(JSON.stringify(message));
    console.log("Sent message: ", message);
}

document.getElementById("createLinkBtn").addEventListener("click", createLink);
document.getElementById("deleteLinkBtn").addEventListener("click", deleteLink);
document.getElementById("relinkBtn").addEventListener("click", relink);
document.getElementById("unlinkBtn").addEventListener("click", unlink);
