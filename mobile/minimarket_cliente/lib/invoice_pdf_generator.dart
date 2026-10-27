import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';

Future<void> downloadInvoicePdf(Map<String, dynamic> invoice) async {
  final pdf = pw.Document();

  final formatMoney = (num value) => '\$${value.toStringAsFixed(2)}';
  double itemIvaRate(Map<String, dynamic> item) {
    if (item['has_iva'] != true) {
      return 0;
    }

    final value = item['iva_rate'];
    if (value is num) {
      return value.toDouble();
    }

    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  double priceWithIva(num value, double ivaRate) {
    if (ivaRate <= 0) {
      return value.toDouble();
    }

    return double.parse((value + value * ivaRate / 100).toStringAsFixed(2));
  }

  String formatIvaRate(double value) {
    if (value % 1 == 0) {
      return value.toStringAsFixed(0);
    }

    return value.toStringAsFixed(2);
  }

  final invoiceNumber = invoice['invoice_number']?.toString() ?? 'Sin numero';
  final createdAtStr = invoice['created_at']?.toString() ?? '';
  DateTime? createdAt;
  try {
    createdAt = DateTime.parse(createdAtStr).toLocal();
  } catch (_) {}

  final dateFormatted = createdAt != null
      ? DateFormat('dd MMM yyyy, h:mm a').format(createdAt)
      : createdAtStr;

  final customerName =
      invoice['customer_name']?.toString() ?? 'Consumidor final';
  final customerPhone = invoice['customer_phone']?.toString().isNotEmpty == true
      ? invoice['customer_phone'].toString()
      : 'No registrado';
  final customerIdentity =
      invoice['customer_identity']?.toString().isNotEmpty == true
      ? invoice['customer_identity'].toString()
      : 'No registrada';
  String notes = invoice['notes']?.toString() ?? 'Direccion por confirmar';
  notes = notes.replaceAll(RegExp(r'Cuenta: .*\n?'), '');
  notes = notes.replaceAll(RegExp(r'Cedula/RUC: .*\n?'), '');
  notes = notes.replaceAll(RegExp(r'CLIENTE_CEDULA: .*\n?'), '');
  notes = notes.replaceAll(RegExp(r'METODO_PAGO: .*\n?'), '');
  notes = notes.replaceAll(RegExp(r'COMPROBANTE: .*\n?'), '');
  notes = notes.replaceAll(RegExp(r'RETIRO EN LOCAL\n?'), '');
  notes = notes.replaceAll(RegExp(r'TICKET: .*\n?'), '');
  notes = notes.replaceAll(RegExp(r'Cuenta bancaria seleccionada.*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Fecha enviado a delivery: .*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Fecha entregado: .*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Confirmacion de entrega: .*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'\[PAGO_APROBADO\].*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Correo: .*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Banco: .*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Titular: .*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Tipo: .*\n?', caseSensitive: false), '');
  notes = notes.replaceAll(RegExp(r'Cuenta: .*\n?', caseSensitive: false), '');
  notes = notes.trim();

  final status = (invoice['status']?.toString() ?? '').toUpperCase();
  final subtotal = (invoice['subtotal'] as num?) ?? 0.0;
  final discount = (invoice['discount'] as num?) ?? 0.0;
  final total = (invoice['total'] as num?) ?? 0.0;

  final items = invoice['items'] as List<dynamic>? ?? [];

  final accent = PdfColor.fromInt(0xFFE10C4D); // [225, 12, 77]
  final accentDark = PdfColor.fromInt(0xFF8B1037); // [139, 16, 55]
  final ink = PdfColor.fromInt(0xFF2A1C22); // [42, 28, 34]
  final muted = PdfColor.fromInt(0xFF6D5B62); // [109, 91, 98]
  final soft = PdfColor.fromInt(0xFFFFF2F6); // [255, 242, 246]

  pw.Widget buildSummaryLine({required String label, required String value}) {
    return pw.Row(
      children: [
        pw.Expanded(flex: 5, child: pw.SizedBox()),
        pw.Expanded(flex: 2, child: pw.SizedBox()),
        pw.Expanded(
          flex: 2,
          child: pw.Text(
            label,
            textAlign: pw.TextAlign.right,
            style: pw.TextStyle(
              color: ink,
              fontSize: 11,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
        ),
        pw.Expanded(
          flex: 2,
          child: pw.Text(
            value,
            textAlign: pw.TextAlign.right,
            style: pw.TextStyle(
              color: ink,
              fontSize: 11,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
        ),
        pw.Expanded(flex: 2, child: pw.SizedBox()),
      ],
    );
  }

  pw.Widget buildColumnSummary() {
    final ivaAmount = total > subtotal ? total - subtotal : 0.0;

    return pw.Column(
      children: [
        pw.Row(
          children: [
            pw.Expanded(flex: 7, child: pw.SizedBox()),
            pw.Expanded(
              flex: 2,
              child: pw.Text(
                "Subtotal",
                textAlign: pw.TextAlign.right,
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.Expanded(
              flex: 2,
              child: pw.Text(
                "IVA (15%)",
                textAlign: pw.TextAlign.right,
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.Expanded(
              flex: 2,
              child: pw.Text(
                "Total",
                textAlign: pw.TextAlign.right,
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 4),
        pw.Row(
          children: [
            pw.Expanded(flex: 7, child: pw.SizedBox()),
            pw.Expanded(
              flex: 2,
              child: pw.Text(
                formatMoney(subtotal),
                textAlign: pw.TextAlign.right,
                style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.Expanded(
              flex: 2,
              child: pw.Text(
                formatMoney(ivaAmount),
                textAlign: pw.TextAlign.right,
                style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.Expanded(
              flex: 2,
              child: pw.Text(
                formatMoney(total),
                textAlign: pw.TextAlign.right,
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: accentDark,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  pdf.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(39.6), // 14mm is approx 39.6 points
      header: (context) {
        if (context.pageNumber > 1) {
          return pw.Container(
            padding: const pw.EdgeInsets.only(bottom: 20),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  "MINIMARKET VALLOLET",
                  style: pw.TextStyle(
                    fontSize: 12,
                    fontWeight: pw.FontWeight.bold,
                    color: ink,
                  ),
                ),
                pw.Text(
                  "$invoiceNumber - continuacion",
                  style: pw.TextStyle(fontSize: 8, color: muted),
                ),
              ],
            ),
          );
        }
        return pw.Container(
          width: double.infinity,
          height: 119, // ~42mm
          decoration: pw.BoxDecoration(
            color: accent,
            borderRadius: pw.BorderRadius.circular(8), // Add slight rounding
          ),
          padding: const pw.EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          margin: const pw.EdgeInsets.only(bottom: 20),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Row(
                children: [
                  pw.Container(
                    width: 53.8, // 19mm
                    height: 53.8,
                    decoration: pw.BoxDecoration(
                      color: PdfColors.white,
                      borderRadius: pw.BorderRadius.circular(11.3), // 4mm
                    ),
                    child: pw.Center(
                      child: pw.Text(
                        "MV",
                        style: pw.TextStyle(
                          color: accent,
                          fontSize: 18,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 20),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    mainAxisAlignment: pw.MainAxisAlignment.center,
                    children: [
                      pw.Text(
                        "MINIMARKET VALLOLET",
                        style: pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 24,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 5),
                      pw.Text(
                        "COMPROBANTE DE VENTA",
                        style: const pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                mainAxisAlignment: pw.MainAxisAlignment.center,
                children: [
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: pw.BoxDecoration(
                      color: accentDark,
                      borderRadius: pw.BorderRadius.circular(4),
                    ),
                    child: pw.Text(
                      status,
                      style: pw.TextStyle(
                        color: PdfColors.white,
                        fontSize: 10,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                  pw.SizedBox(height: 10),
                  pw.Text(
                    invoiceNumber,
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 14,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 4),
                  pw.Text(
                    dateFormatted,
                    style: const pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
      footer: (context) {
        return pw.Container(
          margin: const pw.EdgeInsets.only(top: 20),
          decoration: pw.BoxDecoration(
            border: pw.Border(
              top: pw.BorderSide(color: PdfColor.fromInt(0xFFEED6DD)),
            ),
          ),
          padding: const pw.EdgeInsets.only(top: 10),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                "Documento informativo, no factura tributaria.",
                style: pw.TextStyle(color: muted, fontSize: 9),
              ),
              pw.Text(
                "Pagina ${context.pageNumber} de ${context.pagesCount}",
                style: pw.TextStyle(color: muted, fontSize: 9),
              ),
            ],
          ),
        );
      },
      build: (context) {
        return [
          // Client and Delivery info
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                flex: 4,
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(15),
                  decoration: pw.BoxDecoration(
                    color: const PdfColor.fromInt(0xFFFFFCFA),
                    border: pw.Border.all(
                      color: const PdfColor.fromInt(0xFFEBD5DC),
                    ),
                    borderRadius: pw.BorderRadius.circular(8.5),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        "CLIENTE",
                        style: pw.TextStyle(
                          color: accentDark,
                          fontSize: 11,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(
                        customerName,
                        style: pw.TextStyle(
                          color: ink,
                          fontSize: 14,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        "Telefono: $customerPhone",
                        style: pw.TextStyle(color: ink, fontSize: 11),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        "Cedula/RUC: $customerIdentity",
                        style: pw.TextStyle(color: ink, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(width: 15),
              pw.Expanded(
                flex: 5,
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(15),
                  decoration: pw.BoxDecoration(
                    color: const PdfColor.fromInt(0xFFFFFCFA),
                    border: pw.Border.all(
                      color: const PdfColor.fromInt(0xFFEBD5DC),
                    ),
                    borderRadius: pw.BorderRadius.circular(8.5),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        "ENTREGA Y PAGO",
                        style: pw.TextStyle(
                          color: accentDark,
                          fontSize: 11,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(
                        "Entrega a domicilio",
                        style: pw.TextStyle(
                          color: ink,
                          fontSize: 14,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        notes,
                        style: pw.TextStyle(color: ink, fontSize: 11),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        "Pago: Efectivo",
                        style: pw.TextStyle(color: ink, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 20),

          // Table Header
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: pw.BoxDecoration(
              color: accentDark,
              borderRadius: pw.BorderRadius.circular(5.6),
            ),
            child: pw.Row(
              children: [
                pw.Expanded(
                  flex: 5,
                  child: pw.Text(
                    "PRODUCTO",
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 11,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.Expanded(
                  flex: 2,
                  child: pw.Text(
                    "CANTIDAD",
                    textAlign: pw.TextAlign.right,
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 11,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.Expanded(
                  flex: 2,
                  child: pw.Text(
                    "P. SIN IVA",
                    textAlign: pw.TextAlign.right,
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 9,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.Expanded(
                  flex: 2,
                  child: pw.Text(
                    "IVA",
                    textAlign: pw.TextAlign.right,
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 9,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.Expanded(
                  flex: 2,
                  child: pw.Text(
                    "TOTAL",
                    textAlign: pw.TextAlign.right,
                    style: pw.TextStyle(
                      color: PdfColors.white,
                      fontSize: 11,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Table Items
          ...items.map((item) {
            final map = item as Map<String, dynamic>;
            final qty = (map['quantity'] as num?) ?? 1;
            final price = (map['unit_price'] as num?) ?? 0.0;
            final lineTotal = (map['line_total'] as num?) ?? (qty * price);
            final ivaRate = itemIvaRate(map);
            final unitWithIva = priceWithIva(price, ivaRate);
            final lineTotalWithIva = priceWithIva(lineTotal, ivaRate);
            final name = map['product_name']?.toString() ?? 'Producto';

            return pw.Container(
              padding: const pw.EdgeInsets.symmetric(
                horizontal: 10,
                vertical: 12,
              ),
              decoration: const pw.BoxDecoration(
                border: pw.Border(
                  bottom: pw.BorderSide(color: PdfColor.fromInt(0xFFF4E0E5)),
                ),
              ),
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Expanded(
                    flex: 5,
                    child: pw.Text(
                      name,
                      style: pw.TextStyle(
                        color: ink,
                        fontSize: 12,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      qty.toString(),
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(color: ink, fontSize: 11),
                    ),
                  ),
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      formatMoney(lineTotal),
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(color: ink, fontSize: 11),
                    ),
                  ),
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      formatMoney(lineTotal * ivaRate / 100),
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(color: ink, fontSize: 10),
                    ),
                  ),
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      formatMoney(lineTotalWithIva),
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(
                        color: ink,
                        fontSize: 11,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),

          pw.SizedBox(height: 15),

          // Totals
          buildColumnSummary(),
        ];
      },
    ),
  );

  final Uint8List bytes = await pdf.save();
  final fileName = invoiceNumber.replaceAll(RegExp(r'[^a-zA-Z0-9\-_]'), '-');
  await Printing.sharePdf(bytes: bytes, filename: '$fileName-comprobante.pdf');
}
