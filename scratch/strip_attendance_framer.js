const fs = require('fs');

let f = fs.readFileSync('src/app/dashboard/attendance/page.js', 'utf8');

// We only want to remove <motion.div> and <AnimatePresence> that are NOT Toasts
// Wait, attendance/page.js doesn't have mode="wait".
// Let's check what it has.
f = f.replace(/<AnimatePresence \s*>\s*\{([a-zA-Z]+) && \(\s*<motion\.div\s*initial=\{\{[^}]+\}\}\s*animate=\{\{[^}]+\}\}\s*exit=\{\{[^}]+\}\}\s*transition=\{\{[^}]+\}\}\s*style=\{\{[^}]+\}\}\s*>/g, '{$1 && (<div style={{ overflow: "hidden" }}>');
f = f.replace(/<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>/g, '</div>)}');

fs.writeFileSync('src/app/dashboard/attendance/page.js', f);
console.log('Stripped framer motion wrappers from attendance');
