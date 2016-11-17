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

var addThese = function (a, b, pathSoFar, key, globalAdditionRules, specificAdditionRules) {
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
        retValue = a || b;
    } else if (typeof a === 'number' && typeof b === 'number') {
        retValue = a + b;
    } else if (typeof a === 'string' && typeof b === 'string') {
        var floatValueA = parseFloat(a),
            remainingValueA = a.replace(/^[0-9\.]+/, ''),
            floatValueB = parseFloat(b),
            remainingValueB = b.replace(/^[0-9\.]+/, '');
        if (isNaN(floatValueA) || isNaN(floatValueB) || remainingValueA !== remainingValueB) {
            retValue = a + ', ' + b;
        } else {
            retValue = parseFloat((floatValueA + floatValueB).toPrecision(16)) + remainingValueA;
        }
    } else if (typeof a === 'boolean' && typeof b === 'boolean') {
        if (rulesForThis.binaryOperation === 'AND') {
            retValue = a && b;
        } else if (rulesForThis.binaryOperation === 'OR') {
            retValue = a || b;
        } else {
            console.log(rulesForThis);
            console.log(chalk.red('Unexpected value (' + rulesForThis.binaryOperation + ') in a rule for a binaryOperation.'));
            process.exit(1);
        }
    } else if (Array.isArray(a) && Array.isArray(b)) {
        retValue = a.concat(b);
        if (rulesForThis.sort) {
            retValue = retValue.sort();
        }
        if (rulesForThis.unique) {
            retValue = _.uniq(retValue);
        }
    } else if (typeof a === 'object' && typeof b === 'object') {
        retValue = add(Object.assign({}, a), b, pathSoFar, rulesForThis, specificAdditionRules);
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

var add = function (output, json, pathSoFar, globalAdditionRules, specificAdditionRules) {
    Object.keys(json).forEach(function (key) {
        var val = json[key];

        if (typeof output[key] === 'undefined') {
            output[key] = val;
        } else {
            output[key] = addThese(output[key], val, pathSoFar, key, globalAdditionRules, specificAdditionRules);
        }
    });
    return output;
};

var addJSONs = function (jsons, additionRules) {
    additionRules = additionRules || {};
    var output = {};
    var globalAdditionRules = Object.assign({}, standardAdditionRules);
    Object.assign(globalAdditionRules, additionRules.globalAdditionRules);
    jsons.forEach(function (json) {
        output = add(output, json, '', globalAdditionRules, additionRules.specificAdditionRules);
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

    if (argv.h || argv.help) {
        console.log(chalk.gray(
            '\nFormat:   ' + process.argv[0] + ' ' + process.argv[1] + ' --inputFiles="<glob1> [<glob2> [... <globN>]]" [--outputFile="<output-file>"]' +
            '\nExamples: ' + process.argv[0] + ' ' + process.argv[1] + ' --inputFiles="test/data/input-1.json test/data/input-2.json"' +
            '\n          ' + process.argv[0] + ' ' + process.argv[1] + ' --inputFiles="test/data/input-1.json test/data/input-2.json test/data/input-3.json" --outputFile=temp/output-1-2-3.json' +
            '\nOptions:  ' + '-s --silent' +
            '\n          ' + '-v --verbose' +
            '\n          ' + '-h --help' +
            '\n          ' + '   --inputFiles="<glob1> [<glob2> [... <globN>]]"' +
            '\n          ' + '   --outputFile="<filename>"' +
            '\n          ' + '   --rules="<filename>"' +
            '\n          ' + '   --ruleBinaryOperation="<OR/AND>"' +
            '\n          ' + '   --ruleIgnoreErrors' +
            '\n          ' + '   --ruleSort' +
            '\n          ' + '   --ruleUnique' +
            '\n'
        ));
        process.exit(0);
    }

    if (argv.inputFiles && typeof argv.inputFiles !== 'string') {
        console.log(chalk.red('Error: Invalid argument for inputFiles'));
        process.exit(1);
    }
    var strInputFiles = (argv.inputFiles || '') && argv.inputFiles.trim(),
        inputFiles = strInputFiles.match(/\S+/g) || [];

    if (!inputFiles.length) {
        console.log(chalk.red('Error: Please provide an argument for --inputFiles'));
        process.exit(1);
    }

    if (argv.outputFile && typeof argv.outputFile !== 'string') {
        console.log(chalk.red('Error: Invalid argument for --outputFile'));
        process.exit(1);
    }
    var outputFile = (argv.outputFile || '') && argv.outputFile.trim();

    var rules = {
        globalAdditionRules: Object.assign({}, standardAdditionRules),
        // globalAdditionRules: Object.assign({}, globalAdditionRules),
        specificAdditionRules: {}
    };
    if (argv.rules && typeof argv.rules !== 'string') {
        console.log(chalk.red('Error: Invalid argument for --rules'));
        process.exit(1);
    }
    var rulesFile = (argv.rules || '') && argv.rules.trim();
    if (rulesFile) {
        let rulesFromFile;
        try {
            rulesFromFile = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
        } catch (e) {
            console.log(chalk.red('Error: Could not find a valid JSON file at: ' + rulesFile));
            process.exit(1);
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
            console.log(chalk.red('Error: Invalid argument for --ruleBinaryOperation'));
            process.exit(1);
        }
    }
    if (argv.ruleIgnoreErrors) { rules.globalAdditionRules.ignoreErrors = true; }
    if (argv.ruleSort) { rules.globalAdditionRules.sort = true; }
    if (argv.ruleUnique) { rules.globalAdditionRules.unique = true; }

    var jsons = null;
    if (inputFiles.length) {
        var allInputFiles = [];
        inputFiles.forEach(function (inputFilePattern) {
            var thisGlob = glob.sync(inputFilePattern);
            if (!thisGlob.length) {
                console.log(chalk.red('Error: Could not load file(s) mentioned in --allInputFiles having pattern "' + inputFilePattern + '"'));
                process.exit(1);
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
