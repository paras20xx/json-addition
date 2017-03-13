# JSON Addition

Add two or more JSON objects/files, through command-line or programmatically.

## Installation and Usage

There are two ways to install json-addition: globally and locally.

### Global Installation and Usage

```
$ npm install -g json-addition
```

```
$ json-addition --help
$ json-addition --inputFiles="*.json" --outputFile="output.json"
```

### Local Installation and Usage

```
$ npm install --save json-addition
```

```
var jsonAddition = require('json-addition');
var output = jsonAddition.addJSONs(
    { time: '11 minutes', count: { shops: 1, customers: ['a1'] } },
    { time: '22 minutes', count: { shops: 2, customers: ['b1', 'b2'] } }
);

Output:
    { time: '33 minutes', count: { shops: 3, customers: ['a1', 'b1', 'b2'] } }
```

## Authors

* **Priyank Parashar** - [GitHub](https://github.com/paras20xx) | [Twitter](https://twitter.com/paras20xx)

See also the list of [contributors](https://github.com/paras20xx/json-addition/graphs/contributors) who participated in this project.

## License

[ISC](https://spdx.org/licenses/ISC)
