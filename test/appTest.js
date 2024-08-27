// const assert = require("assert");
import {assert} from 'chai';
// TODO:
//  -- https://sinonjs.org/
//  -- also research TDD syntax
//  -- https://www.chaijs.com/
//  -- https://sinonjs.org/
//  -- https://javascript.info/testing-mocha

describe("Array", function () {
    describe(".indexOf()", function () {
        it("should return -1 when the value is not present", function () {
            assert.equal([1, 2, 3].indexOf(4), -1);
            assert.equal([1, 2].indexOf(2), 1);
        });
    });
});
