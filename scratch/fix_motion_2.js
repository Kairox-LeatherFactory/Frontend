const fs = require('fs');
const files = ['src/app/dashboard/attendance/page.js', 'src/app/dashboard/barcode/page.js'];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/initial="hidden" animate="show"/g, 'initial="show" animate="show"');
  fs.writeFileSync(f, content);
  console.log('Fixed', f);
});
