/* globals describe, it */

var assert = require('assert');
var fs = require('fs');
var addJSONs = require('../index.js').addJSONs;
var addJSONFiles = require('../index.js').addJSONFiles;

var additionRulesToPass = JSON.parse(fs.readFileSync(__dirname + '/data/rules.json', 'utf8'));

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
});
