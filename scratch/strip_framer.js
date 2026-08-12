const fs = require('fs');

const files = [
  'src/app/dashboard/attendance/page.js',
  'src/app/dashboard/barcode/page.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Remove variants, initial, and animate props from ALL motion components in these files
  content = content.replace(/variants=\{[a-zA-Z]+\}/g, '');
  content = content.replace(/initial="[a-zA-Z]+"/g, '');
  content = content.replace(/animate="[a-zA-Z]+"/g, '');
  content = content.replace(/initial=\{false\}/g, '');
  content = content.replace(/exit="[a-zA-Z]+"/g, '');
  
  // Clean up any double spaces or empty classNames if any were left (optional)
  content = content.replace(/  +/g, ' ');

  fs.writeFileSync(f, content);
  console.log('Stripped framer-motion variants from', f);
});
