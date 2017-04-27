/* globals describe, it */

var assert = require('assert');
var fs = require('fs');
var addJSONs = require('../index.js').addJSONs;
var addJSONFiles = require('../index.js').addJSONFiles;

var additionRulesToPass = JSON.parse(fs.readFileSync(__dirname + '/data/rules.json', 'utf8')),
    intersectionRulesToPass = JSON.parse(fs.readFileSync(__dirname + '/data/rules-intersection.json', 'utf8')),
    subtractionRulesToPass = JSON.parse(fs.readFileSync(__dirname + '/data/rules-subtraction.json', 'utf8'));

describe('Addition', function() {
    describe('json-add-operations', function() {
        it('should be able to add two simple json objects', function(done) {
            var obA = { a: true },
                obB = { b: true };

            var output = addJSONs([obA, obB], additionRulesToPass),
                expectedOutput = { a: true, b: true };
            assert.deepEqual(output, expectedOutput);
            done();
        });

        it('should be able to add two javascript function objects', function(done) {
            var obA = { "temp": function () { console.log('a'); } },
                obB = { "temp": function () { console.log('b'); } };

            var output = addJSONs([obA, obB], additionRulesToPass),
                expectedOutput = { "temp": "function () { console.log('a'); }, function () { console.log('b'); }" };
            assert.deepEqual(output, expectedOutput);
            done();
        });
    });

    describe('file-input', function() {
        it('should be able to add json from three files', function(done) {
            var output = addJSONFiles([__dirname + '/data/input-1.json', __dirname + '/data/input-2.json', __dirname + '/data/input-3.json'], null, additionRulesToPass, true),
                expectedOutput = JSON.parse(fs.readFileSync(__dirname + '/data/output-1-2-3.json', 'utf8'));

            assert.deepEqual(output, expectedOutput);
            done();
        });
    });

    describe('json-subtract-operations', function() {
        it('should be able to subtract a simple json object from another', function(done) {
            var obA = { a: true, b: true, c: false, d: false, e: 30, f: "30 seconds", g: "hello", h: "hello world", i: "hello world" },
                obB = { a: true, b: false, c: true, d: false, e: 20, f: "20 seconds", g: "world", h: "hello", i: "world" };

            var output = addJSONs([obA, obB], subtractionRulesToPass),
                expectedOutput = { a: 0, b: 1, c: -1, d: 0, e: 10, f: "10 seconds", g: "hello", h: "h̭ḙḽḽo̭ world", i: "hello w̭o̭r̭ḽḓ" };
            assert.deepEqual(output, expectedOutput);
            done();
        });

        it('should be able to subtract a json file from another', function(done) {
            var output = addJSONFiles([__dirname + '/data/input-3.json', __dirname + '/data/input-2.json'], null, subtractionRulesToPass, true),
                expectedOutput = JSON.parse(fs.readFileSync(__dirname + '/data/output-3-minus-2.json', 'utf8'));

            assert.deepEqual(output, expectedOutput);
            done();
        });
    });

    describe('json-intersect-operations', function() {
        it('should be able to intersect a json file with another', function(done) {
            var output = addJSONFiles([__dirname + '/data/intersect-1.json', __dirname + '/data/intersect-2.json'], null, intersectionRulesToPass, true),
                expectedOutput = JSON.parse(fs.readFileSync(__dirname + '/data/output-intersect-1-2.json', 'utf8'));

            assert.deepEqual(output, expectedOutput);
            done();
        });
    });
});
