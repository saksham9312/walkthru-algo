import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array for storing distances
    const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

    // Initialize the first row and column
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,   // Deletion
                matrix[i][j - 1] + 1,   // Insertion
                matrix[i - 1][j - 1] + cost // Substitution
            );
        }
    }
    return matrix[len1][len2];
}

function getLevenshteinMatchPercentage(str1, str2) {
    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const matchPercentage = ((maxLength - distance) / maxLength) * 100;
    return matchPercentage;
}

function calculateMultiLineMatchPercentage(oldSnippetLines, newSnippetLines) {
    let totalDistance = 0;
    let totalLength = 0;

    // Get the maximum length to calculate match percentage
    const maxLength = Math.max(oldSnippetLines.length, newSnippetLines.length);

    // Compare corresponding lines
    for (let i = 0; i < Math.max(oldSnippetLines.length, newSnippetLines.length); i++) {
        const oldLine = oldSnippetLines[i] || ""; // Handle cases where lines may not exist
        const newLine = newSnippetLines[i] || "";

        const distance = levenshteinDistance(oldLine, newLine);
        totalDistance += distance;
        totalLength += Math.max(oldLine.length, newLine.length); // We consider the max length for match percentage
    }

    // Calculate match percentage
    const matchPercentage = ((totalLength - totalDistance) / totalLength) * 100;

    return matchPercentage;
}

function getSnippetFromLineStart(fileContent, lineStart) {

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

function constructCodeTagFromRegex(matchedText, line) {
    const startPos = line.indexOf(matchedText);
    if (startPos === -1) return ""; // Return empty if the matched text isn't found

    let completeCodeTag = "";

    // Build the complete code tag from the starting position
    for (let i = startPos; i < line.length; i++) {
        if (isAlphanumeric(line[i])) {
            completeCodeTag += line[i];
        } else {
            break; // Stop when a non-alphanumeric character is found
        }
    }

    return completeCodeTag;
}

function constructMultiLineSnippet(fileContent,outdatedSnippet,lineStart){
    let updatedFile = getSnippetFromLineStart(fileContent, lineStart);
    let updatedFileTrimmed = updatedFile.map(line => line.trim());
    let outdatedSnippetTrimmed = outdatedSnippet.map(line => line.trim());
    let matchCount = 0;
    if(outdatedSnippetTrimmed[0] == updatedFileTrimmed[0]){
        matchCount = 1
    }
    let finalSnippet = []

    let isFirstLineAdded = false
    if(!isFirstLineAdded){
        finalSnippet.push(updatedFile[0])
        isFirstLineAdded = true
    }
    let i=1, j=1, k=1
    let lastMatchIndex = []
    let outdatedSnippetLength = outdatedSnippet.length

    while(i<outdatedSnippetLength && j<outdatedSnippetLength && k<updatedFile.length){
        if (lastMatchIndex.includes(j) || lastMatchIndex.includes(i)){
            i++
            j=i
            continue
        }
        const a = outdatedSnippet[j]
        const b = updatedFile[k]
        if (outdatedSnippetTrimmed[j] == updatedFileTrimmed[k]){
            finalSnippet.push(updatedFile[k])
            lastMatchIndex.push(j)
            k++;
            i++
            j=i;
            matchCount++;
            if(lastMatchIndex.length >1 && lastMatchIndex.includes(i)){
                i++;
                j=i;
            }
        }
        else if(outdatedSnippetTrimmed[i] != updatedFileTrimmed[k]){
            if(j == outdatedSnippetLength-1){
                j=i;
                finalSnippet.push(updatedFile[k]);
                k++;
                continue;
            }
            j++;
            if(lastMatchIndex.includes(j)){
                j++;
            }
        }
    }
    const maxLength = Math.max(outdatedSnippet.length, finalSnippet.length);
    const matchPercentage = matchCount / maxLength * 100;
    return {finalSnippet: finalSnippet, lineEnd: k-1, matchPercentage: matchPercentage};
}

async function findBestMatch(fileContent, originalString, multi = false, matchThreshold) {
    const lines = fileContent.split('\n').map(line => line.trim());
    const lineCount = lines.length;
    originalString = originalString.trim();
    let matchArray = []; // To store matches if multi is true

    // Helper function for forward search (top to bottom)
    const searchFromTop = () => {
        for (let i = 0; i < lineCount; i++) {
            const matchPercentage = getLevenshteinMatchPercentage(originalString, lines[i]);
            if (matchPercentage === 100 && !multi) {
                // Return as soon as we find 100% match
                return [{ lineNumber: i + 1, matchedText: lines[i], matchPercentage: matchPercentage} ];
            } else if (matchPercentage >= 50) {
                // Store results for multi match case
                matchArray.push({ lineNumber: i + 1, matchedText: lines[i], matchPercentage });
            }
        }
        return null; // Return null if no exact match found
    };

    // Run the search
    const result = searchFromTop();

    if (matchArray.length>0) {
        matchArray.sort((a, b) => b.matchPercentage - a.matchPercentage); // Sort by match percentage in descending order
        return matchArray; // Return all matches
    }

    // If not found, return null
    return result
}

async function verifyPath(snippetBlock) {
    console.time("Execution Time Path");
    const result =  fs.existsSync(snippetBlock.data.path);
    snippetBlock.obsolete = result;
    return snippetBlock;

}

async function verifySnippet(snippetBlock) {
    console.time("Execution Time");
    // Read the file content
    const outdatedSnippet = snippetBlock.data.text;
    const lineStart = snippetBlock.data.line_start;
    const codeFile = snippetBlock.data.path;
    
    const fileContent = fs.readFileSync(codeFile, 'utf8');
    const lines = fileContent.split('\n');
    
    // Extract the snippet lines
    const snippetLines = outdatedSnippet.split('\n');
    const snippetLength = snippetLines.length;

    // Check if the snippet exists at the specified line start
    if (lineStart >= 0 && lineStart <= lines.length) {
        const exactMatchAtSpecifiedLine = lines.slice(lineStart - 1, lineStart - 1 + snippetLength)
            .every((line, index) => line.trim() === snippetLines[index].trim());

        if (exactMatchAtSpecifiedLine) {
            snippetBlock.outdated = false;
            snippetBlock.obsolete = false;
            snippetBlock.data['line_start'] = lineStart;
            snippetBlock.data['line_end'] = lineStart + snippetLength - 1;

            return snippetBlock
        }
    }

    // If not found, check the entire file
    for (let i = 0; i <= lines.length - snippetLength; i++) {
        const match = lines.slice(i, i + snippetLength)
            .every((line, index) => line.trim() === snippetLines[index].trim());

        if (match) {
            snippetBlock.outdated = false;
            snippetBlock.obsolete = false;
            snippetBlock.data['line_start'] = i + 1;
            snippetBlock.data['line_end'] = i + snippetLength;

            return snippetBlock
        }
    }

    // Return false if not found
    snippetBlock.outdated = true;
    return snippetBlock;
}

async function updateSnippet(snippetBlock) {
    console.time("Execution Time");
    const outdatedSnippet = snippetBlock.data.text.split('\n');
    let multi = false;
    let matchThreshold = 70;
    if(outdatedSnippet.length> 1) {
        multi = true;
        matchThreshold = 50;
    }
    const lineStart = snippetBlock.data['line_start'];
    const lineEnd = snippetBlock.data['line_end'];
    const codeFile = snippetBlock.data.path;
    const fileContent = fs.readFileSync(codeFile, 'utf8');

    let bestMatchArray = await findBestMatch(fileContent, outdatedSnippet[0], multi, matchThreshold);
    let updatedSnippetArray = []
    if(multi && bestMatchArray.length > 0) {
        for(let i = 0; i < bestMatchArray.length; i++) {
            let bestMatch = bestMatchArray[i];
            const constructedSnippetArr = constructMultiLineSnippet(fileContent, outdatedSnippet, bestMatch['lineNumber']);
            const multiSnippetMatchPer = constructedSnippetArr['matchPercentage'];
            if(multiSnippetMatchPer >= 30) {
                updatedSnippetArray.push({
                    lineStart: bestMatch['lineNumber'],
                    lineEnd: bestMatch['lineNumber'] + constructedSnippetArr['lineEnd'],
                    constructedSnippet: constructedSnippetArr['finalSnippet'],
                    matchPercentage: multiSnippetMatchPer
                });
            }
        }
        if(updatedSnippetArray.length > 0) {
            updatedSnippetArray.sort((a, b) => b.matchPercentage - a.matchPercentage);
            updatedSnippetArray = updatedSnippetArray[0]
            return {
                "id": snippetBlock.id,
                "type": snippetBlock.type,
                "outdated": snippetBlock['outdated'],
                "obsolete": false,
                "data": {
                  "text": updatedSnippetArray['constructedSnippet'].join('\n'),
                  "path": snippetBlock.data.path,
                  "line_start": updatedSnippetArray['lineStart'],
                  "line_end": updatedSnippetArray['lineEnd'],
                }
              }
        }else{
            return {
                "id": snippetBlock.id,
                "type": snippetBlock.type,
                "outdated": snippetBlock['outdated'],
                "obsolete": true,
                "data": {
                  "text": snippetBlock.data.text,
                  "path": snippetBlock.data.path,
                  "line_start": snippetBlock.data['line_start'],
                  "line_end": snippetBlock.data['line_end'],
                }
              }
        }
    }else if(bestMatchArray != null && bestMatchArray.length >0){
        return {
            "id": snippetBlock.id,
            "type": snippetBlock.type,
            "outdated": snippetBlock['outdated'],
            "obsolete": false,
            "data": {
              "text": bestMatchArray[0]['matchedText'],
              "path": snippetBlock.data.path,
              "line_start": bestMatchArray[0]['lineNumber'],
              "line_end": bestMatchArray[0]['lineNumber'],
            }
          }

    }else{
        let i=0, k=0;
        let updatedCodeTagArray = [];
        let newCodeTag = [];
        let lapp = 0;
        return {
            "id": snippetBlock.id,
            "type": snippetBlock.type,
            "outdated": snippetBlock['outdated'],
            "obsolete": true,
            "data": {
              "text": snippetBlock.data.text,
              "path": snippetBlock.data.path,
              "line_start": snippetBlock.data['line_start'],
              "line_end": snippetBlock.data['line_end'],
            }
          }
    }
}
function isAlphanumeric(char) {
    const code = char.charCodeAt(0);
    // Check if it's an uppercase letter, lowercase letter, digit, or underscore
    return (code >= 48 && code <= 57) || // 0-9
           (code >= 65 && code <= 90) || // A-Z
           (code >= 97 && code <= 122) || // a-z
           (code === 95);  // underscore (_)
}

function calculateTagMatchPer(outdatedCodeTag, updatedCodeTag){
    let i=0, k=0;
    let continuousMatch = 0;
    let prevContinuousMatch = 0;
    while(k< updatedCodeTag.length){
        while(i < outdatedCodeTag.length && k < updatedCodeTag.length) {
            if(outdatedCodeTag[i] === updatedCodeTag[k]) {
                continuousMatch++;
                i++;
                k++;
            }else{
                if(continuousMatch > prevContinuousMatch) {
                    prevContinuousMatch = continuousMatch;
                }
                continuousMatch =0;
                i++;
            }
        }
        if(continuousMatch > prevContinuousMatch){
            prevContinuousMatch = continuousMatch;
        }
        k++, i = prevContinuousMatch;
    }
    const matchPercentage = (prevContinuousMatch/outdatedCodeTag.length)*100;
    return matchPercentage;
}

async function updateCodeTag(snippetBlock){
    console.time("Execution Time");
    let updatedSnippetBlock = await updateSnippet(snippetBlock);
    if(updatedSnippetBlock.obsolete) {
        return {
            "id": snippetBlock.id,
            "type": snippetBlock.type,
            "outdated": snippetBlock['outdated'],
            "obsolete": true,
            "data": {
              "text": snippetBlock.data.text,
              "path": snippetBlock.data.path,
              "line_start": snippetBlock.data['line_start'],
              "line_end": snippetBlock.data['line_end'],
              "tag": snippetBlock.data.tag
            }
          }
    }
    let updatedString = updatedSnippetBlock.data.text;
    let outdatedCodeTag = snippetBlock.data.tag;
    let updatedLineStart = updatedSnippetBlock.data['line_start'];

    let i=0, k=0;
    let updatedCodeTagArray = [];
    let newCodeTag = [];
    outdatedCodeTag = outdatedCodeTag.split('');
    updatedString = updatedString.split('');
    let updatedStartPos = null;

    while(i<updatedString.length){
        if(updatedString[i] == outdatedCodeTag[k] && isAlphanumeric(updatedString[i])){
            if(updatedStartPos == null){
                updatedStartPos = i;
            }
            newCodeTag += updatedString[i];
            i++;
            k++;
        }else if(updatedString[i] != outdatedCodeTag[k] && isAlphanumeric(updatedString[i])){
            if(updatedStartPos == null){
                updatedStartPos = i;
            }
            newCodeTag += updatedString[i];
            i++;
        }else{
            let matchPercentage = calculateTagMatchPer(outdatedCodeTag.join(''), newCodeTag);
            if(matchPercentage >= 50){
                updatedCodeTagArray.push({
                    updatedCodeTag : newCodeTag,
                    matchPercentage : matchPercentage
                });
                newCodeTag = [];
                updatedStartPos = null;
                i++;
                k = 0;
                continue;
            }
            newCodeTag = [];
            updatedStartPos = null;
            i++;
            k = 0;
        }
    }
    if(updatedCodeTagArray.length > 0){
        updatedCodeTagArray.sort((a, b) => b.matchPercentage - a.matchPercentage);
        return {
            "id": snippetBlock.id,
            "type": snippetBlock.type,
            "outdated": snippetBlock['outdated'],
            "obsolete": false,
            "data": {
              "text": updatedString.join(''),
              "path": snippetBlock.data.path,
              "line_start": updatedLineStart,
              "line_end": updatedLineStart,
              "tag": updatedCodeTagArray[0].updatedCodeTag
            }
          }
        }else{
            return {
                "id": snippetBlock.id,
                "type": snippetBlock.type,
                "outdated": snippetBlock['outdated'],
                "obsolete": true,
                "data": {
                  "text": snippetBlock.data.text,
                  "path": snippetBlock.data.path,
                  "line_start": snippetBlock.data['line_start'],
                  "line_end": snippetBlock.data['line_end'],
                  "tag": snippetBlock.data.tag
                }
            }
    }
}

function getChangedLineNumbers(outdatedSnippet, updatedSnippet) {
    const changedLines = [];
    outdatedSnippet = outdatedSnippet.split('\n');
    updatedSnippet = updatedSnippet.split('\n');

    // Get the minimum length to avoid out-of-bounds errors
    const minLength = Math.min(outdatedSnippet.length, updatedSnippet.length);

    // Compare lines within the length of the shorter snippet
    for (let i = 0; i < minLength; i++) {
        if (outdatedSnippet[i] !== updatedSnippet[i]) {
            changedLines.push(i + 1); // Line numbers are 1-based
        }
    }

    // If the updated snippet has extra lines, add those as changed lines
    if (updatedSnippet.length > outdatedSnippet.length) {
        for (let i = minLength; i < updatedSnippet.length; i++) {
            changedLines.push(i + 1); // Adding remaining lines from updated snippet
        }
    }

    // If the outdated snippet has extra lines that aren't in updatedSnippet, add them as changed
    if (outdatedSnippet.length > updatedSnippet.length) {
        for (let i = minLength; i < outdatedSnippet.length; i++) {
            changedLines.push(i + 1); // Adding remaining lines from outdated snippet
        }
    }

    return changedLines;
}

// Example usage
const outdatedSnippet = [
    "let client = await Client.findOne({apiKey: client_cred});",
    "client.populate('users');",
    "console.log('Outdated snippet');"
];

const updatedSnippet = [
    "let client = await Client.findOne({apiKey: client_cred});",
    "client.populate('users');",
    "console.log('Updated snippet');",
    "client.save();"
];

const changedLines = getChangedLineNumbers(outdatedSnippet, updatedSnippet);
console.log(changedLines); // Output: [3, 4]


// // Example usage

// const snippetBlock =     {
//     "id": "example3",
//     "type": "code-tag",
//     "outdated": true,
//     "obsolete": false,
//     "data": {
//       "text": "let client = await Client.findOne({apiKey: client_cred}).populate('users');",
//       "tag": "Client",
//       "path": "test_code_files/process_controller.js",
//       "line_start": 49,
//       "line_end": 49
//     }
//   }

// const snippetBlock_2 =     {
//     "id": "example1",
//     "type": "snippet",
//     "outdated": true,
//     "obsolete": false,
//     "data": {
//       "text": "    for (let i = 0; i < namespace.length; i++) {\n\t\t\thash = ((hash << 5) - hash) + namespace.charCodeAt(i);\n\t\t\thash |= 0; // Convert to 32bit integer\n\t\t}",
//       "path": "test_code_files/config_controller.js",
//       "line_start": 1233,
//       "line_end": 1335
//     }
//   }

//   const snippetBlock_3 =     {
//     "id": "e0fc54b1-0345-4b14-aefe-7df24fbf5247",
//     "outdated": false,
//     "obsolete": false,
//     "type": "snippet",
//     "data": {
//       "path": "test_code_files/index.java",
//       "line_start": 84,
//       "line_end": 102,
//       "text": "    public static void main(String[] args) {  \n  \n        DeleteStart dList = new DeleteStart();  \n        //Add nodes to the list  \n        dList.addNode(1);  \n        dList.addNode(2);  \n        dList.addNode(3);  \n        dList.addNode(4);  \n        dList.addNode(5);  \n  \n        //Printing original list  \n        System.out.println(\"Original List: \");  \n        dList.display();  \n        while(dList.head != null) {  \n            dList.deleteFromStart();  \n            //Printing updated list  \n            System.out.println(\"Updated List: \");  \n            dList.display();  \n        }  \n    }  "
//     }
//   }

// // const result = await verifySnippet(snippetBlock);
// // const resultPath = await verifyPath(snippetBlock);
// // console.timeEnd("Execution Time Path");
// // const updatedSnippetBlock = await updateSnippet(snippetBlock_3);
// // console.timeEnd("Execution Time");
// // console.log(updatedSnippetBlock);
// // console.log(result);

// // const matchPer = calculateTagMatchPer('Client', 'Client');
// // console.log(matchPer);

// const result = constructCodeTagFromRegex("On", "let client = await xxClienctzz.findOne({apiKey: client_cred}).populate('users');")
// console.log(result);