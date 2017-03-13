#!/usr/bin/env node

var fs = require('fs');

var _ = require('lodash'),
    chalk = require('chalk');

var standardAdditionRules = {
    binaryOperation: 'OR',
    ignoreErrors: false,
    sort: false,
    unique: false
};

var generateJSONsFromFiles = function (inputFiles) {
    var jsons = [],
        isItArray = null,
        itsType = null,
        flagInconsistency = false;

    inputFiles.some(function (inputFile) {
        var jsonText = fs.readFileSync(inputFile, 'utf8'),
            json = JSON.parse(jsonText);
        jsons.push(json);

        if (isItArray === null) {
            isItArray = Array.isArray(json);
            itsType = typeof json;
        } else {
            if (
                isItArray !== Array.isArray(json) ||
                itsType !== typeof json
            ) {
                flagInconsistency = true;
                return true;
            }
        }
    });
    if (flagInconsistency) {
        console.log('An inconsistency was found in data structure.');
        process.exit(1);
    }

    return jsons;
};

// http://stackoverflow.com/questions/3885817/how-do-i-check-that-a-number-is-float-or-integer/3886106#3886106
var isFloat = function (n) {    // Parameter "n" should be a number
    return Number(n) === n && n % 1 !== 0;
};

var fixFloatingError = function (n, precision) {
    // http://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript/3644302#3644302
    return parseFloat(n.toPrecision(precision || 15));
};

var addThese = function (a, b, jsonIndex, pathSoFar, key, globalAdditionRules, specificAdditionRules) {
    globalAdditionRules = globalAdditionRules || {};
    specificAdditionRules = specificAdditionRules || {};

    if (pathSoFar) {
        pathSoFar += '.' + key;
    } else {
        pathSoFar = key;
    }

    var rulesForThis = Object.assign(
        Object.assign({}, globalAdditionRules),
        specificAdditionRules[pathSoFar]
    );

    var retValue = null;
    if (typeof a === 'undefined' || typeof b === 'undefined' || a === null || b === null) {
        if (rulesForThis.subtract && jsonIndex === 1) {
            retValue = '_skipThisProperty';
        } else {
            retValue = a || b;
        }
    } else if (typeof a === 'number' && typeof b === 'number') {
        if (rulesForThis.subtract) {
            retValue = a - b;
        } else {
            retValue = a + b;
        }
        if (isFloat(retValue)) {
            retValue = fixFloatingError(retValue);
        }
    } else if (typeof a === 'string' && typeof b === 'string') {
        var floatValueA = parseFloat(a),
            remainingValueA = a.replace(/^[0-9\.]+/, ''),
            floatValueB = parseFloat(b),
            remainingValueB = b.replace(/^[0-9\.]+/, '');
        if (isNaN(floatValueA) || isNaN(floatValueB) || remainingValueA !== remainingValueB) {
            if (rulesForThis.subtract) {
                retValue = a.replace(b, b.split('').join("̭") + (b.length ? "̭" : ""));
            } else {
                retValue = a + ', ' + b;
            }
        } else {
            if (rulesForThis.subtract) {
                retValue = fixFloatingError(floatValueA - floatValueB) + remainingValueA;
            } else {
                retValue = fixFloatingError(floatValueA + floatValueB) + remainingValueA;
            }
        }
    } else if (typeof a === 'boolean' && typeof b === 'boolean') {
        if (rulesForThis.subtract) {
            retValue = a - b;
        } else if (rulesForThis.binaryOperation === 'AND') {
            retValue = a && b;
        } else if (rulesForThis.binaryOperation === 'OR') {
            retValue = a || b;
        } else {
            console.log(rulesForThis);
            console.log(chalk.red('Unexpected value (' + rulesForThis.binaryOperation + ') in a rule for a binaryOperation.'));
            process.exit(1);
        }
    } else if (Array.isArray(a) && Array.isArray(b)) {
        if (rulesForThis.subtract) {
            retValue = _.difference(a, b);
        } else {
            retValue = a.concat(b);
        }

        if (rulesForThis.sort) {
            retValue = retValue.sort();
        }
        if (rulesForThis.unique) {
            retValue = _.uniq(retValue);
        }
    } else if (typeof a === 'object' && typeof b === 'object') {
        retValue = add(Object.assign({}, a), b, jsonIndex, pathSoFar, rulesForThis, specificAdditionRules);
    } else if (typeof a === 'function' && typeof b === 'function') {
        retValue = a.toString() + ', ' + b.toString();
    } else if (typeof a === 'string' || typeof b === 'string') {
        retValue = a.toString() + ', ' + b.toString();
    } else {
        if (rulesForThis.ignoreErrors) {
            retValue = a.toString() + ', ' + b.toString();
        } else {
            console.log('Error: TODO');
            process.exit(1);
        }
    }
    return retValue;
};

var add = function (output, json, jsonIndex, pathSoFar, globalAdditionRules, specificAdditionRules) {
    Object.keys(json).forEach(function (key) {
        var val = json[key];

        var value = addThese(output[key], val, jsonIndex, pathSoFar, key, globalAdditionRules, specificAdditionRules);
        if (value !== '_skipThisProperty') {
            output[key] = addThese(output[key], val, jsonIndex, pathSoFar, key, globalAdditionRules, specificAdditionRules);
        }
    });
    return output;
};

var addJSONs = function (jsons, additionRules) {
    additionRules = additionRules || {};
    var output = {};
    var globalAdditionRules = Object.assign({}, standardAdditionRules);
    Object.assign(globalAdditionRules, additionRules.globalAdditionRules);
    jsons.forEach(function (json, jsonIndex) {
        output = add(output, json, jsonIndex, '', globalAdditionRules, additionRules.specificAdditionRules);
    });
    return output;
};

var writeJSON = function (file, json) {
    fs.writeFile(file, JSON.stringify(json, null, '  '), 'utf8', function (err) {
        if (err) {
            console.log(chalk.red('\n \u2718 ') + chalk.gray('Error in writing data to file: ' + file) + '\n');
        } else {
            console.log(chalk.green('\n \u2714 ') + chalk.gray('Output successfully written to file: ' + file) + '\n');
        }
    });
};

var outputToFileOrLog = function (file, json, skipOutput) {
    if (!skipOutput) {
        if (file) {
            writeJSON(file, json);
        } else {
            console.log(JSON.stringify(json, null, '  '));
            // console.log(require('util').inspect(json, { depth: null, colors: true, breakLength: 0 }));
        }
    }
    return json;
};

var addJSONFiles = function (inputFiles, outputFile, rules, skipOutput) {
    var jsons = generateJSONsFromFiles(inputFiles),
        addedJSON = addJSONs(jsons, rules);
    return outputToFileOrLog(outputFile, addedJSON, skipOutput);
};

if (!module.parent) {
    var glob = require('glob'),
        argv = require('yargs').argv;

    if (argv.v || argv.verbose) {
        delete argv.s;
        delete argv.silent;
    }

    var showHelp = function () {
        console.log(chalk.gray([
            '',
            'Format:   json-addition --inputFiles="<glob1> [<glob2> [... <globN>]]" [--outputFile="<output-file>"] [<option1> [<option2> [... <optionN>]]]',
            'Examples: json-addition --inputFiles="test/data/input-1.json test/data/input-2.json"',
            '          json-addition --inputFiles="test/data/input-1.json test/data/input-2.json test/data/input-3.json" --outputFile=temp/output-1-2-3.json',
            '          json-addition --inputFiles="test/data/input-1.json test/data/input-3.json test/data/input-2.json" --subtract',
            'Options:  -s --silent',
            '          -v --verbose',
            '          -h --help',
            '             --inputFiles="<glob1> [<glob2> [... <globN>]]"',
            '             --outputFile="<filename>"',
            '             --rules="<filename>"',
            '             --ruleBinaryOperation="<OR/AND>"',
            '             --ruleIgnoreErrors',
            '             --ruleSort',
            '             --ruleUnique',
            '             --subtract',
            ''
        ].join('\n')));
    };

    var showHelpAndExitWithError = function (errMsg) {
        showHelp();
        console.log(chalk.red(errMsg));
        process.exit(1);
    };

    if (argv.h || argv.help) {
        showHelp();
        process.exit(0);
    }

    if (argv.inputFiles && typeof argv.inputFiles !== 'string') {
        showHelpAndExitWithError('Error: Invalid argument for inputFiles');
    }
    var strInputFiles = (argv.inputFiles || '') && argv.inputFiles.trim(),
        inputFiles = strInputFiles.match(/\S+/g) || [];

    if (!inputFiles.length) {
        showHelpAndExitWithError('Error: Please provide an argument for --inputFiles');
    }

    if (argv.outputFile && typeof argv.outputFile !== 'string') {
        showHelpAndExitWithError('Error: Invalid argument for --outputFile');
    }
    var outputFile = (argv.outputFile || '') && argv.outputFile.trim();

    var rules = {
        globalAdditionRules: Object.assign({}, standardAdditionRules),
        // globalAdditionRules: Object.assign({}, globalAdditionRules),
        specificAdditionRules: {}
    };
    if (argv.rules && typeof argv.rules !== 'string') {
        showHelpAndExitWithError('Error: Invalid argument for --rules');
    }
    var rulesFile = (argv.rules || '') && argv.rules.trim();
    if (rulesFile) {
        let rulesFromFile;
        try {
            rulesFromFile = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
        } catch (e) {
            showHelpAndExitWithError('Error: Could not find a valid JSON file at: ' + rulesFile);
        }
        Object.assign(rules.globalAdditionRules, rulesFromFile.globalAdditionRules);
        Object.assign(rules.specificAdditionRules, rulesFromFile.specificAdditionRules);

        if (argv.v || argv.verbose) {
            console.log(chalk.gray(
                '\nUsing addition rules from file:\n    ' + rulesFile +
                '\n\nAddition rules:' +
                '\n    ' + JSON.stringify(rulesFromFile, null, '  ').replace(/\n/g, '\n    ')
            ));
        }
    }

    if (argv.ruleBinaryOperation) {
        if (argv.ruleBinaryOperation === 'OR' || argv.ruleBinaryOperation === 'AND') {
            rules.globalAdditionRules.binaryOperation = argv.ruleBinaryOperation;
        } else {
            showHelpAndExitWithError('Error: Invalid argument for --ruleBinaryOperation');
        }
    }
    if (argv.ruleIgnoreErrors) { rules.globalAdditionRules.ignoreErrors = true; }
    if (argv.ruleSort) { rules.globalAdditionRules.sort = true; }
    if (argv.ruleUnique) { rules.globalAdditionRules.unique = true; }
    if (argv.subtract) { rules.globalAdditionRules.subtract = true; }

    var jsons = null;
    if (inputFiles.length) {
        var allInputFiles = [];
        inputFiles.forEach(function (inputFilePattern) {
            var thisGlob = glob.sync(inputFilePattern);
            if (!thisGlob.length) {
                showHelpAndExitWithError('Error: Could not load file(s) mentioned in --allInputFiles having pattern "' + inputFilePattern + '"');
            }
            allInputFiles = allInputFiles.concat(thisGlob);
        });
        if (argv.v || argv.verbose) {
            console.log(chalk.gray('\nWorking on these files:'));
            console.log(chalk.gray('    ' + allInputFiles.join('\n    ')));
        }
        jsons = generateJSONsFromFiles(allInputFiles);
    }
    var outputJSON = addJSONs(jsons, rules);
    outputToFileOrLog(outputFile, outputJSON, argv.s || argv.silent);
}

module.exports.add = add;
module.exports.addJSONs = addJSONs;
module.exports.addJSONFiles = addJSONFiles;
