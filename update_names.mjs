import fs from 'fs';

function updateMainDart() {
  let content = fs.readFileSync('mobile/minimarket_cliente/lib/main.dart', 'utf-8');

  // ClientScreen
  content = content.replace(
    /final String firstName = widget\.account\.name\.trim\(\)\.isEmpty\s*\n\s*\? 'Amada'\s*\n\s*: widget\.account\.name\.trim\(\)\.split\(RegExp\(r'\\s\+'\)\)\.first;/,
    "final String displayName = widget.account.name.trim().isEmpty ? 'Usuario' : widget.account.name.trim();\n    final String headerName = 'Cliente $displayName';"
  );
  
  content = content.replace(
    /final String firstName = _firstName;/,
    "final String headerName = _firstName;"
  );

  content = content.replace(
    /firstName: firstName,/,
    "firstName: headerName,"
  );

  content = content.replace(
    /_ChatHeader\(\{\s*required this\.firstName,/,
    "_ChatHeader({\n    required this.firstName,"
  );
  
  // We don't need to change _ChatHeader's internal variable name (it's called firstName but it will receive "Cliente Jose Bernal").
  // But wait, the previous replace changed it to "headerName". Let's just pass `headerName` to `firstName` param.
  
  // RoleDashboardScreen
  content = content.replace(
    /final String firstName = account\.name\.trim\(\)\.isEmpty\s*\n\s*\? \(role == 'empleado' \? 'Empleado' : 'Delivery'\)\s*\n\s*: account\.name\.trim\(\)\.split\(RegExp\(r'\\\\s\+'\)\)\.first;/,
    "final String displayName = account.name.trim().isEmpty ? 'Usuario' : account.name.trim();\n    final String roleCapitalized = role == 'empleado' ? 'Empleado' : 'Delivery';\n    final String firstName = '$roleCapitalized $displayName';"
  );

  fs.writeFileSync('mobile/minimarket_cliente/lib/main.dart', content, 'utf-8');
}

function updateAdminModule() {
  let content = fs.readFileSync('mobile/minimarket_cliente/lib/admin_module.dart', 'utf-8');

  content = content.replace(
    /final String firstName = account\.name\.trim\(\)\.isEmpty\s*\n\s*\? 'Admin'\s*\n\s*: account\.name\.trim\(\)\.split\(RegExp\(r'\\s\+'\)\)\.first;/,
    "final String displayName = account.name.trim().isEmpty ? 'Usuario' : account.name.trim();\n    final String firstName = 'Administrador $displayName';"
  );

  fs.writeFileSync('mobile/minimarket_cliente/lib/admin_module.dart', content, 'utf-8');
}

updateMainDart();
updateAdminModule();
console.log('Names updated!');
