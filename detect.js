import fs from 'fs';
import path from 'path';
import utils from './utils.js';

// Function to traverse the JSON files in the given directory
function traverseDirectory(directory, specificFile = null) {
    if (!fs.existsSync(directory)) {
        // vscode dialog box
        console.log('Warning: The .walkthru folder does not exist.');
        return;
    }

    const files = specificFile ? [specificFile] : fs.readdirSync(directory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
        // vscode dialog box
        console.log('Warning: No JSON files found in the .walkthru folder.');
        return;
    }

    jsonFiles.forEach(file => {
        const filePath = path.join(directory, file);
        processJSONFile(filePath, file);
    });
}

// Function to process each JSON file
function processJSONFile(filePath, fileName) {
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updated = false;

    jsonData.blocks.forEach(block => {
        // Check for snippet type
        if (block.type === 'snippet') {
            const result = verifySnippet(block, block.data.path);
            if (result) {
                block.outdated = result.status === 'outdated';
                block.obsolete = result.status === 'obsolete' && (block.outdated = true);
                block.data['line_start'] = result.lineStart || block.data['line_start'];
                block.data['line_end'] = result.lineEnd || block.data['line_end'];
                updated = true;
            }
        }

        // Check for path type
        if (block.type === 'path') {
            const pathExists = fs.existsSync(block.data.path);
            block.outdated = !pathExists;
            updated = true;
        }
    });

    if (updated) {
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    }
}

// Function to verify each code snippet
function verifySnippet(snippet, filePath) {
    const { text, 'line_start': lineStart, 'line_end': lineEnd } = snippet.data;
    const fileContent = fs.readFileSync(filePath, 'utf8');

    const { matchPercentage, start } = utils.findSnippetInFile(fileContent, text);
    const snippetLines = snippet.data.text.split('\n').length;
    const end = start + snippetLines - 1;

    if (matchPercentage === 100) {
        console.log({ status: 'up-to-date', lineStart: start, lineEnd: end });
        return { status: 'up-to-date', lineStart: start, lineEnd: end };
    } else if (matchPercentage >= 50) {
        console.log({ status: 'outdated' });
        return { status: 'outdated', lineStart: start, lineEnd: end };
    } else {
        console.log({ status: 'obsolete' });
        return { status: 'obsolete' };
    }
}

// Main runner function with an optional parameter for a specific file
function main(specificFile = null) {
    const directory = './.walkthru';

    if (specificFile) {
        const filePath = path.join(directory, specificFile);
        if (fs.existsSync(filePath)) {
            processJSONFile(filePath, specificFile);
        } else {
            console.log(`File ${specificFile} does not exist in ${directory}`);
        }
    } else {
        traverseDirectory(directory);
    }
}

// Example usage with or without a specific file
const specificFile = 'xyz.json' // Optional command-line argument for specific file
main(specificFile);
