import fs from 'fs';

let lines = fs.readFileSync('mobile/minimarket_cliente/lib/main.dart', 'utf-8').split('\n');

// In _ClientAccessScreenState:
// 265:     super.initState();
// 266:     _currentIndex = widget.initialIndex;
// We know it is around line 266. We need to delete it.
for (let i = 250; i < 280; i++) {
  if (lines[i] && lines[i].includes('_currentIndex = widget.initialIndex;')) {
    console.log('Removing line ' + i + ': ' + lines[i]);
    lines.splice(i, 1);
    break;
  }
}

// In _WelcomeScreenState _ChatHeader:
// We need to find `firstName: headerName,` and change to `firstName: _firstName,`
for (let i = 2950; i < 3100; i++) {
  if (lines[i] && lines[i].includes('firstName: headerName,')) {
    console.log('Replacing line ' + i + ': ' + lines[i]);
    lines[i] = lines[i].replace('headerName', '_firstName');
    break;
  }
}

fs.writeFileSync('mobile/minimarket_cliente/lib/main.dart', lines.join('\n'), 'utf-8');
console.log('Done fix');
