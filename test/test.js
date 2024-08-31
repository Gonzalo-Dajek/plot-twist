import { assert } from "chai";
import { test, suite } from "mocha";
import { helloWorld } from "../js/plotUtils.js";

suite("Array", function () {
    suite("#indexOf()", function () {
        test("should return -1 when the value is not present", function () {
            assert.equal([1, 2, 3].indexOf(4), -1);
        });
    });
});

suite("Import", function () {
    test("Hello world", function () {
        assert.equal(helloWorld(), 1);
    });
});
