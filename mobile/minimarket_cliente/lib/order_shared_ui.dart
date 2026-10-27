import 'package:flutter/material.dart';
import 'main.dart';
import 'delivery_map_screen.dart';
import 'invoice_expansion_tile.dart';

class SharedOrdersList extends StatelessWidget {
  const SharedOrdersList({
    super.key,
    required this.orders,
    required this.isActive,
    required this.role,
    required this.onUpdateStatus,
  });

  final List<dynamic> orders;
  final bool isActive;
  final String role;
  final void Function(
    String orderId,
    String status, {
    String? deliveryUserId,
    bool? approvePayment,
  })
  onUpdateStatus;

  Future<void> _showDeliverySelection(
    BuildContext context,
    String orderId,
  ) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final response = await getMobileApi('/api/admin/delivery-users');
      final deliveries = response['deliveries'] as List<dynamic>? ?? [];

      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        showModalBottomSheet(
          context: context,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          builder: (ctx) {
            return SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Text(
                      'Asignar Delivery',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (deliveries.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Text('No hay repartidores disponibles.'),
                    )
                  else
                    Flexible(
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: deliveries.length,
                        itemBuilder: (ctx, i) {
                          final delivery = deliveries[i];
                          return ListTile(
                            leading: const CircleAvatar(
                              child: Icon(Icons.directions_bike),
                            ),
                            title: Text(delivery['name'] ?? 'Desconocido'),
                            subtitle: Text(delivery['phone'] ?? 'Sin teléfono'),
                            onTap: () {
                              Navigator.pop(ctx);
                              onUpdateStatus(
                                orderId,
                                'confirmed',
                                deliveryUserId: delivery['id'],
                              );
                            },
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 16),
                ],
              ),
            );
          },
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return Center(
        child: Text(isActive ? 'No hay pedidos activos' : 'No hay historial'),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: orders.length,
      itemBuilder: (ctx, i) {
        final o = orders[i];
        final String orderCode =
            o['order_code'] ?? o['invoice_number'] ?? 'S/N';
        final String customerName = o['customer_name'] ?? 'Cliente General';
        final String customerIdentity =
            o['customer_identity'] ?? o['identity_number'] ?? 'N/A';
        final String customerPhone = o['customer_phone'] ?? 'Sin teléfono';
        final double subtotal = (o['subtotal'] ?? 0).toDouble();
        final double total = (o['total'] ?? 0).toDouble();
        final double ivaAmount = total - subtotal > 0 ? total - subtotal : 0.0;
        final String status = o['status'] ?? 'pending';
        final String createdAt = o['created_at'] ?? '';
        final List<dynamic> items = o['items'] ?? [];
        final String paymentMethod =
            o['payment_method']?.toString().toLowerCase() ?? '';
        final bool isTransfer =
            paymentMethod == 'transferencia' ||
            (o['notes']?.toString().toLowerCase().contains('transferencia') ??
                false);
        final bool isPaymentApproved =
            o['notes']?.toString().contains('[PAGO_APROBADO]') ?? false;
        final bool isTransferPendingApproval = isTransfer && !isPaymentApproved;
        final String paymentLabel = isTransfer ? 'Transferencia' : 'Efectivo';
        final String deliveryAddress = _deliveryAddressFromNotes(o['notes']);
        final String notesStr = o['notes']?.toString() ?? '';
        bool needsChange = false;
        String? changeAmount;
        final changeMatch = RegExp(
          r'Necesita cambio/vuelto: Si(?: \(Para (.*?)\))?',
        ).firstMatch(notesStr);
        if (changeMatch != null) {
          needsChange = true;
          if (changeMatch.group(1) != null) {
            changeAmount = changeMatch.group(1);
          }
        }
        final bool isRetiroLocal = notesStr.toUpperCase().contains(
          'RETIRO EN LOCAL',
        );
        String? ticketNumber;
        if (isRetiroLocal) {
          final ticketMatch = RegExp(
            r'TICKET:\s*([^\n]+)',
          ).firstMatch(notesStr);
          if (ticketMatch != null) {
            ticketNumber = ticketMatch.group(1)?.trim();
          }
        }

        String dateStr = createdAt;
        if (dateStr.length > 10) {
          try {
            final d = DateTime.parse(createdAt).toLocal();
            dateStr =
                '${d.day}/${d.month}/${d.year} ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
          } catch (_) {}
        }

        if (!isActive) {
          return SharedInvoiceExpansionTile(
            invoice: Map<String, dynamic>.from(o),
            showAdminActions: false,
          );
        }

        const Color redTheme = Color(0xFFA60B3F);

        return Card(
          color: Colors.white,
          elevation: 4,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: Colors.grey[300]!, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Red Header
              Container(
                color: redTheme,
                padding: const EdgeInsets.all(12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Left Logo and Title
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
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'MINIMARKET VALLOLET',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                Text(
                                  isActive
                                      ? 'Pedido activo'
                                      : 'Comprobante de venta',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Right Status and Code
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _buildStatusPill(status),
                        const SizedBox(height: 4),
                        Text(
                          orderCode,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        if (isRetiroLocal)
                          Container(
                            margin: const EdgeInsets.only(top: 4, bottom: 2),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white24,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              ticketNumber != null
                                  ? 'TICKET: $ticketNumber'
                                  : 'RETIRO EN LOCAL',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        Text(
                          dateStr,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Customer Info row
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CLIENTE',
                              style: TextStyle(
                                color: redTheme,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              customerName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              'Teléfono: $customerPhone',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.black87,
                              ),
                            ),
                            Text(
                              'Cédula: $customerIdentity',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.black87,
                              ),
                            ),
                            if ((role == 'delivery' || role == 'admin') &&
                                deliveryAddress.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4.0),
                                child: Text(
                                  deliveryAddress,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.indigo,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              if (role == 'empleado' || role == 'delivery' || role == 'admin')
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: role == 'delivery'
                          ? (isTransfer
                                ? const Color(0xFFEFF6FF)
                                : const Color(0xFFFFF7ED))
                          : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: role == 'delivery'
                            ? (isTransfer
                                  ? Colors.blue.shade200
                                  : Colors.orange.shade200)
                            : Colors.grey.shade300,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isTransfer
                              ? Icons.account_balance_rounded
                              : Icons.payments_rounded,
                          color: isTransfer
                              ? Colors.blue.shade700
                              : Colors.orange.shade800,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Pago: $paymentLabel',
                                style: TextStyle(
                                  color: isTransfer
                                      ? Colors.blue.shade800
                                      : Colors.orange.shade900,
                                  fontSize: role == 'delivery' ? 14 : 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              if (role == 'delivery')
                                Text(
                                  isTransfer
                                      ? 'No cobrar efectivo al cliente.'
                                      : 'Cobrar: \$${total.toStringAsFixed(2)}${needsChange ? (changeAmount != null ? ' (Cambio para $changeAmount)' : ' (Llevar cambio)') : ''}',
                                  style: const TextStyle(
                                    color: Colors.black87,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              if ((role == 'admin' || role == 'delivery') &&
                                  !isTransfer &&
                                  needsChange)
                                Padding(
                                  padding: const EdgeInsets.only(top: 6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.amber.shade400,
                                      borderRadius: BorderRadius.circular(5),
                                    ),
                                    child: Text(
                                      '⚠️ Vuelto: Si${changeAmount != null ? ' (Para $changeAmount)' : ''}',
                                      style: const TextStyle(
                                        color: Colors.black,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ),
                              if (role == 'admin' && isTransfer)
                                Builder(
                                  builder: (context) {
                                    final bankMatch = RegExp(
                                      r'Banco:\s*([^\n]+)',
                                    ).firstMatch(notesStr);
                                    if (bankMatch != null &&
                                        bankMatch.group(1) != null) {
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 6),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 6,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.blue.shade50,
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                            border: Border.all(
                                              color: Colors.blue.shade200,
                                            ),
                                          ),
                                          child: Text(
                                            '🏦 Banco: ${bankMatch.group(1)!.trim()}',
                                            style: TextStyle(
                                              color: Colors.blue.shade900,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
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
                  ),
                ),

              // Table Header
              Container(
                color: redTheme,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: const Text(
                        'PRODUCTO',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 1,
                      child: const Text(
                        'CANTIDAD',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: const Text(
                        'P. UNITARIO SIN IVA',
                        textAlign: TextAlign.right,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: const Text(
                        'IVA',
                        textAlign: TextAlign.right,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: const Text(
                        'TOTAL',
                        textAlign: TextAlign.right,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Products
              ...items.map((item) {
                final qty = (item['quantity'] ?? 1);
                final price = (item['unit_price'] ?? 0).toDouble();
                final lineTotal = (item['line_total'] ?? (price * qty))
                    .toDouble();
                final ivaRate = _itemIvaRate(item);
                final unitWithIva = _priceWithIva(price, ivaRate);
                final lineTotalWithIva = _priceWithIva(lineTotal, ivaRate);
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: Colors.grey[200]!),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Text(
                          '${item['product_name']}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 1,
                        child: Text(
                          '$qty',
                          textAlign: TextAlign.center,
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
                          '\$${_calculateIvaAmount(lineTotal, ivaRate).toStringAsFixed(2)}',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          '\$${lineTotalWithIva.toStringAsFixed(2)}',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                );
              }),

              // Footer Totals
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Documento informativo.',
                      style: TextStyle(fontSize: 9, color: Colors.grey),
                    ),
                    const SizedBox(height: 10),
                    _buildSharedInvoiceColumnSummary(
                      subtotal: subtotal,
                      ivaAmount: ivaAmount,
                      total: total,
                      accentColor: redTheme,
                    ),
                  ],
                ),
              ),
              // Transfer Receipt
              if (role == 'admin' &&
                  o['transfer_receipt_url'] != null &&
                  o['transfer_receipt_url'].toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'COMPROBANTE DE PAGO',
                        style: TextStyle(
                          color: redTheme,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          color: Colors.grey[100],
                          child: Image.network(
                            o['transfer_receipt_url'],
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

              // Action Buttons for active orders
              if (isActive)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    border: Border(top: BorderSide(color: Colors.grey[200]!)),
                  ),
                  child: Row(
                    children: [
                      // Admin Buttons
                      if (role == 'admin') ...[
                        if (isRetiroLocal) ...[
                          if (status == 'pending')
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue[600],
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                ),
                                onPressed: () => isTransferPendingApproval
                                    ? onUpdateStatus(
                                        o['id'],
                                        'pending',
                                        approvePayment: true,
                                      )
                                    : onUpdateStatus(o['id'], 'preparing'),
                                child: Text(
                                  isTransferPendingApproval
                                      ? 'Aprobar Pago'
                                      : (isTransfer
                                            ? 'Preparar'
                                            : 'Aceptar Pago'),
                                ),
                              ),
                            ),
                          if (status == 'preparing')
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.orange[600],
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                ),
                                onPressed: () =>
                                    onUpdateStatus(o['id'], 'confirmed'),
                                child: const Text('Listo para retiro'),
                              ),
                            ),
                          if (status == 'confirmed')
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green[600],
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                ),
                                onPressed: () =>
                                    onUpdateStatus(o['id'], 'delivered'),
                                child: const Text('Entregado'),
                              ),
                            ),
                          if (status != 'delivered' && status != 'cancelled')
                            const SizedBox(width: 8),
                          if (status != 'delivered' && status != 'cancelled')
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.grey[700],
                                ),
                                onPressed: () =>
                                    onUpdateStatus(o['id'], 'cancelled'),
                                child: const Text('Cancelar'),
                              ),
                            ),
                        ] else ...[
                          if (status == 'pending')
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue[600],
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                ),
                                onPressed: () => isTransferPendingApproval
                                    ? onUpdateStatus(
                                        o['id'],
                                        'pending',
                                        approvePayment: true,
                                      )
                                    : onUpdateStatus(o['id'], 'preparing'),
                                child: Text(
                                  isTransferPendingApproval
                                      ? 'Aprobar Pago'
                                      : (isTransfer
                                            ? 'Preparar'
                                            : 'Aceptar Pedido'),
                                ),
                              ),
                            ),
                          if (status == 'preparing')
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.orange[600],
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                ),
                                onPressed: () =>
                                    _showDeliverySelection(context, o['id']),
                                child: const Text('Despachar'),
                              ),
                            ),
                          if (status == 'confirmed')
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.grey[700],
                                ),
                                onPressed: null,
                                child: const Text('En camino a entrega'),
                              ),
                            ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.grey[700],
                              ),
                              onPressed: () =>
                                  onUpdateStatus(o['id'], 'cancelled'),
                              child: const Text('Cancelar'),
                            ),
                          ),
                        ],
                      ],

                      // Empleado Buttons
                      if (role == 'empleado') ...[
                        if (status == 'pending')
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue[600],
                                foregroundColor: Colors.white,
                                elevation: 0,
                              ),
                              onPressed: () =>
                                  onUpdateStatus(o['id'], 'preparing'),
                              child: const Text('Preparar'),
                            ),
                          ),
                        if (status == 'preparing')
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.orange[600],
                                foregroundColor: Colors.white,
                                elevation: 0,
                              ),
                              onPressed: () => isRetiroLocal
                                  ? onUpdateStatus(o['id'], 'confirmed')
                                  : _showDeliverySelection(context, o['id']),
                              child: Text(
                                isRetiroLocal
                                    ? 'Listo para retiro'
                                    : 'Despachar',
                              ),
                            ),
                          ),
                        if (status == 'confirmed' && isRetiroLocal)
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green[600],
                                foregroundColor: Colors.white,
                                elevation: 0,
                              ),
                              onPressed: () =>
                                  onUpdateStatus(o['id'], 'delivered'),
                              child: const Text('Entregado'),
                            ),
                          ),
                      ],

                      // Delivery Buttons
                      if (role == 'delivery') ...[
                        if (o['delivery_lat'] != null &&
                            o['delivery_lng'] != null)
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.blue[700],
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                              ),
                              icon: const Icon(Icons.map, size: 16),
                              label: const Text(
                                'Mapa',
                                style: TextStyle(fontSize: 12),
                              ),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => DeliveryMapScreen(
                                      destinationLat: (o['delivery_lat'] as num)
                                          .toDouble(),
                                      destinationLng: (o['delivery_lng'] as num)
                                          .toDouble(),
                                      customerName: customerName,
                                      customerPhone: customerPhone,
                                      customerAddress: deliveryAddress,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        if (o['delivery_lat'] != null &&
                            o['delivery_lng'] != null)
                          const SizedBox(width: 8),
                        if (status == 'confirmed')
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red[600],
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                              ),
                              onPressed: () =>
                                  onUpdateStatus(o['id'], 'preparing'),
                              child: const Text(
                                'Fallido',
                                style: TextStyle(fontSize: 12),
                              ),
                            ),
                          ),
                        if (status == 'confirmed') const SizedBox(width: 8),
                        if (status == 'confirmed')
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green[600],
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                              ),
                              onPressed: () =>
                                  onUpdateStatus(o['id'], 'delivered'),
                              child: const Text(
                                'Entregado',
                                style: TextStyle(fontSize: 12),
                              ),
                            ),
                          ),
                      ],
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatusPill(String status) {
    Color bg = Colors.grey[200]!;
    Color text = Colors.grey[800]!;
    String label = 'PENDIENTE';

    if (status == 'pending') {
      bg = Colors.yellow[100]!;
      text = Colors.yellow[900]!;
      label = 'PENDIENTE';
    }
    if (status == 'preparing') {
      bg = Colors.blue[100]!;
      text = Colors.blue[900]!;
      label = 'PREPARANDO';
    }
    if (status == 'confirmed') {
      bg = Colors.orange[100]!;
      text = Colors.orange[900]!;
      label = 'EN CAMINO';
    }
    if (status == 'delivered') {
      bg = Colors.green[100]!;
      text = Colors.green[900]!;
      label = 'ENTREGADA';
    }
    if (status == 'cancelled') {
      bg = Colors.red[100]!;
      text = Colors.red[900]!;
      label = 'CANCELADA';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

String _paymentMethodForOrder(dynamic order) {
  if (order is! Map) {
    return 'efectivo';
  }

  final method = order['payment_method']?.toString().toLowerCase().trim();
  if (method == 'transferencia' || method == 'efectivo') {
    return method!;
  }

  final receipt = order['transfer_receipt_url']?.toString().trim();
  if (receipt != null && receipt.isNotEmpty) {
    return 'transferencia';
  }

  final notes = order['notes']?.toString().toLowerCase() ?? '';
  if (notes.contains('pago: transferencia') ||
      notes.contains('metodo_pago: transferencia') ||
      notes.contains('metodo de pago: transferencia')) {
    return 'transferencia';
  }

  return 'efectivo';
}

String _deliveryAddressFromNotes(dynamic value) {
  final notes = value?.toString() ?? '';
  if (notes.trim().isEmpty) {
    return '';
  }

  for (final line in notes.split('\n')) {
    final trimmed = line.trim();
    final lower = trimmed.toLowerCase();
    if (lower.startsWith('direccion:')) {
      return trimmed;
    }
  }

  var cleanNotes = notes;
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Cuenta bancaria seleccionada.*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Fecha enviado a delivery: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Fecha entregado: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Confirmacion de entrega: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'\[PAGO_APROBADO\].*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Correo: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Banco: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Titular: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Tipo: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Cuenta: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Cedula/RUC: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'CLIENTE_CEDULA: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'METODO_PAGO: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'COMPROBANTE: .*\n?', caseSensitive: false),
    '',
  );
  cleanNotes = cleanNotes.replaceAll(
    RegExp(r'Pago: .*\n?', caseSensitive: false),
    '',
  );
  return cleanNotes.trim();
}

double _itemIvaRate(dynamic item) {
  if (item is! Map || item['has_iva'] != true) {
    return 0;
  }

  final value = item['iva_rate'];
  if (value is num && value > 0) {
    return value.toDouble();
  }

  final parsed = double.tryParse(value?.toString() ?? '') ?? 0;
  return parsed > 0 ? parsed : 15.0;
}

double _priceWithIva(double value, double ivaRate) {
  if (ivaRate <= 0) {
    return value;
  }

  double iva = value * ivaRate / 100;
  return double.parse((value + iva + 1e-9).toStringAsFixed(2));
}

double _calculateIvaAmount(double value, double ivaRate) {
  if (ivaRate <= 0) return 0.0;
  double iva = value * ivaRate / 100;
  return double.parse((iva + 1e-9).toStringAsFixed(2));
}

String _formatIvaRate(double value) {
  if (value % 1 == 0) {
    return value.toStringAsFixed(0);
  }

  return value.toStringAsFixed(2);
}

Widget _buildSharedInvoiceColumnSummary({
  required double subtotal,
  required double ivaAmount,
  required double total,
  required Color accentColor,
}) {
  return Column(
    children: [
      Row(
        children: [
          const Expanded(flex: 4, child: SizedBox.shrink()),
          const Expanded(
            flex: 2,
            child: Text(
              'Subtotal',
              textAlign: TextAlign.right,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
          const Expanded(
            flex: 2,
            child: Text(
              'IVA (15%)',
              textAlign: TextAlign.right,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
          const Expanded(
            flex: 2,
            child: Text(
              'Total',
              textAlign: TextAlign.right,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      const SizedBox(height: 4),
      Row(
        children: [
          const Expanded(flex: 4, child: SizedBox.shrink()),
          Expanded(
            flex: 2,
            child: Text(
              '\$${subtotal.toStringAsFixed(2)}',
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              '\$${ivaAmount.toStringAsFixed(2)}',
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              '\$${total.toStringAsFixed(2)}',
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: accentColor,
              ),
            ),
          ),
        ],
      ),
    ],
  );
}
