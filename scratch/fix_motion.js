const fs = require('fs');
const files = ['src/app/dashboard/attendance/page.js', 'src/app/dashboard/barcode/page.js'];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/initial=\{false\} animate="show"/g, 'initial="hidden" animate="show"');
  fs.writeFileSync(f, content);
  console.log('Fixed', f);
});
