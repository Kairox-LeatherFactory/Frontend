const fs = require('fs');

let f = fs.readFileSync('src/app/dashboard/barcode/page.js', 'utf8');

// Replace AnimatePresence mode="wait" wrapped around motion.div with a normal div
f = f.replace(/<AnimatePresence mode="wait">\s*<motion\.div([^>]*)>/g, '<div$1>');
f = f.replace(/<\/motion\.div>\s*<\/AnimatePresence>/g, '</div>');

// Replace other <motion.div> and <AnimatePresence> that are NOT toast
f = f.replace(/<AnimatePresence \s*>\s*\{([a-zA-Z]+) && \(\s*<motion\.div\s*initial=\{\{[^}]+\}\}\s*animate=\{\{[^}]+\}\}\s*exit=\{\{[^}]+\}\}\s*transition=\{\{[^}]+\}\}\s*style=\{\{[^}]+\}\}\s*>/g, '{$1 && (<div style={{ overflow: "hidden" }}>');
f = f.replace(/<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>/g, '</div>)}');

fs.writeFileSync('src/app/dashboard/barcode/page.js', f);
console.log('Stripped framer motion wrappers from barcode');
