export function customTickFormat(d) {
    // Handle negative numbers
    if (d < 0) {
        // Format small negative numbers in scientific notation
        if (d > -1) {
            return d.toExponential(1);  // Scientific notation for small negative numbers
        } else if (String(d).length > 5) {
            return d.toExponential(1);  // Format large negative numbers in scientific notation
        } else {
            return d;  // Display small negative integers as is
        }
    } else { // Handle positive numbers
        // Format small positive numbers in scientific notation
        if (d > 0 && d < 1) {
            return d.toExponential(1);  // Scientific notation for small positive numbers
        } else if (d === 0) {
            return "0";  // Display zero without decimal
        } else if (String(d).length > 5) {
            return d.toExponential(1);  // Format large positive numbers in scientific notation
        } else {
            return d;  // Display small positive integers as is
        }
    }
}

