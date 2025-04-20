import * as d3 from "d3-random";

/**
 * from a matrix with data it creates a json table,
 * the matrix should have its categorical data on the last categorical_columns_amt columns
 */
export function dataToTable(matrix, categorical_columns_amt) {
    return matrix.map(row =>
        Object.fromEntries(row.map((value, index) =>
            [index < row.length - categorical_columns_amt ? `field${index}` : `catField${index - (row.length - categorical_columns_amt)}`, value],
        )),
    );
}

export function createData(rows, numerical_columns_amt, categorical_columns_amt, distributionType) {
    const data = Array.from({ length: rows }, () => Array(numerical_columns_amt + categorical_columns_amt).fill(0));
    const categories = ["A", "B", "C", "D", "E", "F", "G"];

    for (let col = 0; col < numerical_columns_amt; col++) {
        let values = [];

        switch (distributionType) {
            case "evenly distributed":
                values = Array.from({ length: rows }, () => Math.random());
                break;

            case "big clusters":
            case "small clusters": {
                const numClusters = 2;
                const clusterCenters = Array.from({ length: numClusters }, (_, i) => (i + 1) / (numClusters + 1));
                const spread = distributionType === "big clusters" ? 0.105 : 0.055;

                const rowClusters = Array.from({ length: rows }, () => clusterCenters[Math.floor(Math.random() * numClusters)]);

                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < numerical_columns_amt; col++) {
                        const value = d3.randomNormal(rowClusters[row], spread)();
                        data[row][col] = Math.max(0, Math.min(1, value));
                    }
                }
                break;
            }

            default:
                throw new Error("Invalid distribution type");
        }

        for (let row = 0; row < rows; row++) {
            data[row][col] = values[row];
        }
    }

    for (let col = numerical_columns_amt; col < numerical_columns_amt + categorical_columns_amt; col++) {
        for (let row = 0; row < rows; row++) {
            data[row][col] = categories[Math.floor(Math.random() * categories.length)];
        }
    }

    // adds two final rows such that the scatter plot goes from (0,0) to (1,1) instead of getting cropped
    data[rows] = data[rows-1];
    data[rows][0] = 0;
    data[rows][1] = 1;
    data[rows+1] = data[rows-1];
    data[rows+1][0] = 1;
    data[rows+1][1] = 0;
    return data;
}