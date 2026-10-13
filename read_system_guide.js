const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function readPDF(filename, outfile) {
    let dataBuffer = new Uint8Array(fs.readFileSync(filename));
    try {
        const parser = new PDFParse(dataBuffer, { verbosity: 0 });
        await parser.load();
        
        const info = await parser.getInfo();
        const totalPages = info.total;
        console.log('Total pages:', totalPages);
        
        let allText = '';
        for (let i = 1; i <= totalPages; i++) {
            try {
                const pageTextObj = await parser.getText({ pageNumber: i });
                // pageTextObj is an object with pages array
                if (pageTextObj && pageTextObj.pages) {
                    for (const page of pageTextObj.pages) {
                        allText += `\n\n========== PAGE ${page.num} ==========\n\n${page.text}`;
                    }
                } else if (typeof pageTextObj === 'string') {
                    allText += `\n\n========== PAGE ${i} ==========\n\n${pageTextObj}`;
                }
            } catch(e) {
                console.log(`Page ${i} failed:`, e.message);
            }
        }
        
        fs.writeFileSync(outfile, allText, 'utf8');
        console.log(`Extracted ${allText.length} chars to ${outfile}`);
        parser.destroy();
    } catch(err) {
        console.error('Error:', err.message);
    }
}

readPDF('KAIROX_PRODUCTION-EVENT_SYSTEM_GUIDE.pdf', 'system_guide_clean.txt');
