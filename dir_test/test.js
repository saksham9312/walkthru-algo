import fs from 'fs';

function getSnippetFromLineStart(filePath, lineStart) {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Split the file content into lines
    const fileLines = fileContent.split('\n');

    // Validate the lineStart to ensure it’s within the range of file lines
    if (lineStart < 1 || lineStart > fileLines.length) {
        console.log('Error: Line start is out of range.');
        return [];
    }

    // Return the slice of the array from lineStart till the end
    return fileLines.slice(lineStart - 1);  // Adjust for 0-based index
}

// Example usage:
const filePath = 'test_code_files/config_controller.js';
const lineStart = 78;  // Starting line number of the new snippet

const snippetLines = getSnippetFromLineStart(filePath, lineStart);
console.log(snippetLines);  // Output the lines starting from lineStart
