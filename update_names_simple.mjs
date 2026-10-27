import fs from 'fs';

let content = fs.readFileSync('mobile/minimarket_cliente/lib/main.dart', 'utf-8');

// Update RoleDashboardScreen (around 5848)
content = content.replace(
  /final String firstName = account\.name\.trim\(\)\.isEmpty\s*\n\s*\? \(role == 'empleado' \? 'Empleado' : 'Delivery'\)\s*\n\s*: account\.name\.trim\(\)\.split\(RegExp\(r'\\s\+'\)\)\.first;/,
  "final String displayName = account.name.trim().isEmpty ? 'Usuario' : account.name.trim();\n    final String roleCapitalized = role == 'empleado' ? 'Empleado' : 'Delivery';\n    final String firstName = '$roleCapitalized $displayName';"
);

// Update MainMenuScreen (around 5026)
content = content.replace(
  /final String firstName = account\.name\.trim\(\)\.isEmpty\s*\n\s*\? 'cliente'\s*\n\s*: account\.name\.trim\(\)\.split\(RegExp\(r'\\s\+'\)\)\.first;/,
  "final String displayName = account.name.trim().isEmpty ? 'Usuario' : account.name.trim();\n    final String firstName = 'Cliente $displayName';"
);

// We need to update ClientScreen (WelcomeScreen or wherever _firstName is set)
// Around line 2186: class _WelcomeScreenState extends State<WelcomeScreen>
// Let's find where _firstName is assigned.
content = content.replace(
  /String get _firstName => widget\.account\.name\.trim\(\)\.isEmpty\s*\n\s*\? 'Amada'\s*\n\s*: widget\.account\.name\.trim\(\)\.split\(RegExp\(r'\\s\+'\)\)\.first;/,
  "String get _firstName {\n    final n = widget.account.name.trim();\n    return 'Cliente ${n.isEmpty ? 'Usuario' : n}';\n  }"
);

fs.writeFileSync('mobile/minimarket_cliente/lib/main.dart', content, 'utf-8');
console.log('Done simple replace');
