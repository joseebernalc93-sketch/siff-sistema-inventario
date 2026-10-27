import 'package:flutter/material.dart';
import 'main.dart';
import 'invoice_pdf_generator.dart';

class SharedInvoiceExpansionTile extends StatelessWidget {
  final Map<String, dynamic> invoice;
  final bool showAdminActions;
  final bool deleting;
  final VoidCallback? onDelete;

  const SharedInvoiceExpansionTile({
    super.key,
    required this.invoice,
    this.showAdminActions = false,
    this.deleting = false,
    this.onDelete,
  });

  String _formatDate(String isoString) {
    if (isoString.isEmpty) return '';
    try {
      final date = DateTime.parse(isoString).toLocal();
      final months = [
        'ene',
        'feb',
        'mar',
        'abr',
        'may',
        'jun',
        'jul',
        'ago',
        'sep',
        'oct',
        'nov',
        'dic',
      ];
      final ampm = date.hour >= 12 ? 'p. m.' : 'a. m.';
      final hour12 = date.hour > 12
          ? date.hour - 12
          : (date.hour == 0 ? 12 : date.hour);
      final minute = date.minute.toString().padLeft(2, '0');
      return '${date.day} ${months[date.month - 1]} ${date.year}, $hour12:$minute $ampm';
    } catch (_) {
      return isoString;
    }
  }

  double _invoiceItemIvaRate(Map<String, dynamic> item) {
    if (item['has_iva'] != true) {
      return 0;
    }
    final value = item['iva_rate'];
    if (value is num) {
      return value.toDouble();
    }
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  double _invoicePriceWithIva(double value, double ivaRate) {
    if (ivaRate <= 0) {
      return value;
    }
    return value * (1 + ivaRate / 100);
  }

  String _paymentLabel(dynamic value) {
    final raw = value?.toString().trim() ?? '';
    final normalized = raw.toLowerCase();

    if (normalized == 'efectivo') {
      return 'Efectivo';
    }
    if (normalized == 'transferencia') {
      return 'Transferencia';
    }
    return raw.isNotEmpty ? raw : 'No registrado';
  }

  Widget _buildInvoiceColumnSummary({
    required double subtotal,
    required double total,
    required Color accentColor,
  }) {
    final iva = total - subtotal > 0 ? total - subtotal : 0.0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('SUBTOTAL:', style: TextStyle(fontSize: 12)),
              Text(
                '\$${subtotal.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('IVA:', style: TextStyle(fontSize: 12)),
              Text(
                '\$${iva.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'TOTAL:',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: accentColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = invoice['items'] as List<dynamic>? ?? [];
    final status = (invoice['status'] as String? ?? '').toUpperCase();
    final isCancelled = invoice['status'] == 'cancelled';
    final subtotal = (invoice['subtotal'] as num?) ?? 0.0;
    final total = (invoice['total'] as num?) ?? 0.0;

    final String notes = invoice['notes']?.toString() ?? '';
    bool? clientConfirmed;
    bool isResolved = false;
    bool needsChange = false;
    String? changeAmount;

    final changeMatch = RegExp(
      r'Necesita cambio/vuelto: Si(?: \(Para (.*?)\))?',
    ).firstMatch(notes);
    if (changeMatch != null) {
      needsChange = true;
      if (changeMatch.group(1) != null) {
        changeAmount = changeMatch.group(1);
      }
    }

    if (notes.contains(
      RegExp(
        r'Cliente confirmo que recibio el pedido:\s*Si',
        caseSensitive: false,
      ),
    )) {
      clientConfirmed = true;
      if (notes.contains('Si (Resuelto)')) {
        isResolved = true;
      }
    } else if (notes.contains(
      RegExp(
        r'Cliente confirmo que recibio el pedido:\s*No',
        caseSensitive: false,
      ),
    )) {
      clientConfirmed = false;
    }

    String displayNotes = notes;
    displayNotes = displayNotes.replaceAll(RegExp(r'Cuenta: .*\n?'), '');
    displayNotes = displayNotes.replaceAll(RegExp(r'Cedula/RUC: .*\n?'), '');
    displayNotes = displayNotes.replaceAll(
      RegExp(r'CLIENTE_CEDULA: .*\n?'),
      '',
    );
    displayNotes = displayNotes.replaceAll(RegExp(r'METODO_PAGO: .*\n?'), '');
    displayNotes = displayNotes.replaceAll(RegExp(r'COMPROBANTE: .*\n?'), '');
    displayNotes = displayNotes.replaceAll(RegExp(r'RETIRO EN LOCAL\n?'), '');
    displayNotes = displayNotes.replaceAll(RegExp(r'TICKET: .*\n?'), '');

    displayNotes = displayNotes.replaceAll(
      RegExp(r'Cuenta bancaria seleccionada.*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Fecha enviado a delivery: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Fecha entregado: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Confirmacion de entrega: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'\[PAGO_APROBADO\].*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Correo: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Banco: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Titular: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Tipo: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(r'Cuenta: .*\n?', caseSensitive: false),
      '',
    );
    displayNotes = displayNotes.replaceAll(
      RegExp(
        r'^\s*Pago:\s*.*(?:\r?\n)?',
        caseSensitive: false,
        multiLine: true,
      ),
      '',
    );

    // Cleanup duplicate "Entrega a domicilio" if it's there
    displayNotes = displayNotes.replaceAll(
      RegExp(r'^Entrega a domicilio\s*'),
      '',
    );

    displayNotes = displayNotes.trim();

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 4,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          backgroundColor: Colors.white,
          collapsedBackgroundColor: Colors.white,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          iconColor: AppColors.accent,
          collapsedIconColor: Colors.grey[600],
          title: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF9D6DE)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.asset('assets/Logo2.png', fit: BoxFit.cover),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      invoice['invoice_number']?.toString() ??
                          invoice['order_code']?.toString() ??
                          '',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDate(invoice['created_at']?.toString() ?? ''),
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: isCancelled
                        ? Colors.red.withValues(alpha: 0.1)
                        : Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      color: isCancelled ? Colors.red[700] : Colors.green[700],
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
                Text(
                  '\$${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppColors.accent,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
          children: [
            const Divider(height: 1, color: Color(0xFFF9D6DE)),
            Container(
              color: const Color(0xFFFAFAFA),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  Container(
                    decoration: const BoxDecoration(
                      color: AppColors.accentDark,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(10),
                      ),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.asset(
                                    'assets/Logo2.png',
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'MINIMARKET VALLOLET',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                    const Text(
                                      'Comprobante de venta',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 10,
                                      ),
                                    ),
                                    if (needsChange) ...[
                                      const SizedBox(height: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.amber.shade400,
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(
                                              Icons.warning_amber_rounded,
                                              size: 12,
                                              color: Colors.black87,
                                            ),
                                            const SizedBox(width: 4),
                                            Flexible(
                                              child: Text(
                                                'Vuelto: Si${changeAmount != null ? ' (Para $changeAmount)' : ''}',
                                                style: const TextStyle(
                                                  color: Colors.black87,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 10,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                status,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            if (clientConfirmed != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: isResolved
                                      ? Colors.green.shade600
                                      : (clientConfirmed
                                            ? Colors.green.shade600
                                            : Colors.red.shade600),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      clientConfirmed
                                          ? Icons.check
                                          : Icons.close,
                                      color: Colors.white,
                                      size: 10,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      isResolved
                                          ? 'Problema Resuelto'
                                          : (clientConfirmed
                                                ? 'Cliente confirmó recepción'
                                                : 'Cliente indicó NO haber recibido'),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 9,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 6),
                            ],
                            Text(
                              invoice['invoice_number']?.toString() ??
                                  invoice['order_code']?.toString() ??
                                  '',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                              textAlign: TextAlign.right,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _formatDate(
                                invoice['created_at']?.toString() ?? '',
                              ),
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 10,
                              ),
                              textAlign: TextAlign.right,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Content
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(10),
                      ),
                      border: Border.all(color: const Color(0xFFF9D6DE)),
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              // Details boxes
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFF9FA),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: const Color(0xFFF9D6DE),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'CLIENTE',
                                          style: TextStyle(
                                            color: AppColors.accentDark,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 10,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          invoice['customer_name']
                                                  ?.toString() ??
                                              'Consumidor final',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Telefono: ${invoice['customer_phone']?.toString().isNotEmpty == true ? invoice['customer_phone'] : 'No registrado'}',
                                          style: const TextStyle(
                                            color: Colors.black87,
                                            fontSize: 11,
                                          ),
                                        ),
                                        Text(
                                          'Cedula/RUC: ${invoice['customer_identity']?.toString().isNotEmpty == true ? invoice['customer_identity'] : 'No registrada'}',
                                          style: const TextStyle(
                                            color: Colors.black87,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFF9FA),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: const Color(0xFFF9D6DE),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'ENTREGA Y PAGO',
                                          style: TextStyle(
                                            color: AppColors.accentDark,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 10,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Builder(
                                          builder: (context) {
                                            final invoiceNotes =
                                                invoice['notes']?.toString() ??
                                                '';
                                            final isPickup = invoiceNotes
                                                .toUpperCase()
                                                .contains('RETIRO EN LOCAL');
                                            final ticket = RegExp(
                                              r'TICKET:\s*([0-9]+)',
                                            ).firstMatch(invoiceNotes);
                                            final deliveryLabel = isPickup
                                                ? 'Retiro en el local${ticket != null ? ' - Ticket ${ticket.group(1)}' : ''}'
                                                : 'Entrega a domicilio';

                                            return Text(
                                              deliveryLabel,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            );
                                          },
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          displayNotes,
                                          style: const TextStyle(
                                            color: Colors.black87,
                                            fontSize: 11,
                                          ),
                                        ),
                                        Text(
                                          'Pago: ${_paymentLabel(invoice['payment_method'])}',
                                          style: const TextStyle(
                                            color: Colors.black87,
                                            fontSize: 11,
                                          ),
                                        ),
                                        if (showAdminActions)
                                          Builder(
                                            builder: (context) {
                                              final bankMatch =
                                                  RegExp(
                                                    r'Banco:\s*([^\n]+)',
                                                  ).firstMatch(
                                                    invoice['notes']
                                                            ?.toString() ??
                                                        '',
                                                  );
                                              if (bankMatch != null &&
                                                  bankMatch.group(1) != null) {
                                                return Padding(
                                                  padding:
                                                      const EdgeInsets.only(
                                                        top: 6,
                                                      ),
                                                  child: Container(
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 6,
                                                          vertical: 2,
                                                        ),
                                                    decoration: BoxDecoration(
                                                      color:
                                                          Colors.blue.shade50,
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            4,
                                                          ),
                                                      border: Border.all(
                                                        color: Colors
                                                            .blue
                                                            .shade200,
                                                      ),
                                                    ),
                                                    child: Text(
                                                      '🏦 Banco: ${bankMatch.group(1)!.trim()}',
                                                      style: TextStyle(
                                                        color: Colors
                                                            .blue
                                                            .shade900,
                                                        fontSize: 10,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                );
                                              }
                                              return const SizedBox.shrink();
                                            },
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF9FA),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFFF9D6DE),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.receipt_long,
                                          size: 14,
                                          color: AppColors.accentDark,
                                        ),
                                        const SizedBox(width: 4),
                                        const Text(
                                          'OPERACION DEL PEDIDO',
                                          style: TextStyle(
                                            color: AppColors.accentDark,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 10,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 4),
                                      child: RichText(
                                        text: TextSpan(
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.black87,
                                          ),
                                          children: [
                                            const TextSpan(
                                              text: 'Empleado que despacho: ',
                                              style: TextStyle(
                                                color: Color(0xFF7C626B),
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                            TextSpan(
                                              text:
                                                  invoice['employee_user_name']
                                                          ?.toString()
                                                          .isNotEmpty ==
                                                      true
                                                  ? invoice['employee_user_name']
                                                  : 'Administrador',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                    if (!(invoice['notes']
                                            ?.toString()
                                            .toUpperCase()
                                            .contains('RETIRO EN LOCAL') ??
                                        false)) ...[
                                      Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 4,
                                        ),
                                        child: RichText(
                                          text: TextSpan(
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Colors.black87,
                                            ),
                                            children: [
                                              const TextSpan(
                                                text: 'Delivery asignado: ',
                                                style: TextStyle(
                                                  color: Color(0xFF7C626B),
                                                  fontWeight: FontWeight.w900,
                                                ),
                                              ),
                                              TextSpan(
                                                text:
                                                    invoice['delivery_user_name']
                                                            ?.toString()
                                                            .isNotEmpty ==
                                                        true
                                                    ? invoice['delivery_user_name']
                                                    : 'No asignado',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w900,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 4,
                                        ),
                                        child: RichText(
                                          text: TextSpan(
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Colors.black87,
                                            ),
                                            children: [
                                              const TextSpan(
                                                text: 'Enviado: ',
                                                style: TextStyle(
                                                  color: Color(0xFF7C626B),
                                                  fontWeight: FontWeight.w900,
                                                ),
                                              ),
                                              TextSpan(
                                                text:
                                                    invoice['dispatched_at'] !=
                                                        null
                                                    ? _formatDate(
                                                        invoice['dispatched_at'],
                                                      )
                                                    : 'No registrado',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w900,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 4),
                                      child: RichText(
                                        text: TextSpan(
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Colors.black87,
                                          ),
                                          children: [
                                            const TextSpan(
                                              text: 'Entregado: ',
                                              style: TextStyle(
                                                color: Color(0xFF7C626B),
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                            TextSpan(
                                              text:
                                                  invoice['delivered_at'] !=
                                                      null
                                                  ? _formatDate(
                                                      invoice['delivered_at'],
                                                    )
                                                  : 'No registrado',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),

                              // Table Header
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.accentDark,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Row(
                                  children: [
                                    Expanded(
                                      flex: 5,
                                      child: Text(
                                        'PRODUCTO',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 10,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 2,
                                      child: Text(
                                        'CANT',
                                        textAlign: TextAlign.right,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 10,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 2,
                                      child: Text(
                                        'P. SIN IVA',
                                        textAlign: TextAlign.right,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 9,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 2,
                                      child: Text(
                                        'IVA',
                                        textAlign: TextAlign.right,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 9,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      flex: 2,
                                      child: Text(
                                        'TOTAL',
                                        textAlign: TextAlign.right,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 10,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Items
                              ...items.map((item) {
                                final map = item as Map<String, dynamic>;
                                final qty = (map['quantity'] as num?) ?? 1;
                                final price =
                                    (map['unit_price'] as num?) ?? 0.0;
                                final lineTotal =
                                    (map['line_total'] as num?) ??
                                    (qty * price);
                                final ivaRate = _invoiceItemIvaRate(map);
                                final lineTotalWithIva = _invoicePriceWithIva(
                                  lineTotal.toDouble(),
                                  ivaRate,
                                );
                                final name =
                                    map['product_name']?.toString() ??
                                    'Producto';
                                return Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 12,
                                  ),
                                  decoration: const BoxDecoration(
                                    border: Border(
                                      bottom: BorderSide(
                                        color: Color(0xFFF9D6DE),
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        flex: 5,
                                        child: Text(
                                          name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        flex: 2,
                                        child: Text(
                                          qty.toString(),
                                          textAlign: TextAlign.right,
                                          style: const TextStyle(fontSize: 11),
                                        ),
                                      ),
                                      Expanded(
                                        flex: 2,
                                        child: Text(
                                          '\$${lineTotal.toStringAsFixed(2)}',
                                          textAlign: TextAlign.right,
                                          style: const TextStyle(fontSize: 11),
                                        ),
                                      ),
                                      Expanded(
                                        flex: 2,
                                        child: Text(
                                          '\$${(lineTotal * ivaRate / 100).toStringAsFixed(2)}',
                                          textAlign: TextAlign.right,
                                          style: const TextStyle(fontSize: 11),
                                        ),
                                      ),
                                      Expanded(
                                        flex: 2,
                                        child: Text(
                                          '\$${lineTotalWithIva.toStringAsFixed(2)}',
                                          textAlign: TextAlign.right,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }),

                              const SizedBox(height: 16),

                              _buildInvoiceColumnSummary(
                                subtotal: subtotal.toDouble(),
                                total: total.toDouble(),
                                accentColor: AppColors.accent,
                              ),
                              const SizedBox(height: 16),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Transfer Receipt
                  if (showAdminActions &&
                      invoice['transfer_receipt_url'] != null &&
                      invoice['transfer_receipt_url'].toString().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Builder(
                            builder: (context) {
                              final notesStr =
                                  invoice['notes']?.toString() ?? '';
                              final bankMatch = RegExp(
                                r'Banco:\s*([^\n]+)',
                              ).firstMatch(notesStr);
                              final bankName =
                                  bankMatch != null &&
                                      bankMatch.group(1) != null
                                  ? bankMatch.group(1)!.trim()
                                  : 'No registrado';

                              return Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.account_balance,
                                      color: Colors.blue.shade700,
                                      size: 28,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Pago: Transferencia',
                                            style: TextStyle(
                                              color: Colors.blue.shade700,
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: Colors.blue.shade50,
                                              border: Border.all(
                                                color: Colors.blue.shade200,
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              '🏦 Banco: $bankName',
                                              style: TextStyle(
                                                color: Colors.blue.shade900,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                          const Text(
                            'COMPROBANTE DE PAGO',
                            style: TextStyle(
                              color: AppColors.accentDark,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              color: Colors.grey[100],
                              child: Image.network(
                                invoice['transfer_receipt_url'],
                                fit: BoxFit.contain,
                                height: 350,
                                errorBuilder: (context, error, stackTrace) =>
                                    const Padding(
                                      padding: EdgeInsets.all(16.0),
                                      child: Text(
                                        'Error al cargar comprobante',
                                        style: TextStyle(color: Colors.red),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                  if (showAdminActions) ...[
                    ElevatedButton.icon(
                      onPressed: () => downloadInvoicePdf(invoice),
                      icon: const Icon(
                        Icons.download,
                        color: Colors.white,
                        size: 20,
                      ),
                      label: const Text(
                        'Descargar PDF de esta factura',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                    if (onDelete != null) ...[
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: deleting ? null : onDelete,
                        icon: deleting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.delete_outline_rounded),
                        label: Text(
                          deleting ? 'Eliminando...' : 'Eliminar del historial',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: BorderSide(color: Colors.red.shade200),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
