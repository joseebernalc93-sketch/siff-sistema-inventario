const fs = require('fs');
const path = require('path');

function search(dir) {
  if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('.git')) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      search(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.dart')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('customer_identity')) {
        console.log("FOUND IN:", fullPath);
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes('customer_identity')) {
            console.log(`  Line ${i + 1}: ${line}`);
          }
        });
      }
    }
  }
}
search('d:/UG/Tesis/Joelys/Minimarket');
