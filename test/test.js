import { assert } from "chai";
import { test, suite } from "mocha";
// TODO:
//  -- https://sinonjs.org/
//  -- also research TDD syntax
//  -- https://www.chaijs.com/
//  -- https://sinonjs.org/
//  -- https://javascript.info/testing-mocha

suite("Array", function () {
    suite("#indexOf()", function () {
        test("should return -1 when the value is not present", function () {
            assert.equal([1, 2, 3].indexOf(4), -1);
        });
    });
});
