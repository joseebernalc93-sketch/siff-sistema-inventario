import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'main.dart';

class AdminCashHandoversScreen extends StatefulWidget {
  const AdminCashHandoversScreen({super.key, required this.account});

  final ClientAccount account;

  @override
  State<AdminCashHandoversScreen> createState() =>
      _AdminCashHandoversScreenState();
}

class _AdminCashHandoversScreenState extends State<AdminCashHandoversScreen> {
  bool _loading = true;
  bool _refreshing = false;
  bool _processing = false;
  String? _error;
  String? _message;
  bool _messageIsError = false;
  List<dynamic> _handovers = [];
  String _search = '';
  String _periodFilter = 'all';
  DateTime? _startDate;
  DateTime? _endDate;
  Timer? _refreshTimer;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    unawaited(_fetchHandovers());
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => unawaited(_fetchHandovers(silent: true)),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchHandovers({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final query = <String, String>{};
      if (_startDate != null) {
        query['startDate'] = '${_formatApiDate(_startDate!)}T00:00:00.000Z';
      }
      if (_endDate != null) {
        query['endDate'] = '${_formatApiDate(_endDate!)}T23:59:59.999Z';
      }

      final response = await getMobileApi('/api/admin/cash-handovers', query);
      if (mounted) {
        setState(() {
          _handovers = response['handovers'] as List<dynamic>? ?? [];
          _loading = false;
          _refreshing = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is MobileApiException
              ? e.message
              : 'Error al cargar recaudaciones.';
          _loading = false;
          _refreshing = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _filteredHandovers {
    final term = _normalize(_search);
    final rows = _handovers.whereType<Map<String, dynamic>>().toList();
    if (term.isEmpty) {
      return rows;
    }

    return rows.where((handover) {
      final searchable = [
        handover['delivery_user_name'],
        handover['delivery_user_identity'],
        handover['order_code'],
        handover['customer_name'],
      ].map(_normalize).join(' ');
      return searchable.contains(term);
    }).toList();
  }

  List<Map<String, dynamic>> get _pendingHandovers => _filteredHandovers
      .where((handover) => _statusOf(handover) == 'handed_over')
      .toList();

  List<Map<String, dynamic>> get _confirmedHandovers => _filteredHandovers
      .where((handover) => _statusOf(handover) == 'confirmed')
      .toList();

  List<Map<String, dynamic>> get _unsubmittedHandovers =>
      _filteredHandovers.where((handover) {
        final status = _statusOf(handover);
        return status.isEmpty || status == 'pending';
      }).toList();

  List<_DeliveryHandoverGroup> get _pendingByDelivery {
    final groups = <String, _DeliveryHandoverGroup>{};
    for (final handover in _pendingHandovers) {
      final key =
          handover['delivery_user_id']?.toString().trim().isNotEmpty == true
          ? handover['delivery_user_id'].toString()
          : '${handover['delivery_user_identity']}_${handover['delivery_user_name']}';
      final group = groups.putIfAbsent(
        key,
        () => _DeliveryHandoverGroup(
          user: _text(handover['delivery_user_name'], fallback: 'Desconocido'),
          identity: _text(handover['delivery_user_identity']),
        ),
      );
      group.ids.add(handover['id']?.toString() ?? '');
      group.total += _number(handover['total']);
    }
    return groups.values.toList();
  }

  double get _totalPendingReview => _sumTotal(_pendingHandovers);

  double get _totalConfirmed => _sumTotal(_confirmedHandovers);

  double get _totalUnsubmitted => _sumTotal(_unsubmittedHandovers);

  double _sumTotal(List<Map<String, dynamic>> rows) {
    return rows.fold<double>(
      0,
      (sum, handover) => sum + _number(handover['total']),
    );
  }

  Future<void> _handleAction(List<String> orderIds, String action) async {
    final cleanIds = orderIds.where((id) => id.trim().isNotEmpty).toList();
    if (cleanIds.isEmpty) {
      return;
    }

    setState(() {
      _processing = true;
      _message = null;
    });

    try {
      await postMobileApi('/api/admin/cash-handovers', {
        'orderIds': cleanIds,
        'action': action,
      });
      await _fetchHandovers(silent: true);
      if (mounted) {
        setState(() {
          _message = 'Actualizado correctamente.';
          _messageIsError = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _message = e is MobileApiException
              ? e.message
              : 'No se pudo actualizar la recaudacion.';
          _messageIsError = true;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }

  Future<void> _pickDate({required bool isEndDate}) async {
    final now = DateTime.now();
    final initial = (isEndDate ? _endDate : _startDate) ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 1),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(
              context,
            ).colorScheme.copyWith(primary: AppColors.accent),
          ),
          child: child!,
        );
      },
    );
    if (picked == null) {
      return;
    }

    setState(() {
      if (_periodFilter == 'day') {
        _startDate = picked;
        _endDate = picked;
      } else if (_periodFilter == 'month') {
        _startDate = DateTime(picked.year, picked.month);
        _endDate = DateTime(picked.year, picked.month + 1, 0);
      } else if (isEndDate) {
        _endDate = picked;
      } else {
        _startDate = picked;
      }
    });
    await _fetchHandovers(silent: true);
  }

  void _setPeriodFilter(String value) {
    setState(() {
      _periodFilter = value;
      _startDate = null;
      _endDate = null;
    });
    unawaited(_fetchHandovers(silent: true));
  }

  void _clearFilters() {
    setState(() {
      _search = '';
      _periodFilter = 'all';
      _startDate = null;
      _endDate = null;
      _message = null;
      _searchController.clear();
    });
    unawaited(_fetchHandovers(silent: true));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF2F6),
      appBar: AppBar(
        title: const Text(
          'Recaudacion Delivery',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: AppColors.accent,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _refreshing || _processing
                ? null
                : () {
                    setState(() => _refreshing = true);
                    unawaited(_fetchHandovers(silent: true));
                  },
            icon: _refreshing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.refresh_rounded, color: Colors.white),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _fetchHandovers,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: () => _fetchHandovers(silent: true),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          _buildHeader(),
          const SizedBox(height: 14),
          _buildFilters(),
          if (_message != null) ...[
            const SizedBox(height: 12),
            _buildMessage(),
          ],
          const SizedBox(height: 14),
          if (_pendingByDelivery.isNotEmpty) ...[
            _buildPendingGroups(),
            const SizedBox(height: 14),
          ],
          _buildPendingReview(),
          const SizedBox(height: 14),
          _buildUnsubmitted(),
          const SizedBox(height: 14),
          _buildConfirmedHistory(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Card(
      elevation: 3,
      shadowColor: AppColors.accent.withValues(alpha: 0.12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF4D7),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.attach_money_rounded,
                    color: Color(0xFFB7791F),
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Control de efectivo',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFB7791F),
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Pedidos a domicilio pagados en efectivo.',
                        style: TextStyle(
                          color: Color(0xFF6D5B62),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _CashMetricCard(
                    title: 'Por revisar',
                    value: _formatMoney(_totalPendingReview),
                    subtitle: '${_pendingHandovers.length} reportadas',
                    icon: Icons.schedule_rounded,
                    color: const Color(0xFFB7791F),
                    background: const Color(0xFFFFF7E6),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _CashMetricCard(
                    title: 'Confirmado',
                    value: _formatMoney(_totalConfirmed),
                    subtitle: '${_confirmedHandovers.length} registros',
                    icon: Icons.verified_rounded,
                    color: const Color(0xFF198754),
                    background: const Color(0xFFEFFAF3),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _CashMetricCard(
                    title: 'En poder',
                    value: _formatMoney(_totalUnsubmitted),
                    subtitle: '${_unsubmittedHandovers.length} pedidos',
                    icon: Icons.account_balance_wallet_rounded,
                    color: const Color(0xFF51464D),
                    background: const Color(0xFFF7F5F6),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters() {
    return Card(
      elevation: 3,
      shadowColor: AppColors.accent.withValues(alpha: 0.12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Filtrar historial',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF2A1C22),
                        ),
                      ),
                      Text(
                        '${_filteredHandovers.length} de ${_handovers.length} recaudaciones visibles.',
                        style: const TextStyle(
                          color: Color(0xFF6D5B62),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton.icon(
                  onPressed: _clearFilters,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: const Text('Limpiar'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.accent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _search = value),
              decoration: InputDecoration(
                labelText: 'Buscar',
                hintText: 'Delivery, cedula, pedido o cliente...',
                prefixIcon: const Icon(Icons.search_rounded),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(
                    color: AppColors.accent,
                    width: 1.4,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            _buildDropdown(
              label: 'Periodo',
              value: _periodFilter,
              items: const {
                'all': 'Todo el historial',
                'day': 'Dia',
                'month': 'Mes',
                'range': 'Desde / Hasta',
              },
              onChanged: _setPeriodFilter,
            ),
            if (_periodFilter != 'all') ...[
              const SizedBox(height: 12),
              if (_periodFilter == 'range')
                Row(
                  children: [
                    Expanded(
                      child: _DateButton(
                        label: 'Desde',
                        value: _formatPickerDate(_startDate),
                        onPressed: () => _pickDate(isEndDate: false),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _DateButton(
                        label: 'Hasta',
                        value: _formatPickerDate(_endDate),
                        onPressed: () => _pickDate(isEndDate: true),
                      ),
                    ),
                  ],
                )
              else
                _DateButton(
                  label: _periodFilter == 'month' ? 'Mes' : 'Fecha',
                  value: _periodFilter == 'month'
                      ? _formatPickerMonth(_startDate)
                      : _formatPickerDate(_startDate),
                  onPressed: () => _pickDate(isEndDate: false),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPendingGroups() {
    return _SectionCard(
      icon: Icons.payments_rounded,
      iconColor: const Color(0xFFB7791F),
      title: 'Dinero entregado por revisar',
      subtitle:
          'El repartidor ya marco la entrega de efectivo. Falta confirmarlo desde administracion.',
      trailing: _StatusPill(
        text: '${_formatMoney(_totalPendingReview)} pendientes',
        background: const Color(0xFFFFF3CD),
        foreground: const Color(0xFF8A5B00),
      ),
      child: Column(
        children: _pendingByDelivery
            .map((group) => _buildDeliveryGroupCard(group))
            .toList(),
      ),
    );
  }

  Widget _buildDeliveryGroupCard(_DeliveryHandoverGroup group) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF2C6D1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      group.user,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF2A1C22),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      group.identity.isEmpty
                          ? 'Sin cedula registrada'
                          : group.identity,
                      style: const TextStyle(
                        color: Color(0xFF6D5B62),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              _StatusPill(
                text: '${group.ids.length} pedido(s)',
                background: const Color(0xFFFFF3CD),
                foreground: const Color(0xFF8A5B00),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _formatMoney(group.total),
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: Color(0xFF2A1C22),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _processing
                ? null
                : () => _handleAction(group.ids, 'confirm'),
            icon: const Icon(Icons.check_rounded),
            label: const Text('Confirmar todo'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingReview() {
    return _SectionCard(
      icon: Icons.schedule_rounded,
      iconColor: const Color(0xFFB7791F),
      title: 'Revision individual',
      subtitle: 'Confirma o rechaza cada entrega reportada por un repartidor.',
      trailing: _StatusPill(
        text: '${_pendingHandovers.length} pendiente(s)',
        background: const Color(0xFFFFF3CD),
        foreground: const Color(0xFF8A5B00),
      ),
      child: _pendingHandovers.isEmpty
          ? _emptySection('No hay recaudaciones pendientes con estos filtros.')
          : Column(
              children: _pendingHandovers
                  .map((handover) => _buildPendingHandoverTile(handover))
                  .toList(),
            ),
    );
  }

  Widget _buildPendingHandoverTile(Map<String, dynamic> handover) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF2C6D1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _text(handover['order_code'], fallback: 'Sin codigo'),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF2A1C22),
                  ),
                ),
              ),
              Text(
                _formatMoney(_number(handover['total'])),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF2A1C22),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _detailLine(
            Icons.person_rounded,
            'Delivery: ${_text(handover['delivery_user_name'], fallback: 'Desconocido')}',
          ),
          _detailLine(
            Icons.badge_rounded,
            'Cedula: ${_text(handover['delivery_user_identity'], fallback: 'Sin registro')}',
          ),
          _detailLine(
            Icons.shopping_bag_rounded,
            'Cliente: ${_text(handover['customer_name'], fallback: 'Consumidor final')}',
          ),
          _detailLine(
            Icons.event_available_rounded,
            'Reportado: ${_formatDateTime(handover['cash_handed_over_at'])}',
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _processing
                      ? null
                      : () => _handleAction([_text(handover['id'])], 'reject'),
                  icon: const Icon(Icons.close_rounded),
                  label: const Text('Rechazar'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red.shade700,
                    side: BorderSide(color: Colors.red.shade100),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _processing
                      ? null
                      : () => _handleAction([_text(handover['id'])], 'confirm'),
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Recibi'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmedHistory() {
    return _SectionCard(
      icon: Icons.verified_rounded,
      iconColor: const Color(0xFF198754),
      title: 'Historial confirmado',
      subtitle: 'Dinero recibido y cerrado por administracion.',
      trailing: _StatusPill(
        text: _formatMoney(_totalConfirmed),
        background: const Color(0xFFDFF5E7),
        foreground: const Color(0xFF146C43),
      ),
      child: _confirmedHandovers.isEmpty
          ? _emptySection('No hay historial para estos filtros.')
          : Column(
              children: _confirmedHandovers
                  .map(
                    (handover) => _buildCompactTile(
                      handover,
                      statusText: 'Recibido',
                      statusColor: const Color(0xFF198754),
                      dateValue: handover['cash_confirmed_at'],
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildUnsubmitted() {
    return _SectionCard(
      icon: Icons.info_outline_rounded,
      iconColor: const Color(0xFF51464D),
      title: 'Dinero en poder de repartidores',
      subtitle:
          'Pedidos a domicilio pagados en efectivo que el repartidor todavia no reporta como entregados al administrador.',
      child: _unsubmittedHandovers.isEmpty
          ? _emptySection('Nada pendiente con los filtros actuales.')
          : Column(
              children: _unsubmittedHandovers
                  .map(
                    (handover) => _buildCompactTile(
                      handover,
                      statusText: 'Sin reportar',
                      statusColor: const Color(0xFF51464D),
                      dateValue: handover['created_at'],
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _buildCompactTile(
    Map<String, dynamic> handover, {
    required String statusText,
    required Color statusColor,
    required Object? dateValue,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF2C6D1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _text(handover['order_code'], fallback: 'Sin codigo'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF2A1C22),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _formatMoney(_number(handover['total'])),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF2A1C22),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _StatusPill(
            text: statusText,
            background: statusColor.withValues(alpha: 0.12),
            foreground: statusColor,
          ),
          const SizedBox(height: 8),
          Text(
            _text(handover['delivery_user_name'], fallback: 'Desconocido'),
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              color: Color(0xFF2A1C22),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '${_text(handover['delivery_user_identity'], fallback: 'Sin cedula registrada')} - Cliente: ${_text(handover['customer_name'], fallback: 'Consumidor final')}',
            style: const TextStyle(color: Color(0xFF6D5B62), fontSize: 12),
          ),
          const SizedBox(height: 6),
          _detailLine(Icons.calendar_month_rounded, _formatDateTime(dateValue)),
        ],
      ),
    );
  }

  Widget _buildMessage() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _messageIsError
            ? const Color(0xFFFFEBEE)
            : const Color(0xFFEFFAF3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _messageIsError
              ? const Color(0xFFFFCDD2)
              : const Color(0xFFCDEED7),
        ),
      ),
      child: Row(
        children: [
          Icon(
            _messageIsError
                ? Icons.error_outline_rounded
                : Icons.check_circle_outline_rounded,
            color: _messageIsError ? Colors.red.shade700 : Colors.green,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _message!,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: _messageIsError
                    ? Colors.red.shade800
                    : const Color(0xFF146C43),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailLine(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: const Color(0xFF8B7A81)),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Color(0xFF6D5B62), fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptySection(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF9D6DE)),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Color(0xFF6D5B62),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _buildDropdown({
    required String label,
    required String value,
    required Map<String, String> items,
    required ValueChanged<String> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
      ),
      items: items.entries
          .map(
            (entry) => DropdownMenuItem<String>(
              value: entry.key,
              child: Text(entry.value),
            ),
          )
          .toList(),
      onChanged: (next) {
        if (next != null) {
          onChanged(next);
        }
      },
    );
  }

  String _statusOf(Map<String, dynamic> handover) {
    return _normalize(handover['cash_handover_status']);
  }

  String _normalize(Object? value) {
    return value
            ?.toString()
            .toLowerCase()
            .replaceAll(RegExp(r'[áàäâ]'), 'a')
            .replaceAll(RegExp(r'[éèëê]'), 'e')
            .replaceAll(RegExp(r'[íìïî]'), 'i')
            .replaceAll(RegExp(r'[óòöô]'), 'o')
            .replaceAll(RegExp(r'[úùüû]'), 'u')
            .replaceAll('ñ', 'n')
            .trim() ??
        '';
  }

  String _text(Object? value, {String fallback = ''}) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? fallback : text;
  }

  double _number(Object? value) {
    if (value is num) {
      return value.toDouble();
    }
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _formatMoney(double value) {
    return NumberFormat.currency(locale: 'en_US', symbol: r'$').format(value);
  }

  String _formatDateTime(Object? value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (parsed == null) {
      return 'Sin fecha';
    }
    return DateFormat('dd/MM/yyyy, h:mm a').format(parsed);
  }

  String _formatApiDate(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  String _formatPickerDate(DateTime? date) {
    if (date == null) {
      return 'Seleccionar';
    }
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatPickerMonth(DateTime? date) {
    if (date == null) {
      return 'Seleccionar';
    }
    return '${date.month}/${date.year}';
  }
}

class _DeliveryHandoverGroup {
  _DeliveryHandoverGroup({required this.user, required this.identity});

  final String user;
  final String identity;
  final List<String> ids = [];
  double total = 0;
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.child,
    this.trailing,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      shadowColor: AppColors.accent.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: iconColor, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF2A1C22),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          color: Color(0xFF6D5B62),
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                if (trailing != null) ...[const SizedBox(width: 8), trailing!],
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

class _CashMetricCard extends StatelessWidget {
  const _CashMetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.background,
  });

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Color(0xFF2A1C22),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF6D5B62),
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.text,
    required this.background,
    required this.foreground,
  });

  final String text;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _DateButton extends StatelessWidget {
  const _DateButton({
    required this.label,
    required this.value,
    required this.onPressed,
  });

  final String label;
  final String value;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.calendar_month_rounded, size: 18),
      label: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900)),
        ],
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.accent,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        side: const BorderSide(color: Color(0xFFF2C6D1)),
      ),
    );
  }
}
