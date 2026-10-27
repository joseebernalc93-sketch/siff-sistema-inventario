import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_notifications.dart';
import 'main.dart';
import 'order_shared_ui.dart';
import 'invoice_expansion_tile.dart';
import 'admin_cash_handovers_screen.dart';
import 'admin_catalog_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key, required this.account});

  final ClientAccount account;

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final OrderNotificationWatcher _notificationWatcher =
      OrderNotificationWatcher(role: 'admin');
  static const String _menuOrderPreferencesKey = 'admin_menu_order';
  static const List<String> _defaultMenuOrder = [
    'catalog',
    'orders',
    'invoices',
    'cashHandovers',
    'settings',
  ];

  Timer? _notificationTimer;
  int _activeOrdersCount = 0;
  int _cashHandoversCount = 0;
  List<String> _menuOrder = List<String>.of(_defaultMenuOrder);

  ClientAccount get account => widget.account;

  @override
  void initState() {
    super.initState();
    unawaited(_loadMenuOrder());
    unawaited(_checkOrderNotifications(initial: true));
    _notificationTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => unawaited(_checkOrderNotifications()),
    );
  }

  Future<void> _loadMenuOrder() async {
    final prefs = await SharedPreferences.getInstance();
    final savedOrder = prefs.getStringList(_menuOrderPreferencesKey);
    if (!mounted || savedOrder == null) return;

    final cleanedOrder = savedOrder
        .where(_defaultMenuOrder.contains)
        .toSet()
        .toList();
    final missingItems = _defaultMenuOrder.where(
      (item) => !cleanedOrder.contains(item),
    );

    setState(() {
      _menuOrder = [...cleanedOrder, ...missingItems];
    });
  }

  Future<void> _saveMenuOrder(List<String> order) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_menuOrderPreferencesKey, order);
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkOrderNotifications({bool initial = false}) async {
    try {
      final response = await getMobileApi('/api/admin/orders');
      final orders = response['orders'] as List<dynamic>? ?? [];
      await _notificationWatcher.check(orders, initial: initial);

      if (mounted) {
        setState(() {
          _activeOrdersCount = orders.where((o) {
            if (o is! Map) return false;
            final status = o['status']?.toString().toLowerCase() ?? '';
            return status != 'delivered' && status != 'cancelled';
          }).length;
        });
      }
    } catch (_) {}

    try {
      final response = await getMobileApi('/api/admin/cash-handovers');
      final handovers = response['handovers'] as List<dynamic>? ?? [];
      final pendingCashCount = handovers.where((handover) {
        if (handover is! Map) return false;
        final status =
            handover['cash_handover_status']?.toString().toLowerCase() ??
            'pending';
        return status.isEmpty || status == 'pending';
      }).length;

      if (mounted) {
        setState(() {
          _cashHandoversCount = pendingCashCount;
        });
      }
    } catch (_) {}
  }

  void _logout(BuildContext context) {
    unawaited(logoutToAccess(context));
  }

  @override
  Widget build(BuildContext context) {
    final String firstName = 'Administrador Joelys';
    final menuItemsById = _buildMenuItems(context);
    final orderedMenuItems = _menuOrder
        .where((id) => menuItemsById.containsKey(id))
        .map((id) => menuItemsById[id]!)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Menú Principal',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: AppColors.accent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Cerrar sesión',
            onPressed: () => _logout(context),
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFFFF2F6), Colors.white],
            stops: [0.0, 0.4],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 10),
            Center(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFE92E63).withValues(alpha: 0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.asset('assets/Logo2.png', fit: BoxFit.cover),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              '¡Bienvenido, $firstName!',
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: Color(0xFF2A1C22),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            const Text(
              '¿Qué deseas hacer hoy?',
              style: TextStyle(fontSize: 16, color: Color(0xFF6D5B62)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              buildDefaultDragHandles: false,
              itemCount: orderedMenuItems.length,
              onReorderItem: (oldIndex, newIndex) {
                final updatedOrder = List<String>.of(_menuOrder);
                final movedItem = updatedOrder.removeAt(oldIndex);
                updatedOrder.insert(newIndex, movedItem);

                setState(() => _menuOrder = updatedOrder);
                unawaited(_saveMenuOrder(updatedOrder));
              },
              itemBuilder: (context, index) {
                final item = orderedMenuItems[index];
                return Padding(
                  key: ValueKey(item.id),
                  padding: EdgeInsets.only(
                    bottom: index == orderedMenuItems.length - 1 ? 0 : 20,
                  ),
                  child: ReorderableDelayedDragStartListener(
                    index: index,
                    child: _buildMenuCard(
                      context,
                      title: item.title,
                      subtitle: item.subtitle,
                      icon: item.icon,
                      badgeCount: item.badgeCount,
                      onTap: item.onTap,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Map<String, _AdminMenuItem> _buildMenuItems(BuildContext context) {
    return {
      'catalog': _AdminMenuItem(
        id: 'catalog',
        title: 'Catálogo de Productos',
        subtitle: 'Gestiona productos, precios y stock',
        icon: Icons.inventory_2_rounded,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => AdminCatalogScreen(account: account),
            ),
          );
        },
      ),
      'orders': _AdminMenuItem(
        id: 'orders',
        title: 'Pedidos',
        subtitle: 'Gestiona los pedidos activos',
        icon: Icons.list_alt,
        badgeCount: _activeOrdersCount,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => AdminActiveOrdersScreen(account: account),
            ),
          );
        },
      ),
      'invoices': _AdminMenuItem(
        id: 'invoices',
        title: 'Facturas Generadas',
        subtitle: 'Revisa el historial de ventas',
        icon: Icons.receipt_long_rounded,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => AdminInvoicesScreen(account: account),
            ),
          );
        },
      ),
      'cashHandovers': _AdminMenuItem(
        id: 'cashHandovers',
        title: 'Recaudacion Delivery',
        subtitle: 'Controla el efectivo de repartidores',
        icon: Icons.payments_rounded,
        badgeCount: _cashHandoversCount,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => AdminCashHandoversScreen(account: account),
            ),
          );
        },
      ),
      'settings': _AdminMenuItem(
        id: 'settings',
        title: 'Configuraciones',
        subtitle: 'Cuentas bancarias para transferencias',
        icon: Icons.settings_rounded,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => AdminTransferSettingsScreen(account: account),
            ),
          );
        },
      ),
    };
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
    int badgeCount = 0,
  }) {
    Widget card = Card(
      elevation: 4,
      shadowColor: AppColors.accent.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, size: 36, color: AppColors.accent),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF2A1C22),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF6D5B62),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, color: Colors.grey),
            ],
          ),
        ),
      ),
    );

    if (badgeCount <= 0) return card;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        card,
        Positioned(
          top: -8,
          right: -8,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF5252), Color(0xFFD50000)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white, width: 2.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.red.withValues(alpha: 0.4),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: Text(
              badgeCount > 99 ? '99+' : badgeCount.toString(),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 13,
                height: 1.0,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    );
  }
}

class _AdminMenuItem {
  const _AdminMenuItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    this.badgeCount = 0,
  });

  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final int badgeCount;
}

class AdminTransferSettingsScreen extends StatefulWidget {
  const AdminTransferSettingsScreen({super.key, required this.account});

  final ClientAccount account;

  @override
  State<AdminTransferSettingsScreen> createState() =>
      _AdminTransferSettingsScreenState();
}

class _AdminTransferSettingsScreenState
    extends State<AdminTransferSettingsScreen> {
  bool _loading = true;
  String? _error;
  List<TransferAccount> _accounts = [];

  @override
  void initState() {
    super.initState();
    _fetchAccounts();
  }

  Future<void> _fetchAccounts() async {
    try {
      final response = await getMobileApi('/api/admin/transfer-accounts');
      if (!mounted) {
        return;
      }
      setState(() {
        _accounts = TransferAccount.listFromJson(response['accounts']);
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = e is MobileApiException
            ? e.message
            : 'Error al cargar cuentas.';
        _loading = false;
      });
    }
  }

  Future<void> _toggleEnabled(TransferAccount account, bool enabled) async {
    try {
      await putMobileApi('/api/admin/transfer-accounts/${account.id}', {
        'is_enabled': enabled,
      });
      await _fetchAccounts();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is MobileApiException ? e.message : 'Error al actualizar.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _deleteAccount(TransferAccount account) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar cuenta'),
        content: Text('Deseas eliminar la cuenta ${account.accountNumber}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirm != true) {
      return;
    }

    try {
      await deleteMobileApi('/api/admin/transfer-accounts/${account.id}');
      await _fetchAccounts();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is MobileApiException ? e.message : 'Error al eliminar.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _openAccountForm([TransferAccount? account]) async {
    final bankController = TextEditingController(text: account?.bankName ?? '');
    final nameController = TextEditingController(
      text: account?.holderName ?? '',
    );
    final identityController = TextEditingController(
      text: account?.identityNumber ?? '',
    );
    final accountController = TextEditingController(
      text: account?.accountNumber ?? '',
    );
    final emailController = TextEditingController(text: account?.email ?? '');
    var enabled = account?.isEnabled ?? true;
    var saving = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> save() async {
              final bankName = bankController.text.trim();
              final holderName = nameController.text.trim();
              final identityNumber = identityController.text.trim();
              final accountNumber = accountController.text.trim();

              if (bankName.isEmpty ||
                  holderName.isEmpty ||
                  identityNumber.isEmpty ||
                  accountNumber.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Banco, nombre, cedula y numero de cuenta son obligatorios.',
                    ),
                  ),
                );
                return;
              }

              setSheetState(() => saving = true);
              final payload = {
                'bank_name': bankName,
                'holder_name': holderName,
                'identity_number': identityNumber,
                'account_number': accountNumber,
                'email': emailController.text.trim(),
                'is_enabled': enabled,
              };

              try {
                if (account == null) {
                  await postMobileApi('/api/admin/transfer-accounts', payload);
                } else {
                  await putMobileApi(
                    '/api/admin/transfer-accounts/${account.id}',
                    payload,
                  );
                }
                if (sheetContext.mounted) {
                  Navigator.pop(sheetContext);
                }
                await _fetchAccounts();
              } catch (e) {
                if (sheetContext.mounted) {
                  ScaffoldMessenger.of(sheetContext).showSnackBar(
                    SnackBar(
                      content: Text(
                        e is MobileApiException
                            ? e.message
                            : 'Error al guardar.',
                      ),
                    ),
                  );
                  setSheetState(() => saving = false);
                }
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
                ),
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        account == null
                            ? 'Agregar cuenta bancaria'
                            : 'Editar cuenta bancaria',
                        style: const TextStyle(
                          color: Color(0xFF2A1C22),
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _TransferTextField(
                        controller: bankController,
                        label: 'Nombre del banco',
                      ),
                      const SizedBox(height: 10),
                      _TransferTextField(
                        controller: nameController,
                        label: 'Nombre',
                      ),
                      const SizedBox(height: 10),
                      _TransferTextField(
                        controller: identityController,
                        label: 'Cedula',
                      ),
                      const SizedBox(height: 10),
                      _TransferTextField(
                        controller: accountController,
                        label: 'Numero de cuenta',
                      ),
                      const SizedBox(height: 10),
                      _TransferTextField(
                        controller: emailController,
                        label: 'Correo',
                        requiredField: false,
                      ),
                      const SizedBox(height: 8),
                      SwitchListTile(
                        value: enabled,
                        onChanged: saving
                            ? null
                            : (value) => setSheetState(() => enabled = value),
                        activeThumbColor: AppColors.accent,
                        title: const Text('Mostrar a clientes'),
                        contentPadding: EdgeInsets.zero,
                      ),
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        onPressed: saving ? null : save,
                        icon: saving
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.save_rounded),
                        label: Text(saving ? 'Guardando...' : 'Guardar'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Configuraciones',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: AppColors.accent,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAccountForm(),
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Agregar cuenta'),
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
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _fetchAccounts,
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    if (_accounts.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Aun no hay cuentas bancarias. Agrega una para mostrarla a los clientes.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF6D5B62), fontSize: 16),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      itemCount: _accounts.length,
      itemBuilder: (context, index) {
        final account = _accounts[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.account_balance_rounded,
                        color: AppColors.accent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            account.bankName.trim().isEmpty
                                ? 'Banco por configurar'
                                : account.bankName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            account.holderName,
                            style: const TextStyle(
                              color: Color(0xFF6D5B62),
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            account.isEnabled
                                ? 'Habilitada para clientes'
                                : 'Deshabilitada',
                            style: TextStyle(
                              color: account.isEnabled
                                  ? Colors.green[700]
                                  : Colors.grey[600],
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: account.isEnabled,
                      activeThumbColor: AppColors.accent,
                      onChanged: (value) => _toggleEnabled(account, value),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Cuenta: ${account.accountNumber}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                Text(
                  'Banco: ${account.bankName.trim().isEmpty ? 'Banco por configurar' : account.bankName}',
                ),
                Text('Cedula/RUC: ${account.identityNumber}'),
                if (account.email?.isNotEmpty == true)
                  Text('Correo: ${account.email}'),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => _openAccountForm(account),
                      icon: const Icon(Icons.edit_rounded),
                      label: const Text('Editar'),
                    ),
                    TextButton.icon(
                      onPressed: () => _deleteAccount(account),
                      icon: const Icon(Icons.delete_outline_rounded),
                      label: const Text('Eliminar'),
                      style: TextButton.styleFrom(foregroundColor: Colors.red),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TransferTextField extends StatelessWidget {
  const _TransferTextField({
    required this.controller,
    required this.label,
    this.requiredField = true,
  });

  final TextEditingController controller;
  final String label;
  final bool requiredField;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: requiredField ? '$label *' : label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
        ),
      ),
    );
  }
}

class AdminActiveOrdersScreen extends StatefulWidget {
  const AdminActiveOrdersScreen({super.key, required this.account});

  final ClientAccount account;

  @override
  State<AdminActiveOrdersScreen> createState() =>
      _AdminActiveOrdersScreenState();
}

class _AdminActiveOrdersScreenState extends State<AdminActiveOrdersScreen> {
  List<dynamic> _activeOrders = [];
  bool _loading = true;
  bool _hasShownActiveOrders = false;
  bool _returningToMenu = false;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _fetchOrders(initial: true);
    _pollingTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _fetchOrders(),
    );
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOrders({bool initial = false}) async {
    if (initial) {
      setState(() => _loading = true);
    }
    try {
      final responseOrders = await getMobileApi('/api/admin/orders');
      final List<dynamic> orders = responseOrders['orders'] ?? [];

      final currentActive = orders
          .where(
            (o) => o['status'] != 'delivered' && o['status'] != 'cancelled',
          )
          .toList();
      final shouldReturnToMenu =
          !initial &&
          !_returningToMenu &&
          _hasShownActiveOrders &&
          currentActive.isEmpty;

      if (mounted) {
        setState(() {
          _activeOrders = currentActive;
          _loading = false;
          if (currentActive.isNotEmpty) {
            _hasShownActiveOrders = true;
          }
          if (shouldReturnToMenu) {
            _returningToMenu = true;
          }
        });

        if (shouldReturnToMenu) {
          _pollingTimer?.cancel();
          _pollingTimer = null;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          });
        }
      }
    } catch (_) {
      if (mounted && initial) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _updateOrderStatus(
    String id,
    String status, {
    String? deliveryUserId,
    bool? approvePayment,
  }) async {
    try {
      final payload = <String, dynamic>{'status': status};
      if (deliveryUserId != null) {
        payload['delivery_user_id'] = deliveryUserId;
      }
      if (approvePayment == true) {
        payload['approve_payment'] = true;
      }
      await putMobileApi('/api/admin/orders/$id', payload);
      _fetchOrders();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Pedidos Activos',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: AppColors.accent,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SharedOrdersList(
              orders: _activeOrders,
              isActive: true,
              role: 'admin',
              onUpdateStatus: _updateOrderStatus,
            ),
    );
  }
}

class AdminInvoicesScreen extends StatefulWidget {
  const AdminInvoicesScreen({super.key, required this.account});

  final ClientAccount account;

  @override
  State<AdminInvoicesScreen> createState() => _AdminInvoicesScreenState();
}

class _AdminInvoicesScreenState extends State<AdminInvoicesScreen> {
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  List<dynamic> _invoices = [];
  String _search = '';
  String _paymentFilter = 'all';
  String _deliveryFilter = 'all';
  String _periodFilter = 'all';
  DateTime? _startDate;
  DateTime? _endDate;
  String? _deletingInvoiceId;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchInvoices();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchInvoices({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final response = await getMobileApi('/api/admin/invoices');
      if (mounted) {
        setState(() {
          _invoices = response['invoices'] as List<dynamic>? ?? [];
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
              : 'Error al cargar facturas.';
          _loading = false;
          _refreshing = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _filteredInvoices {
    final term = _normalize(_search);

    return _invoices.whereType<Map<String, dynamic>>().where((invoice) {
      if (term.isNotEmpty && !_matchesSearch(invoice, term)) {
        return false;
      }
      if (_paymentFilter != 'all' &&
          _invoicePayment(invoice) != _paymentFilter) {
        return false;
      }
      if (_deliveryFilter != 'all' &&
          _invoiceDelivery(invoice) != _deliveryFilter) {
        return false;
      }
      return _matchesPeriod(invoice);
    }).toList();
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

  bool _matchesSearch(Map<String, dynamic> invoice, String term) {
    final items = invoice['items'] as List<dynamic>? ?? [];
    final productText = items
        .whereType<Map<String, dynamic>>()
        .map((item) => item['product_name']?.toString() ?? '')
        .join(' ');
    final text = [
      invoice['invoice_number'],
      invoice['order_code'],
      invoice['customer_name'],
      invoice['customer_phone'],
      invoice['customer_identity'],
      invoice['channel'],
      invoice['payment_method'],
      productText,
    ].map(_normalize).join(' ');

    return text.contains(term);
  }

  String _invoicePayment(Map<String, dynamic> invoice) {
    final method = _normalize(invoice['payment_method']);
    final notes = _normalize(invoice['notes']);
    if (method.contains('transferencia') ||
        notes.contains('metodo_pago: transferencia')) {
      return 'transferencia';
    }
    return 'efectivo';
  }

  String _invoiceDelivery(Map<String, dynamic> invoice) {
    final status = _normalize(invoice['status']);
    if (status == 'cancelled') {
      return 'cancelled';
    }
    final notes = _normalize(invoice['notes']);
    return notes.contains('retiro en local') ? 'pickup' : 'delivery';
  }

  bool _matchesPeriod(Map<String, dynamic> invoice) {
    if (_periodFilter == 'all') {
      return true;
    }

    final createdAt = DateTime.tryParse(
      invoice['created_at']?.toString() ?? '',
    )?.toLocal();
    if (createdAt == null) {
      return false;
    }

    if (_periodFilter == 'day') {
      return _startDate != null && _sameDay(createdAt, _startDate!);
    }
    if (_periodFilter == 'month') {
      return _startDate != null &&
          createdAt.year == _startDate!.year &&
          createdAt.month == _startDate!.month;
    }
    if (_periodFilter == 'range') {
      final afterStart =
          _startDate == null ||
          !createdAt.isBefore(
            DateTime(_startDate!.year, _startDate!.month, _startDate!.day),
          );
      final beforeEnd =
          _endDate == null ||
          createdAt.isBefore(
            DateTime(_endDate!.year, _endDate!.month, _endDate!.day + 1),
          );
      return afterStart && beforeEnd;
    }

    return true;
  }

  bool _sameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  void _clearFilters() {
    setState(() {
      _search = '';
      _paymentFilter = 'all';
      _deliveryFilter = 'all';
      _periodFilter = 'all';
      _startDate = null;
      _endDate = null;
      _searchController.clear();
    });
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
  }

  Future<void> _deleteInvoice(Map<String, dynamic> invoice) async {
    final id = invoice['id']?.toString();
    final number =
        invoice['invoice_number']?.toString() ??
        invoice['order_code']?.toString() ??
        'esta factura';
    if (id == null || id.isEmpty) {
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar factura'),
        content: Text(
          'Deseas eliminar $number del historial? Esta accion la ocultara del administrador web y de la APK.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Eliminar'),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
          ),
        ],
      ),
    );

    if (confirm != true) {
      return;
    }

    setState(() => _deletingInvoiceId = id);
    try {
      await deleteMobileApi('/api/admin/invoices/$id');
      await _fetchInvoices(silent: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$number eliminado del historial.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is MobileApiException ? e.message : 'No se pudo eliminar.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _deletingInvoiceId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF2F6),
      appBar: AppBar(
        title: const Text(
          'Facturas Generadas',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: AppColors.accent,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _refreshing
                ? null
                : () {
                    setState(() => _refreshing = true);
                    _fetchInvoices(silent: true);
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
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _loading = true;
                    _error = null;
                  });
                  _fetchInvoices();
                },
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    final filtered = _filteredInvoices;

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: () => _fetchInvoices(silent: true),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          _buildSummary(filtered),
          const SizedBox(height: 14),
          _buildFilters(filtered.length),
          const SizedBox(height: 14),
          if (_invoices.isEmpty)
            _buildEmptyState('No hay facturas generadas aun.')
          else if (filtered.isEmpty)
            _buildEmptyState('No hay facturas que coincidan con los filtros.')
          else
            ...filtered.map(
              (invoice) => SharedInvoiceExpansionTile(
                invoice: invoice,
                showAdminActions: true,
                deleting: _deletingInvoiceId == invoice['id']?.toString(),
                onDelete: () => _deleteInvoice(invoice),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummary(List<Map<String, dynamic>> invoices) {
    final itemCount = invoices.fold<int>(0, (sum, invoice) {
      final items = invoice['items'] as List<dynamic>? ?? [];
      return sum + items.length;
    });
    final total = invoices.fold<double>(0, (sum, invoice) {
      return sum + ((invoice['total'] as num?)?.toDouble() ?? 0);
    });

    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            title: 'Comprobantes',
            value: invoices.length.toString(),
            icon: Icons.receipt_long_rounded,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricCard(
            title: 'Productos',
            value: itemCount.toString(),
            icon: Icons.inventory_2_rounded,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricCard(
            title: 'Total',
            value: '\$${total.toStringAsFixed(2)}',
            icon: Icons.attach_money_rounded,
          ),
        ),
      ],
    );
  }

  Widget _buildFilters(int visibleCount) {
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
                        'Historial de ventas',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF2A1C22),
                        ),
                      ),
                      Text(
                        '$visibleCount de ${_invoices.length} facturas visibles.',
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
                hintText: 'Cliente, cedula, codigo o producto...',
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
            Row(
              children: [
                Expanded(
                  child: _buildDropdown(
                    label: 'Pago',
                    value: _paymentFilter,
                    items: const {
                      'all': 'Todos',
                      'efectivo': 'Efectivo',
                      'transferencia': 'Transferencia',
                    },
                    onChanged: (value) =>
                        setState(() => _paymentFilter = value),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildDropdown(
                    label: 'Entrega',
                    value: _deliveryFilter,
                    items: const {
                      'all': 'Todos',
                      'pickup': 'Retiro',
                      'delivery': 'Domicilio',
                      'cancelled': 'Anulada',
                    },
                    onChanged: (value) =>
                        setState(() => _deliveryFilter = value),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildDropdown(
              label: 'Periodo',
              value: _periodFilter,
              items: const {
                'all': 'Todos',
                'day': 'Dia',
                'month': 'Mes',
                'range': 'Desde / Hasta',
              },
              onChanged: (value) {
                setState(() {
                  _periodFilter = value;
                  _startDate = null;
                  _endDate = null;
                });
              },
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

  Widget _buildEmptyState(String text) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          children: [
            Icon(
              Icons.receipt_long_rounded,
              size: 52,
              color: AppColors.accent.withValues(alpha: 0.55),
            ),
            const SizedBox(height: 14),
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF6D5B62),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
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

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  final String title;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF9D6DE)),
        boxShadow: [
          BoxShadow(
            color: AppColors.accent.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.accent, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w900,
              color: Color(0xFF2A1C22),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF6D5B62),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
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
