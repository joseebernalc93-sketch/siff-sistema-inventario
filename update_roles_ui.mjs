import fs from 'fs';

let content = fs.readFileSync('mobile/minimarket_cliente/lib/main.dart', 'utf-8');

// 1. Rename existing RoleDashboardScreen to RoleOrdersScreen
content = content.replace(/class RoleDashboardScreen extends StatefulWidget/g, 'class RoleOrdersScreen extends StatefulWidget');
content = content.replace(/RoleDashboardScreen\(\{/g, 'RoleOrdersScreen({');
content = content.replace(/State<RoleDashboardScreen>/g, 'State<RoleOrdersScreen>');
content = content.replace(/class _RoleDashboardScreenState extends State<RoleDashboardScreen>/g, 'class _RoleOrdersScreenState extends State<RoleOrdersScreen>');
content = content.replace(/_RoleDashboardScreenState/g, '_RoleOrdersScreenState');

// 2. Add initialIndex to RoleOrdersScreen
content = content.replace(
  /const RoleOrdersScreen\(\{super\.key, required this\.account, required this\.role\}\);/,
  'const RoleOrdersScreen({super.key, required this.account, required this.role, this.initialIndex = 0});\n  final int initialIndex;'
);

content = content.replace(
  /int _currentIndex = 0;/,
  'late int _currentIndex;'
);

content = content.replace(
  /super\.initState\(\);/,
  'super.initState();\n    _currentIndex = widget.initialIndex;'
);

// 3. Create the new RoleDashboardScreen
const newRoleDashboardScreen = `
class RoleDashboardScreen extends StatelessWidget {
  const RoleDashboardScreen({super.key, required this.account, required this.role});

  final ClientAccount account;
  final String role;

  void _logout(BuildContext context) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const ClientAccessScreen()),
      (route) => false,
    );
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    final bgColor = role == 'empleado' ? AppColors.accent : Colors.amber.shade700;
    return Card(
      elevation: 4,
      shadowColor: bgColor.withValues(alpha: 0.2),
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
                  color: bgColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, size: 36, color: bgColor),
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
              const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFFD4C9CE), size: 20),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String firstName = account.name.trim().isEmpty
        ? (role == 'empleado' ? 'Empleado' : 'Delivery')
        : account.name.trim().split(RegExp(r'\\s+')).first;
    
    final title = role == 'empleado' ? 'PANEL DE EMPLEADO' : 'PANEL DE DELIVERY';
    final bgColor = role == 'empleado' ? AppColors.accent : Colors.amber.shade700;

    return Scaffold(
      appBar: AppBar(
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
        backgroundColor: bgColor,
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
            const SizedBox(height: 20),
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
              style: TextStyle(
                fontSize: 16,
                color: Color(0xFF6D5B62),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            _buildMenuCard(
              context,
              title: 'Pedidos Activos',
              subtitle: 'Gestiona los pedidos actuales',
              icon: Icons.list_alt,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => RoleOrdersScreen(account: account, role: role, initialIndex: 0)),
                );
              },
            ),
            const SizedBox(height: 20),
            _buildMenuCard(
              context,
              title: 'Historial',
              subtitle: 'Revisa los pedidos completados',
              icon: Icons.history,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => RoleOrdersScreen(account: account, role: role, initialIndex: 1)),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
`;

content = content + '\n\n' + newRoleDashboardScreen;

fs.writeFileSync('mobile/minimarket_cliente/lib/main.dart', content, 'utf-8');
console.log('Done!');
