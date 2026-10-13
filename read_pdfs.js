const fs = require('fs');
const pdf = require('pdf-parse');

async function readPDF(filename) {
    let dataBuffer = fs.readFileSync(filename);
    try {
        let data = await pdf(dataBuffer);
        let lines = data.text.split('\n');
        console.log(`--- ${filename} ---`);
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes('cutting')) {
                console.log(`[Line ${i}]: ${lines[i]}`);
                // Print surrounding lines for context
                let start = Math.max(0, i - 2);
                let end = Math.min(lines.length - 1, i + 4);
                let context = lines.slice(start, end).join(' ');
                console.log(`CONTEXT: ${context}\n`);
            }
        }
    } catch(err) {
        console.error(err);
    }
}

readPDF('KAIROX_PRODUCTION-EVENT_API_REFERENCE.pdf');
readPDF('KAIROX_PRODUCTION-EVENT_SYSTEM_GUIDE.pdf');
