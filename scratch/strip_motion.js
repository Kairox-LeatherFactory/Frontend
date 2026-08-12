const fs = require('fs');
const files = ['src/app/dashboard/attendance/page.js', 'src/app/dashboard/barcode/page.js'];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Replace motion.div with normal div
  content = content.replace(/<motion\.div variants=\{staggerContainer\} initial="show" animate="show"/g, '<div');
  content = content.replace(/<motion\.tbody variants=\{rowStagger\} initial="show" animate="show"/g, '<tbody');
  
  // Now we need to fix the closing tags. This is tricky because there are other motion.divs.
  // Instead of regex, let's just strip the props from the string.
  
  // Actually, since I already replaced the opening tags, the closing tags will be mismatched if I just replaced '<motion.div' with '<div'.
  // Let's just remove the props: variants={...} initial="show" animate="show"
});
