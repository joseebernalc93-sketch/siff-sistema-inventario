import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_notifications.dart';
import 'main.dart';

class AdminCatalogScreen extends StatefulWidget {
  const AdminCatalogScreen({super.key, required this.account});
  final ClientAccount account;

  @override
  State<AdminCatalogScreen> createState() => _AdminCatalogScreenState();
}

class _AdminCatalogScreenState extends State<AdminCatalogScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _products = [];
  List<dynamic> _filteredProducts = [];
  List<dynamic> _categories = [];
  String _searchQuery = '';
  String? _selectedCategoryId;

  @override
  void initState() {
    super.initState();
    _fetchCatalog();
  }

  Future<void> _fetchCatalog() async {
    try {
      final response = await getMobileApi('/api/admin/catalog');
      if (!mounted) return;
      setState(() {
        _categories = response['categories'] as List<dynamic>? ?? [];
        _products = response['products'] as List<dynamic>? ?? [];
        _filteredProducts = List.from(_products);
        _loading = false;
        _error = null;
      });
      _applyFilters();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is MobileApiException ? e.message : 'Error al cargar catálogo.';
        _loading = false;
      });
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredProducts = _products.where((p) {
        if (_selectedCategoryId != null && p['category_id'] != _selectedCategoryId) {
          return false;
        }
        if (_searchQuery.isNotEmpty) {
          final query = _searchQuery.toLowerCase();
          final name = (p['name'] ?? '').toString().toLowerCase();
          final sku = (p['sku'] ?? '').toString().toLowerCase();
          if (!name.contains(query) && !sku.contains(query)) {
            return false;
          }
        }
        return true;
      }).toList();
    });
  }

  Future<void> _openEditProductForm(Map<String, dynamic> product) async {
    final nameController = TextEditingController(text: product['name']?.toString() ?? '');
    final descriptionController = TextEditingController(text: product['description']?.toString() ?? '');
    final priceController = TextEditingController(text: product['price']?.toString() ?? '0');
    final stockController = TextEditingController(text: product['stock']?.toString() ?? '0');
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
              final name = nameController.text.trim();
              final price = double.tryParse(priceController.text) ?? 0.0;
              final stock = double.tryParse(stockController.text) ?? 0.0;
              
              if (name.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('El nombre es obligatorio.')),
                );
                return;
              }

              setSheetState(() => saving = true);
              final payload = {
                'name': name,
                'description': descriptionController.text.trim(),
                'price': price,
                'stock': stock,
              };

              try {
                await putMobileApi('/api/admin/products/${product['id']}', payload);
                if (sheetContext.mounted) {
                  Navigator.pop(sheetContext);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Producto actualizado exitosamente.')),
                  );
                }
                await _fetchCatalog();
              } catch (e) {
                if (sheetContext.mounted) {
                  ScaffoldMessenger.of(sheetContext).showSnackBar(
                    SnackBar(content: Text(e is MobileApiException ? e.message : 'Error al actualizar producto.')),
                  );
                  setSheetState(() => saving = false);
                }
              }
            }

            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
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
                      const Text(
                        'Editar Producto',
                        style: TextStyle(
                          color: Color(0xFF2A1C22),
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: nameController,
                        decoration: InputDecoration(
                          labelText: 'Nombre',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: descriptionController,
                        decoration: InputDecoration(
                          labelText: 'Descripción',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: priceController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: InputDecoration(
                                labelText: 'Precio (\$)',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                prefixIcon: const Icon(Icons.attach_money_rounded),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: stockController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: InputDecoration(
                                labelText: 'Stock (${product['measurement_unit'] == 'lb' ? 'Libras' : 'Unidades'})',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                prefixIcon: const Icon(Icons.inventory_2_rounded),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        onPressed: saving ? null : save,
                        icon: saving
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.save_rounded),
                        label: Text(saving ? 'Guardando...' : 'Guardar Cambios'),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
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
        title: const Text('Catálogo de Productos', style: TextStyle(color: Colors.white)),
        backgroundColor: AppColors.accent,
        iconTheme: const IconThemeData(color: Colors.white),
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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: _fetchCatalog, child: const Text('Reintentar')),
          ],
        ),
      );
    }
    return Column(
      children: [
        _buildSearchBar(),
        _buildCategoryChips(),
        Expanded(
          child: _filteredProducts.isEmpty
              ? const Center(child: Text('No hay productos que coincidan.', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _filteredProducts.length,
                  itemBuilder: (context, index) {
                    final p = _filteredProducts[index];
                    final stock = num.tryParse(p['stock']?.toString() ?? '0') ?? 0;
                    final price = num.tryParse(p['price']?.toString() ?? '0') ?? 0;
                    final isLb = p['measurement_unit'] == 'lb';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                            image: p['image_url'] != null && p['image_url'].toString().isNotEmpty
                                ? DecorationImage(image: NetworkImage(p['image_url']), fit: BoxFit.cover)
                                : null,
                          ),
                          child: p['image_url'] == null || p['image_url'].toString().isEmpty
                              ? const Icon(Icons.image_not_supported, color: Colors.grey)
                              : null,
                        ),
                        title: Text(p['name'] ?? 'Sin nombre', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('SKU: ${p['sku'] ?? '-'} • Stock: ${stock.toStringAsFixed(isLb ? 2 : 0)} ${isLb ? 'lb' : 'und'}'),
                        trailing: Text('\$${price.toStringAsFixed(2)}', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 16)),
                        onTap: () => _openEditProductForm(p),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: TextField(
        decoration: InputDecoration(
          hintText: 'Buscar producto...',
          prefixIcon: const Icon(Icons.search),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
        onChanged: (val) {
          _searchQuery = val;
          _applyFilters();
        },
      ),
    );
  }

  Widget _buildCategoryChips() {
    if (_categories.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 50,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _categories.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            final isSelected = _selectedCategoryId == null;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: const Text('Todas'),
                selected: isSelected,
                onSelected: (val) {
                  setState(() => _selectedCategoryId = null);
                  _applyFilters();
                },
                selectedColor: AppColors.accent.withValues(alpha: 0.2),
                labelStyle: TextStyle(color: isSelected ? AppColors.accent : Colors.black87),
              ),
            );
          }
          final cat = _categories[index - 1];
          final isSelected = _selectedCategoryId == cat['id'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(cat['name'] ?? ''),
              selected: isSelected,
              onSelected: (val) {
                setState(() => _selectedCategoryId = val ? cat['id'] : null);
                _applyFilters();
              },
              selectedColor: AppColors.accent.withValues(alpha: 0.2),
              labelStyle: TextStyle(color: isSelected ? AppColors.accent : Colors.black87),
            ),
          );
        },
      ),
    );
  }
}
