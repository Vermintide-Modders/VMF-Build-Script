
module.exports = function cfg() {

    module.exports.setBase = setBase;
    module.exports.getBase = getBase;
    module.exports.setRelativeDir = setRelativeDir;
    module.exports.getPath = getPath;
    module.exports.getDir = getDir;
    module.exports.writeFile = writeFile;
    module.exports.readFile = readFile;
    module.exports.getValue = getValue;
    module.exports.getMappedValue = getMappedValue;

    init();

    return module.exports;
};

const pfs = require('../lib/pfs');
const path = require('../lib/path');
const str = require('../lib/str');

const config = require('./config');
const cl = require('./cl');

const modTools = require('../tools/mod_tools');

let base = '';
let relativeDir = '';

// Name of key in vmb source code - name and type of key in .cfg files
let mappedKeys = {
    bundleDir: { key: 'content', type: 'string' },
    itemPreview: { key: 'preview', type: 'string' }
};

// Sets up paths based on cl and config
function init() {

    // Get custom .cfg file path from cl args
    let cfgArg = cl.get('cfg');

    // Set paths to custom cfg path, or use default one
    if (cfgArg) {
        let cfgPath = path.parse(String(cfgArg) + '.cfg');
        setBase(cfgPath.base);
        setRelativeDir(cfgPath.dir);
    }
    else {
        setBase('itemV' + config.get('gameNumber') + '.cfg');
    }
}

// Sets the name of .cfg file
function setBase(newBase) {
    base = newBase;
}

// Returns name of .cfg file
function getBase() {
    return base;
}

// Sets dir path of .cfg file
function setRelativeDir(newDir) {
    relativeDir = newDir;
}

// Gets full path of .cfg file
function getPath(modName) {
    return path.combine(getDir(modName), base);
}

// Gets dir path of .cfg file
function getDir(modName) {
    let modDir = modTools.getModDir(modName);
    return path.absolutify(relativeDir, modDir);
}

// Creates item.cfg file
async function writeFile(params) {

    // Construct tags string
    let tagArray = String(params.tags).split(/;\s*/);
    let tags = '';
    for (let tag of tagArray) {

        if (tag.length === 0) {
            continue;
        }

        if (tags.length > 0) {
            tags += ', ';
        }

        tags += `"${tag}"`;
    };

    // Construct .cfg file content
    let configText = `title = "${params.title}";\n` +
        `description = "${params.description}";\n` +
        `preview = "${config.get('itemPreview')}";\n` +
        `content = "${params.content || config.get('defaultBundleDir')}";\n` +
        `language = "${params.language}";\n` +
        `visibility = "${params.visibility}";\n` +
        `tags = [${tags}]`;

    console.log(`${base}:`);
    console.log(`  ${str.rmn(configText).replace(/\n/g, '\n  ')}`);

    return await pfs.writeFile(params.filePath, configText);
}

// Returns .cfg file's data
async function readFile(filePath) {
    return await pfs.readFile(filePath, 'utf8');
}

// Gets key value from .cfg file data
function getValue(data, key, type) {
    let regEx;

    switch (type) {

        case 'number':
            regEx = `(?:^|;)\\s*${key}\\s*=\\s*(\\d+)\\D?\\s*;`;
            break;

        case 'string':
            regEx = `(?:^|;)\\s*${key}\\s*=\\s*"([^"]*)"\\s*;`;
            break;

        default:
            throw new Error(`Unsupported cfg value type "${type}"`);
    }

    regEx = new RegExp(regEx);
    let match = data.match(regEx);

    return match && Array.isArray(match) && match.length > 1 ? match[1] : null;
}

// Gets value of a keys from mappedKeys array, throws if value isn't found
function getMappedValue(filePath, data, mappedKey) {

    let { key, type } = mappedKeys[mappedKey];
    let value = getValue(data, key, type);

    if (typeof value != type) {
        throw new Error(`No '${key}' value specified` + (filePath ? ` in "${filePath}"` : ''));
    }

    return value;
}
