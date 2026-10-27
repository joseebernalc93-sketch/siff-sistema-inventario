const fs = require('fs');
const filePath = 'mobile/minimarket_cliente/lib/main.dart';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /final name = map\['product_name'\]\?\.toString\(\) \?\? 'Producto';/g,
  `final hasIva = map['has_iva'] == true;
                                      final ivaRate = map['iva_rate']?.toString() ?? '';
                                      final ivaSuffix = hasIva && ivaRate.isNotEmpty ? ' ($ivaRate% IVA)' : '';
                                      final name = (map['product_name']?.toString() ?? 'Producto') + ivaSuffix;`
);

content = content.replace(
  /const Text\('Descuento', style: TextStyle\(fontWeight: FontWeight.bold, fontSize: 11\)\),/g,
  `const Text('IVA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),`
);

content = content.replace(
  /Text\('\\$\\{discount\.toStringAsFixed\(2\)\}', style: const TextStyle\(fontSize: 11\)\),/g,
  "Text('\\$${(total - subtotal).toStringAsFixed(2)}', style: const TextStyle(fontSize: 11)),"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modified main.dart successfully.');
