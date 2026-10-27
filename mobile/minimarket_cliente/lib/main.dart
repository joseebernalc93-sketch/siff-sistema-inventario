import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'invoice_pdf_generator.dart';
import 'app_notifications.dart';
import 'admin_module.dart';
import 'order_shared_ui.dart';

const _storedClientAccountKey = 'minimarket_client_account';
const _secureClientAccountKey = 'minimarket_secure_client_account';
const _sessionActiveKey = 'minimarket_session_active';
const _mobileApiBaseUrl = String.fromEnvironment(
  'MINIMARKET_API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);
const _secureStorage = FlutterSecureStorage();
@visibleForTesting
String? mobileApiBaseUrlOverride;
ClientAccount? _sessionClientAccount;
bool _disableNativeAuthForTesting = false;
StreamSubscription<String>? _pushTokenRefreshSubscription;

@visibleForTesting
void resetClientSessionForTesting() {
  _sessionClientAccount = null;
  mobileApiBaseUrlOverride = null;
  _disableNativeAuthForTesting = true;
}

Future<Map<String, dynamic>> postMobileApi(
  String path,
  Map<String, Object?> payload,
) async {
  final baseUrl = (mobileApiBaseUrlOverride ?? _mobileApiBaseUrl).trim();
  if (baseUrl.isEmpty) {
    throw const MobileApiException(
      'Servidor movil no configurado.',
      statusCode: 0,
    );
  }

  final normalizedBaseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');
  final uri = Uri.parse('$normalizedBaseUrl$path');
  http.Response response;

  try {
    response = await http
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 12));
  } catch (_) {
    throw const MobileApiException(
      'No se pudo conectar con el servidor.',
      statusCode: 0,
    );
  }

  final Map<String, dynamic> data;
  try {
    data = jsonDecode(response.body) as Map<String, dynamic>;
  } catch (_) {
    throw MobileApiException(
      'Respuesta invalida del servidor.',
      statusCode: response.statusCode,
    );
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw MobileApiException(
      data['error'] as String? ?? 'No se pudo completar la solicitud.',
      statusCode: response.statusCode,
    );
  }
  return data;
}

Future<Map<String, dynamic>> putMobileApi(
  String path,
  Map<String, Object?> payload,
) async {
  final baseUrl = (mobileApiBaseUrlOverride ?? _mobileApiBaseUrl).trim();
  if (baseUrl.isEmpty) {
    throw const MobileApiException(
      'Servidor movil no configurado.',
      statusCode: 0,
    );
  }

  final normalizedBaseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');
  final uri = Uri.parse('$normalizedBaseUrl$path');
  http.Response response;

  try {
    response = await http
        .put(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 12));
  } catch (_) {
    throw const MobileApiException(
      'No se pudo conectar con el servidor.',
      statusCode: 0,
    );
  }

  final Map<String, dynamic> data;
  try {
    data = jsonDecode(response.body) as Map<String, dynamic>;
  } catch (_) {
    throw MobileApiException(
      'Respuesta invalida del servidor.',
      statusCode: response.statusCode,
    );
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw MobileApiException(
      data['error'] as String? ?? 'No se pudo completar la solicitud.',
      statusCode: response.statusCode,
    );
  }

  return data;
}

Future<Map<String, dynamic>> deleteMobileApi(String path) async {
  final baseUrl = (mobileApiBaseUrlOverride ?? _mobileApiBaseUrl).trim();
  if (baseUrl.isEmpty) {
    throw const MobileApiException(
      'Servidor movil no configurado.',
      statusCode: 0,
    );
  }

  final normalizedBaseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');
  final uri = Uri.parse('$normalizedBaseUrl$path');
  http.Response response;

  try {
    response = await http.delete(uri).timeout(const Duration(seconds: 12));
  } catch (_) {
    throw const MobileApiException(
      'No se pudo conectar con el servidor.',
      statusCode: 0,
    );
  }

  final Map<String, dynamic> data;
  try {
    data = jsonDecode(response.body) as Map<String, dynamic>;
  } catch (_) {
    throw MobileApiException(
      'Respuesta invalida del servidor.',
      statusCode: response.statusCode,
    );
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw MobileApiException(
      data['error'] as String? ?? 'No se pudo completar la solicitud.',
      statusCode: response.statusCode,
    );
  }

  return data;
}

Future<Map<String, dynamic>> getMobileApi(
  String path, [
  Map<String, String>? query,
]) async {
  final baseUrl = (mobileApiBaseUrlOverride ?? _mobileApiBaseUrl).trim();
  if (baseUrl.isEmpty) {
    throw const MobileApiException(
      'Servidor movil no configurado.',
      statusCode: 0,
    );
  }

  final normalizedBaseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');
  final uri = Uri.parse(
    '$normalizedBaseUrl$path',
  ).replace(queryParameters: query);
  http.Response response;

  try {
    response = await http.get(uri).timeout(const Duration(seconds: 12));
  } catch (_) {
    throw const MobileApiException(
      'No se pudo conectar con el servidor.',
      statusCode: 0,
    );
  }

  final Map<String, dynamic> data;
  try {
    data = jsonDecode(response.body) as Map<String, dynamic>;
  } catch (_) {
    throw MobileApiException(
      'Respuesta invalida del servidor.',
      statusCode: response.statusCode,
    );
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw MobileApiException(
      data['error'] as String? ?? 'No se pudo completar la solicitud.',
      statusCode: response.statusCode,
    );
  }

  return data;
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppNotificationService.initialize();
  runApp(const MinimarketClientApp());
}

class MinimarketClientApp extends StatelessWidget {
  const MinimarketClientApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Minimarket IA Cliente',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.accent,
          brightness: Brightness.light,
        ),
        fontFamily: 'Arial',
        scaffoldBackgroundColor: AppColors.page,
        useMaterial3: true,
      ),
      home: const SessionBootstrapScreen(),
    );
  }
}

class MinimarketSplashScreen extends StatelessWidget {
  const MinimarketSplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.accent,
      body: Stack(
        children: [
          Center(
            child: Image.asset('assets/Logo2.png', width: 220, height: 220),
          ),
          const Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Center(
              child: SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: Color(0xFFFFD400),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SessionBootstrapScreen extends StatefulWidget {
  const SessionBootstrapScreen({super.key});

  @override
  State<SessionBootstrapScreen> createState() => _SessionBootstrapScreenState();
}

class _SessionBootstrapScreenState extends State<SessionBootstrapScreen> {
  @override
  void initState() {
    super.initState();
    unawaited(_restoreSession());
  }

  Future<void> _restoreSession() async {
    final preferences = await SharedPreferences.getInstance();
    final isActive = preferences.getBool(_sessionActiveKey) ?? false;

    final account = await loadStoredClientAccount();
    if (!mounted) {
      return;
    }

    if (!isActive || account == null || account.identity.trim().isEmpty) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => const ClientAccessScreen()),
      );
      return;
    }

    openAccountHome(context, account);
  }

  @override
  Widget build(BuildContext context) {
    return const MinimarketSplashScreen();
  }
}

void openAccountHome(BuildContext context, ClientAccount account) {
  unawaited(registerPushTokenForAccount(account));

  Widget screen;

  if (account.isAdmin) {
    screen = AdminDashboardScreen(account: account);
  } else if (account.source == 'admin_pending') {
    screen = ForcedPasswordChangeScreen(account: account);
  } else if (account.role == 'empleado') {
    screen = RoleDashboardScreen(account: account, role: 'empleado');
  } else if (account.role == 'delivery') {
    screen = RoleDashboardScreen(account: account, role: 'delivery');
  } else {
    screen = MainMenuScreen(account: account);
  }

  Navigator.of(
    context,
  ).pushReplacement(MaterialPageRoute<void>(builder: (_) => screen));
}

Future<void> registerPushTokenForAccount(ClientAccount account) async {
  if (kIsWeb || _disableNativeAuthForTesting) {
    return;
  }

  final token = await AppNotificationService.getFirebaseMessagingToken();
  if (token != null && token.isNotEmpty) {
    unawaited(_sendPushToken(account, token, isEnabled: true));
  }

  await _pushTokenRefreshSubscription?.cancel();
  _pushTokenRefreshSubscription = AppNotificationService
      .onFirebaseMessagingTokenRefresh
      .listen((newToken) {
        if (newToken.isEmpty) {
          return;
        }
        unawaited(_sendPushToken(account, newToken, isEnabled: true));
      });
}

Future<void> _sendPushToken(
  ClientAccount account,
  String token, {
  required bool isEnabled,
}) async {
  try {
    await postMobileApi('/api/mobile/push-token', {
      'token': token,
      'account_id': account.id,
      'identity_number': account.identity,
      'role': account.isAdmin ? 'admin' : account.role,
      'name': account.name,
      'platform': 'android',
      'is_enabled': isEnabled,
    });
  } catch (_) {}
}

Future<void> unregisterCurrentPushToken() async {
  await _pushTokenRefreshSubscription?.cancel();
  _pushTokenRefreshSubscription = null;

  if (kIsWeb || _disableNativeAuthForTesting) {
    return;
  }

  final token = await AppNotificationService.getFirebaseMessagingToken();
  if (token == null || token.isEmpty) {
    return;
  }

  try {
    await postMobileApi('/api/mobile/push-token', {
      'token': token,
      'is_enabled': false,
    });
  } catch (_) {}
}

Future<ClientAccount?> loadStoredClientAccount() async {
  if (_sessionClientAccount != null) {
    return _sessionClientAccount;
  }

  final secureAccount = await _readSecureStoredClientAccount();
  if (secureAccount != null) {
    _sessionClientAccount = secureAccount;
    return secureAccount;
  }

  final String? rawAccount;
  try {
    final preferences = await SharedPreferences.getInstance();
    rawAccount = preferences.getString(_storedClientAccountKey);
  } catch (_) {
    return null;
  }

  if (rawAccount == null || rawAccount.isEmpty) {
    return null;
  }

  try {
    final account = ClientAccount.fromJson(
      jsonDecode(rawAccount) as Map<String, dynamic>,
    );
    _sessionClientAccount = account;
    return account;
  } catch (_) {
    return null;
  }
}

Future<ClientAccount?> _readSecureStoredClientAccount() async {
  if (_disableNativeAuthForTesting) {
    return null;
  }

  try {
    final rawAccount = await _secureStorage.read(key: _secureClientAccountKey);
    if (rawAccount == null || rawAccount.isEmpty) {
      return null;
    }

    return ClientAccount.fromJson(
      jsonDecode(rawAccount) as Map<String, dynamic>,
    );
  } catch (_) {
    return null;
  }
}

Future<void> clearStoredClientAccount() async {
  await unregisterCurrentPushToken();
  _sessionClientAccount = null;

  if (!_disableNativeAuthForTesting) {
    try {
      await _secureStorage.delete(key: _secureClientAccountKey);
    } catch (_) {}
  }

  try {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_storedClientAccountKey);
  } catch (_) {}
}

Future<void> logoutToAccess(BuildContext context) async {
  await unregisterCurrentPushToken();
  _sessionClientAccount = null;

  try {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_sessionActiveKey, false);
  } catch (_) {}

  if (!context.mounted) {
    return;
  }

  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute<void>(builder: (_) => const ClientAccessScreen()),
    (route) => false,
  );
}

class AppColors {
  static const accent = Color(0xFFE2124B);
  static const accentDark = Color(0xFFC90D43);
  static const ink = Color(0xFF27101C);
  static const muted = Color(0xFF6E5F68);
  static const line = Color(0xFFF3C8D4);
  static const page = Color(0xFFFFF5F3);
  static const cream = Color(0xFFFFFAF4);
  static const warning = Color(0xFFFFE78E);
}

enum AuthMode { login, register }

class ClientAccessScreen extends StatefulWidget {
  const ClientAccessScreen({super.key});

  @override
  State<ClientAccessScreen> createState() => _ClientAccessScreenState();
}

class _ClientAccessScreenState extends State<ClientAccessScreen> {
  final _loginFormKey = GlobalKey<FormState>();
  final _registerFormKey = GlobalKey<FormState>();
  final _loginIdentityController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  final _nameController = TextEditingController();
  final _identityController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _passwordController = TextEditingController();

  AuthMode _mode = AuthMode.login;
  bool _loadingLocation = false;
  bool _showLoginPassword = false;
  bool _showRegisterPassword = false;
  bool _showForgotPassword = false;
  bool _biometricAvailable = false;
  bool _biometricLoading = false;
  String _loginMessage = '';
  bool _loginMessageIsSuccess = false;
  String _registerMessage = '';
  String _locationStatus = 'Puedes escribir tu direccion o usar GPS.';

  @override
  void initState() {
    super.initState();
    _loginIdentityController.addListener(_checkTemporaryPassword);
    unawaited(_prepareBiometricLogin());
  }

  @override
  void dispose() {
    _loginIdentityController.dispose();
    _loginPasswordController.dispose();
    _nameController.dispose();
    _identityController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _checkTemporaryPassword() async {
    final text = _loginIdentityController.text.trim();
    if (text.length >= 10 && _mode == AuthMode.login) {
      try {
        final response = await _postMobileApi(
          '/api/mobile/clients/password/check-temp',
          {'identity_number': text},
        );
        if (response['hasTemporaryPassword'] == true && mounted) {
          _loginPasswordController.text = text;
        }
      } catch (_) {}
    }
  }

  void _switchMode(AuthMode mode) {
    setState(() {
      _mode = mode;
      _loginMessage = '';
      _loginMessageIsSuccess = false;
      _registerMessage = '';
      _showForgotPassword = false;
    });
  }

  Future<void> _prepareBiometricLogin() async {
    final account = await _loadClientAccount();
    final available = account != null && await _hasBiometricSupport();

    if (!mounted) {
      return;
    }

    setState(() => _biometricAvailable = available);
  }

  Future<bool> _hasBiometricSupport() async {
    if (kIsWeb || _disableNativeAuthForTesting) {
      return false;
    }

    try {
      final auth = LocalAuthentication();
      final supported = await auth.isDeviceSupported();
      final canCheck = await auth.canCheckBiometrics;
      final biometrics = await auth.getAvailableBiometrics();
      return supported && canCheck && biometrics.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<void> _loginWithBiometrics() async {
    if (_biometricLoading) {
      return;
    }

    var keepLoading = false;

    setState(() {
      _biometricLoading = true;
      _loginMessage = '';
      _loginMessageIsSuccess = false;
      _showForgotPassword = false;
    });

    try {
      final account = await _loadClientAccount();
      if (account == null) {
        if (mounted) {
          setState(() {
            _biometricAvailable = false;
            _loginMessage =
                'Inicia sesion una vez con tu cedula y contrasena para activar la huella.';
          });
        }
        return;
      }

      final authenticated = await _authenticateWithDeviceBiometrics();
      if (!mounted || !authenticated) {
        return;
      }

      final remoteAccount = await _loginClientRemotely(
        account.identity,
        account.password,
      );
      await _saveClientAccountLocally(
        remoteAccount,
        showStorageFallbackNotice: false,
      );

      if (!mounted) {
        return;
      }

      keepLoading = true;
      _openWelcome(remoteAccount);
    } on MobileApiException catch (error) {
      if (error.statusCode == 0) {
        final account = await _loadClientAccount();
        if (account == null) {
          return;
        }
        keepLoading = true;
        _openWelcome(account);
        return;
      }

      if (mounted) {
        setState(() {
          _loginMessage = error.message;
          _showForgotPassword = error.statusCode == 401;
        });
      }
    } catch (_) {
      // Cancelar o cerrar el panel biometrico no debe mostrar errores.
    } finally {
      if (mounted && !keepLoading) {
        setState(() => _biometricLoading = false);
      }
    }
  }

  Future<bool> _authenticateWithDeviceBiometrics() async {
    if (_disableNativeAuthForTesting) {
      return false;
    }

    try {
      final auth = LocalAuthentication();
      return auth
          .authenticate(
            localizedReason: 'Valida tu huella para entrar a Minimarket IA.',
            biometricOnly: true,
            persistAcrossBackgrounding: false,
          )
          .timeout(
            const Duration(seconds: 20),
            onTimeout: () async {
              await auth.stopAuthentication();
              return false;
            },
          );
    } catch (_) {
      return false;
    }
  }

  Future<void> _loginClient() async {
    if (!_loginFormKey.currentState!.validate()) {
      return;
    }

    final account = await _loadClientAccount();
    final cedula = _loginIdentityController.text.trim();
    final password = _loginPasswordController.text;

    setState(() {
      _loginMessage = '';
      _loginMessageIsSuccess = false;
      _showForgotPassword = false;
    });

    try {
      final account = await _loginClientRemotely(cedula, password);
      await _saveClientAccountLocally(
        account,
        showStorageFallbackNotice: false,
      );

      if (!mounted) {
        return;
      }

      _openWelcome(account);
      return;
    } on MobileApiException catch (error) {
      if (error.statusCode == 401) {
        setState(() {
          _loginMessage = error.message;
          _loginMessageIsSuccess = false;
          _showForgotPassword = true;
        });
        return;
      }
    }

    if (account == null || account.identity != cedula) {
      setState(() {
        _loginMessage =
            'Cliente no registrado. Crea tu cuenta para ingresar al asistente.';
        _loginMessageIsSuccess = false;
        _showForgotPassword = false;
      });
      return;
    }

    if (account.password != password) {
      setState(() {
        _loginMessage = 'Contrasena incorrecta.';
        _loginMessageIsSuccess = false;
        _showForgotPassword = true;
      });
      return;
    }

    _openWelcome(account);
  }

  Future<void> _registerClient() async {
    setState(() => _registerMessage = '');

    if (!_registerFormKey.currentState!.validate()) {
      const message =
          'Revisa los campos marcados. La contrasena debe tener minimo 8 caracteres, una mayuscula y numeros.';
      setState(() => _registerMessage = message);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text(message)));
      return;
    }

    final account = ClientAccount(
      name: _nameController.text.trim(),
      identity: _identityController.text.trim(),
      email: _emailController.text.trim(),
      phone: _phoneController.text.trim(),
      address: _addressController.text.trim(),
      password: _passwordController.text,
    );
    var registeredAccount = account;

    try {
      registeredAccount = await _registerClientRemotely(account);
    } on MobileApiException catch (error) {
      if (error.statusCode == 409) {
        if (!mounted) {
          return;
        }
        setState(() => _registerMessage = error.message);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
        return;
      }

      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No se pudo conectar con el servidor. La cuenta quedo guardada solo en este dispositivo.',
          ),
        ),
      );
    }

    await _saveClientAccountLocally(registeredAccount);

    if (!mounted) {
      return;
    }

    _loginIdentityController.text = registeredAccount.identity;
    _loginPasswordController.clear();
    _openWelcome(registeredAccount);
  }

  void _openWelcome(ClientAccount account) {
    openAccountHome(context, account);
  }

  Future<ClientAccount?> _loadClientAccount() async {
    return loadStoredClientAccount();
  }

  Future<void> _saveClientAccountLocally(
    ClientAccount account, {
    bool showStorageFallbackNotice = true,
  }) async {
    _sessionClientAccount = account;
    var secureSaved = false;

    if (!_disableNativeAuthForTesting) {
      try {
        await _secureStorage.write(
          key: _secureClientAccountKey,
          value: jsonEncode(account),
        );
        secureSaved = true;
      } catch (_) {
        secureSaved = false;
      }
    }

    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setBool(_sessionActiveKey, true);
      if (secureSaved) {
        await preferences.remove(_storedClientAccountKey);
      } else {
        await preferences.setString(
          _storedClientAccountKey,
          jsonEncode(account),
        );
      }
    } catch (_) {
      if (secureSaved || !mounted || !showStorageFallbackNotice) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Cuenta creada para esta sesion. El navegador no permitio guardarla permanente.',
          ),
        ),
      );
    }

    if (mounted) {
      unawaited(_prepareBiometricLogin());
    }
  }

  Future<ClientAccount> _registerClientRemotely(ClientAccount account) async {
    final response = await _postMobileApi('/api/mobile/clients/register', {
      'full_name': account.name,
      'identity_number': account.identity,
      'email': account.email,
      'phone': account.phone,
      'address': account.address,
      'password': account.password,
    });

    return ClientAccount.fromServerJson(
      response['client'] as Map<String, dynamic>,
      password: account.password,
    );
  }

  Future<ClientAccount> _loginClientRemotely(
    String identity,
    String password,
  ) async {
    try {
      final adminResponse = await _postMobileApi('/api/admin/login', {
        'cedula': identity,
        'password': password,
      });

      if (adminResponse['ok'] == true && adminResponse['role'] == 'admin') {
        return ClientAccount.fromServerJson({
          'full_name': 'Administrador',
          'identity_number': identity,
          'role': 'admin',
        }, password: password);
      }
    } catch (_) {
      // If admin login fails, proceed with client login
    }

    final response = await _postMobileApi('/api/mobile/clients/login', {
      'identity_number': identity,
      'password': password,
    });

    return ClientAccount.fromServerJson(
      response['client'] as Map<String, dynamic>,
      password: password,
    );
  }

  Future<Map<String, dynamic>> _postMobileApi(
    String path,
    Map<String, String> payload,
  ) async {
    return postMobileApi(path, payload);
  }

  Future<void> _fillAddressFromGps() async {
    setState(() {
      _loadingLocation = true;
      _locationStatus = 'Buscando tu ubicacion...';
    });

    try {
      final address = await resolveCurrentAddressFromGps();

      setState(() {
        _addressController.text = address;
        _locationStatus = 'Direccion tomada desde GPS con OpenStreetMap.';
      });
    } on LocationException catch (error) {
      setState(() => _locationStatus = error.message);
    } catch (_) {
      setState(() {
        _locationStatus =
            'No se pudo obtener la direccion. Puedes escribirla manualmente.';
      });
    } finally {
      if (mounted) {
        setState(() => _loadingLocation = false);
      }
    }
  }

  void _openPasswordRecovery() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PasswordRecoveryScreen(
          initialIdentifier: _loginIdentityController.text.trim(),
          onLookup: _lookupPasswordRecovery,
          onSend: _sendPasswordRecoveryLink,
        ),
      ),
    );
  }

  Future<PasswordRecoveryLookup> _lookupPasswordRecovery(
    String identifier,
  ) async {
    final response = await _postMobileApi(
      '/api/mobile/clients/password/lookup',
      {'identifier': identifier},
    );

    return PasswordRecoveryLookup(
      exists: response['exists'] == true,
      email: response['email'] as String?,
    );
  }

  Future<String> _sendPasswordRecoveryLink(String identifier) async {
    final response = await _postMobileApi(
      '/api/mobile/clients/password/recovery',
      {'identifier': identifier},
    );

    return response['message'] as String? ??
        'Te enviamos un enlace de recuperacion al correo registrado.';
  }

  @override
  Widget build(BuildContext context) {
    if (_biometricLoading) {
      return const MinimarketSplashScreen();
    }

    final isLogin = _mode == AuthMode.login;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 860;
            final isCompactLogin = !isWide && isLogin;
            final cardRadius = isCompactLogin ? 16.0 : 18.0;

            return Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFFFFF0D5),
                    Color(0xFFFFF9F5),
                    Color(0xFFFFD6E2),
                  ],
                ),
              ),
              child: Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(isCompactLogin ? 12 : 18),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: isCompactLogin ? 430 : 980,
                    ),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(cardRadius),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.accent.withValues(alpha: 0.12),
                            blurRadius: 36,
                            offset: const Offset(0, 20),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(cardRadius),
                        child: isWide
                            ? IntrinsicHeight(
                                child: Row(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Expanded(child: _PromoPanel(mode: _mode)),
                                    Expanded(
                                      child: isLogin
                                          ? _LoginPanel(
                                              formKey: _loginFormKey,
                                              identityController:
                                                  _loginIdentityController,
                                              passwordController:
                                                  _loginPasswordController,
                                              showPassword: _showLoginPassword,
                                              message: _loginMessage,
                                              messageIsSuccess:
                                                  _loginMessageIsSuccess,
                                              showForgotPassword:
                                                  _showForgotPassword,
                                              canUseBiometric:
                                                  _biometricAvailable,
                                              biometricLoading:
                                                  _biometricLoading,
                                              onTogglePassword: () => setState(
                                                () => _showLoginPassword =
                                                    !_showLoginPassword,
                                              ),
                                              onSubmit: _loginClient,
                                              onBiometricLogin:
                                                  _loginWithBiometrics,
                                              onRegister: () => _switchMode(
                                                AuthMode.register,
                                              ),
                                              onForgotPassword:
                                                  _openPasswordRecovery,
                                            )
                                          : _RegisterPanel(
                                              formKey: _registerFormKey,
                                              nameController: _nameController,
                                              identityController:
                                                  _identityController,
                                              emailController: _emailController,
                                              phoneController: _phoneController,
                                              addressController:
                                                  _addressController,
                                              passwordController:
                                                  _passwordController,
                                              showPassword:
                                                  _showRegisterPassword,
                                              loadingLocation: _loadingLocation,
                                              locationStatus: _locationStatus,
                                              message: _registerMessage,
                                              onTogglePassword: () => setState(
                                                () => _showRegisterPassword =
                                                    !_showRegisterPassword,
                                              ),
                                              onUseGps: _fillAddressFromGps,
                                              onSubmit: _registerClient,
                                              onLogin: () =>
                                                  _switchMode(AuthMode.login),
                                            ),
                                    ),
                                  ],
                                ),
                              )
                            : Column(
                                children: [
                                  _PromoPanel(
                                    mode: _mode,
                                    compact: true,
                                    dense: isCompactLogin,
                                  ),
                                  isLogin
                                      ? _LoginPanel(
                                          compact: isCompactLogin,
                                          formKey: _loginFormKey,
                                          identityController:
                                              _loginIdentityController,
                                          passwordController:
                                              _loginPasswordController,
                                          showPassword: _showLoginPassword,
                                          message: _loginMessage,
                                          messageIsSuccess:
                                              _loginMessageIsSuccess,
                                          showForgotPassword:
                                              _showForgotPassword,
                                          canUseBiometric: _biometricAvailable,
                                          biometricLoading: _biometricLoading,
                                          onTogglePassword: () => setState(
                                            () => _showLoginPassword =
                                                !_showLoginPassword,
                                          ),
                                          onSubmit: _loginClient,
                                          onBiometricLogin:
                                              _loginWithBiometrics,
                                          onRegister: () =>
                                              _switchMode(AuthMode.register),
                                          onForgotPassword:
                                              _openPasswordRecovery,
                                        )
                                      : _RegisterPanel(
                                          formKey: _registerFormKey,
                                          nameController: _nameController,
                                          identityController:
                                              _identityController,
                                          emailController: _emailController,
                                          phoneController: _phoneController,
                                          addressController: _addressController,
                                          passwordController:
                                              _passwordController,
                                          showPassword: _showRegisterPassword,
                                          loadingLocation: _loadingLocation,
                                          locationStatus: _locationStatus,
                                          message: _registerMessage,
                                          onTogglePassword: () => setState(
                                            () => _showRegisterPassword =
                                                !_showRegisterPassword,
                                          ),
                                          onUseGps: _fillAddressFromGps,
                                          onSubmit: _registerClient,
                                          onLogin: () =>
                                              _switchMode(AuthMode.login),
                                        ),
                                ],
                              ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _PromoPanel extends StatelessWidget {
  const _PromoPanel({
    required this.mode,
    this.compact = false,
    this.dense = false,
  });

  final AuthMode mode;
  final bool compact;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final denseLayout = compact && dense;
    final title = mode == AuthMode.login
        ? 'Asistente de compras'
        : compact
        ? 'Cuenta cliente'
        : 'Registro de cliente';
    final copy = mode == AuthMode.login
        ? 'Ingresa para comprar y consultar productos desde el chat inteligente.'
        : 'Compra y consulta productos desde el asistente inteligente.';
    final iconSize = denseLayout ? 48.0 : 76.0;

    return Container(
      width: double.infinity,
      padding: denseLayout
          ? const EdgeInsets.fromLTRB(20, 18, 20, 18)
          : EdgeInsets.all(compact ? 28 : 46),
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(-0.68, -0.42),
          radius: 1.2,
          colors: [Color(0xFFFF7B22), Color(0xFFE2124B), Color(0xFFC30842)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            height: iconSize,
            width: iconSize,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              border: Border.all(color: Colors.white.withValues(alpha: 0.32)),
              borderRadius: BorderRadius.circular(denseLayout ? 15 : 22),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(denseLayout ? 15 : 22),
              child: Image.asset('assets/Logo2.png', fit: BoxFit.cover),
            ),
          ),
          SizedBox(
            height: denseLayout
                ? 10
                : compact
                ? 22
                : 34,
          ),
          Text(
            'Minimarket Vallolet',
            style: TextStyle(
              color: Colors.white70,
              fontSize: denseLayout ? 11 : 14,
              fontWeight: FontWeight.w900,
              letterSpacing: denseLayout ? 1.4 : 2,
            ),
          ),
          SizedBox(height: denseLayout ? 5 : 8),
          Text(
            title,
            maxLines: denseLayout ? 2 : null,
            overflow: denseLayout ? TextOverflow.ellipsis : null,
            style: TextStyle(
              color: Colors.white,
              fontSize: denseLayout ? 27 : 42,
              fontWeight: FontWeight.w900,
              height: 0.98,
            ),
          ),
          SizedBox(height: denseLayout ? 8 : 14),
          Text(
            copy,
            maxLines: denseLayout ? 2 : null,
            overflow: denseLayout ? TextOverflow.ellipsis : null,
            style: TextStyle(
              color: Colors.white,
              fontSize: denseLayout ? 12 : 15,
              fontWeight: FontWeight.w600,
              height: denseLayout ? 1.32 : 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginPanel extends StatelessWidget {
  const _LoginPanel({
    this.compact = false,
    required this.formKey,
    required this.identityController,
    required this.passwordController,
    required this.showPassword,
    required this.message,
    required this.messageIsSuccess,
    required this.showForgotPassword,
    required this.canUseBiometric,
    required this.biometricLoading,
    required this.onTogglePassword,
    required this.onSubmit,
    required this.onBiometricLogin,
    required this.onRegister,
    required this.onForgotPassword,
  });

  final bool compact;
  final GlobalKey<FormState> formKey;
  final TextEditingController identityController;
  final TextEditingController passwordController;
  final bool showPassword;
  final String message;
  final bool messageIsSuccess;
  final bool showForgotPassword;
  final bool canUseBiometric;
  final bool biometricLoading;
  final VoidCallback onTogglePassword;
  final VoidCallback onSubmit;
  final VoidCallback onBiometricLogin;
  final VoidCallback onRegister;
  final VoidCallback onForgotPassword;

  @override
  Widget build(BuildContext context) {
    final messageBackground = messageIsSuccess
        ? const Color(0xFFEAF8EF)
        : const Color(0xFFFFEEF2);
    final messageBorder = messageIsSuccess
        ? const Color(0xFFB8E3C7)
        : AppColors.line;
    final messageColor = messageIsSuccess
        ? const Color(0xFF207544)
        : AppColors.accentDark;

    return Padding(
      padding: compact
          ? const EdgeInsets.fromLTRB(22, 20, 22, 18)
          : const EdgeInsets.all(30),
      child: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Badge(icon: Icons.login_rounded, label: 'Acceso cliente'),
            SizedBox(height: compact ? 10 : 16),
            Text(
              'Iniciar sesion',
              style: TextStyle(
                color: AppColors.ink,
                fontSize: compact ? 34 : 44,
                fontWeight: FontWeight.w900,
                height: 0.95,
              ),
            ),
            SizedBox(height: compact ? 7 : 10),
            Text(
              'Entra con tu cedula y contrasena para abrir el asistente.',
              style: TextStyle(
                color: AppColors.muted,
                fontSize: compact ? 13 : 14,
                height: compact ? 1.35 : 1.5,
              ),
            ),
            SizedBox(height: compact ? 16 : 24),
            ClientTextField(
              compact: compact,
              controller: identityController,
              label: 'Cedula',
              icon: Icons.badge_rounded,
              keyboardType: TextInputType.number,
              validator: _identityValidator,
            ),
            SizedBox(height: compact ? 10 : 14),
            ClientTextField(
              compact: compact,
              controller: passwordController,
              label: 'Contrasena',
              icon: Icons.lock_rounded,
              obscureText: !showPassword,
              validator: _loginPasswordValidator,
              suffix: IconButton(
                onPressed: onTogglePassword,
                icon: Icon(
                  showPassword
                      ? Icons.visibility_off_rounded
                      : Icons.visibility_rounded,
                ),
              ),
            ),
            if (message.isNotEmpty) ...[
              SizedBox(height: compact ? 10 : 14),
              Container(
                padding: EdgeInsets.all(compact ? 11 : 13),
                decoration: BoxDecoration(
                  color: messageBackground,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: messageBorder),
                ),
                child: Text(
                  message,
                  style: TextStyle(
                    color: messageColor,
                    fontSize: compact ? 12.5 : 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
            if (showForgotPassword)
              Align(
                alignment: compact ? Alignment.center : Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onForgotPassword,
                  icon: const Icon(Icons.lock_reset_rounded),
                  label: const Text('Olvidaste tu contrasena?'),
                ),
              ),
            SizedBox(height: compact ? 10 : 22),
            SizedBox(
              height: compact ? 50 : 54,
              child: FilledButton.icon(
                onPressed: onSubmit,
                icon: const Icon(Icons.arrow_forward_rounded),
                label: Text(
                  'Entrar',
                  style: TextStyle(
                    fontSize: compact ? 15 : 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 12,
                  shadowColor: AppColors.accent.withValues(alpha: 0.35),
                ),
              ),
            ),
            if (canUseBiometric) ...[
              SizedBox(height: compact ? 9 : 12),
              SizedBox(
                height: compact ? 46 : 50,
                child: OutlinedButton.icon(
                  onPressed: biometricLoading ? null : onBiometricLogin,
                  icon: biometricLoading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.fingerprint_rounded),
                  label: Text(
                    biometricLoading
                        ? 'Validando huella...'
                        : 'Entrar con huella',
                    style: TextStyle(
                      fontSize: compact ? 14 : 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.accentDark,
                    side: const BorderSide(color: AppColors.line),
                    backgroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
            SizedBox(height: compact ? 12 : 18),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  'No tienes cuenta?',
                  style: TextStyle(
                    color: AppColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                TextButton(
                  onPressed: onRegister,
                  child: const Text('Registrarse'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RegisterPanel extends StatelessWidget {
  const _RegisterPanel({
    required this.formKey,
    required this.nameController,
    required this.identityController,
    required this.emailController,
    required this.phoneController,
    required this.addressController,
    required this.passwordController,
    required this.showPassword,
    required this.loadingLocation,
    required this.locationStatus,
    required this.message,
    required this.onTogglePassword,
    required this.onUseGps,
    required this.onSubmit,
    required this.onLogin,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController nameController;
  final TextEditingController identityController;
  final TextEditingController emailController;
  final TextEditingController phoneController;
  final TextEditingController addressController;
  final TextEditingController passwordController;
  final bool showPassword;
  final bool loadingLocation;
  final String locationStatus;
  final String message;
  final VoidCallback onTogglePassword;
  final VoidCallback onUseGps;
  final VoidCallback onSubmit;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(30),
      child: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Badge(icon: Icons.person_add_alt_1, label: 'Crear cliente'),
            const SizedBox(height: 16),
            const Text(
              'Crear cuenta',
              style: TextStyle(
                color: AppColors.ink,
                fontSize: 44,
                fontWeight: FontWeight.w900,
                height: 0.95,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Registra tus datos para entrar al asistente de compras.',
              style: TextStyle(
                color: AppColors.muted,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            if (message.isNotEmpty) ...[
              _InlineNotice(message: message),
              const SizedBox(height: 16),
            ],
            ClientTextField(
              controller: nameController,
              label: 'Nombre completo',
              icon: Icons.person_rounded,
              validator: _required,
            ),
            const SizedBox(height: 14),
            ClientTextField(
              controller: identityController,
              label: 'Cedula',
              icon: Icons.badge_rounded,
              keyboardType: TextInputType.number,
              validator: _identityValidator,
            ),
            const SizedBox(height: 14),
            ClientTextField(
              controller: emailController,
              label: 'Correo electronico',
              helper: 'No enviaremos correos por ahora.',
              icon: Icons.mail_rounded,
              keyboardType: TextInputType.emailAddress,
              validator: _emailValidator,
            ),
            const SizedBox(height: 14),
            ClientTextField(
              controller: phoneController,
              label: 'Telefono',
              icon: Icons.phone_rounded,
              keyboardType: TextInputType.phone,
              validator: _phoneValidator,
            ),
            const SizedBox(height: 14),
            ClientTextField(
              controller: addressController,
              label: 'Direccion principal',
              icon: Icons.location_on_rounded,
              maxLines: 2,
              validator: _required,
              suffix: FilledButton.icon(
                onPressed: loadingLocation ? null : onUseGps,
                icon: loadingLocation
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.my_location_rounded, size: 18),
                label: const Text('GPS'),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 7, left: 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    locationStatus,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  const Text(
                    'Datos de ubicacion: OpenStreetMap/Nominatim.',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            ClientTextField(
              controller: passwordController,
              label: 'Contrasena',
              icon: Icons.lock_rounded,
              obscureText: !showPassword,
              validator: _strongPasswordValidator,
              suffix: IconButton(
                onPressed: onTogglePassword,
                icon: Icon(
                  showPassword
                      ? Icons.visibility_off_rounded
                      : Icons.visibility_rounded,
                ),
              ),
            ),
            const SizedBox(height: 10),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: passwordController,
              builder: (context, value, child) {
                return _PasswordStrengthMeter(password: value.text);
              },
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 54,
              child: FilledButton.icon(
                onPressed: onSubmit,
                icon: const Icon(Icons.arrow_forward_rounded),
                label: const Text(
                  'Registrarme',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 12,
                  shadowColor: AppColors.accent.withValues(alpha: 0.35),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  'Ya tienes cuenta?',
                  style: TextStyle(
                    color: AppColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                TextButton(
                  onPressed: onLogin,
                  child: const Text('Iniciar sesion'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

enum _RecoveryLookupStatus { idle, checking, found, notFound, error, sent }

class PasswordRecoveryScreen extends StatefulWidget {
  const PasswordRecoveryScreen({
    required this.initialIdentifier,
    required this.onLookup,
    required this.onSend,
    super.key,
  });

  final String initialIdentifier;
  final Future<PasswordRecoveryLookup> Function(String identifier) onLookup;
  final Future<String> Function(String identifier) onSend;

  @override
  State<PasswordRecoveryScreen> createState() => _PasswordRecoveryScreenState();
}

class _PasswordRecoveryScreenState extends State<PasswordRecoveryScreen> {
  final _identifierController = TextEditingController();
  Timer? _lookupDebounce;
  int _lookupRun = 0;
  _RecoveryLookupStatus _status = _RecoveryLookupStatus.idle;
  String _message =
      'Escribe tu cedula o correo para buscar tu cuenta registrada.';
  String? _maskedEmail;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _identifierController.text = widget.initialIdentifier;
    _identifierController.addListener(_queueLookup);
    if (widget.initialIdentifier.trim().isNotEmpty) {
      _queueLookup();
    }
  }

  @override
  void dispose() {
    _lookupDebounce?.cancel();
    _identifierController.dispose();
    super.dispose();
  }

  void _queueLookup() {
    final identifier = _identifierController.text.trim();
    _lookupDebounce?.cancel();
    _lookupRun += 1;

    if (identifier.length < 4) {
      setState(() {
        _status = _RecoveryLookupStatus.idle;
        _maskedEmail = null;
        _message =
            'Escribe tu cedula o correo para buscar tu cuenta registrada.';
      });
      return;
    }

    setState(() {
      _status = _RecoveryLookupStatus.checking;
      _maskedEmail = null;
      _message = 'Buscando cuenta...';
    });

    final run = _lookupRun;
    _lookupDebounce = Timer(
      const Duration(milliseconds: 450),
      () => _lookupIdentifier(identifier, run),
    );
  }

  Future<void> _lookupIdentifier(String identifier, int run) async {
    try {
      final result = await widget.onLookup(identifier);

      if (!mounted || run != _lookupRun) {
        return;
      }

      setState(() {
        if (result.exists) {
          _status = _RecoveryLookupStatus.found;
          _maskedEmail = result.email;
          _message =
              'Cuenta encontrada. Podemos enviar el enlace a ${result.email ?? 'tu correo registrado'}.';
        } else {
          _status = _RecoveryLookupStatus.notFound;
          _maskedEmail = null;
          _message = 'No encontramos una cuenta con esa cedula o correo.';
        }
      });
    } on MobileApiException catch (error) {
      if (!mounted || run != _lookupRun) {
        return;
      }

      setState(() {
        _status = _RecoveryLookupStatus.error;
        _maskedEmail = null;
        _message = error.message;
      });
    }
  }

  Future<void> _sendRecoveryLink() async {
    final identifier = _identifierController.text.trim();
    if (_status != _RecoveryLookupStatus.found || identifier.isEmpty) {
      return;
    }

    setState(() {
      _sending = true;
      _message = 'Enviando enlace de recuperacion...';
    });

    try {
      final message = await widget.onSend(identifier);

      if (!mounted) {
        return;
      }

      setState(() {
        _status = _RecoveryLookupStatus.sent;
        _message = message;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } on MobileApiException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _status = _RecoveryLookupStatus.error;
        _message = error.message;
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSend = _status == _RecoveryLookupStatus.found && !_sending;

    return Scaffold(
      body: SafeArea(
        child: Container(
          width: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFFFF0D5), Color(0xFFFFF9F5), Color(0xFFFFD6E2)],
            ),
          ),
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(18),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.accent.withValues(alpha: 0.12),
                        blurRadius: 34,
                        offset: const Offset(0, 18),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Align(
                          alignment: Alignment.centerLeft,
                          child: IconButton.filledTonal(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.arrow_back_rounded),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const _Badge(
                          icon: Icons.lock_reset_rounded,
                          label: 'Recuperacion',
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'Recuperar contrasena',
                          style: TextStyle(
                            color: AppColors.ink,
                            fontSize: 34,
                            fontWeight: FontWeight.w900,
                            height: 0.98,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Busca tu cuenta con la cedula o el correo registrado.',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 13,
                            height: 1.42,
                          ),
                        ),
                        const SizedBox(height: 20),
                        ClientTextField(
                          controller: _identifierController,
                          label: 'Cedula o correo',
                          icon: Icons.manage_search_rounded,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 14),
                        _RecoveryStatusNotice(
                          status: _status,
                          message: _message,
                        ),
                        if (_status == _RecoveryLookupStatus.found &&
                            _maskedEmail != null) ...[
                          const SizedBox(height: 10),
                          Text(
                            'Correo: $_maskedEmail',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                        if (_status == _RecoveryLookupStatus.found ||
                            _sending) ...[
                          const SizedBox(height: 18),
                          SizedBox(
                            height: 58,
                            child: FilledButton(
                              onPressed: canSend ? _sendRecoveryLink : null,
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.accent,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor: AppColors.accent
                                    .withValues(alpha: 0.5),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _sending
                                      ? const SizedBox(
                                          height: 17,
                                          width: 17,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.mark_email_read_rounded,
                                        ),
                                  const SizedBox(width: 8),
                                  const Flexible(
                                    child: Text(
                                      'Enviar enlace de recuperacion al correo',
                                      textAlign: TextAlign.center,
                                      maxLines: 2,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w900,
                                        height: 1.1,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RecoveryStatusNotice extends StatelessWidget {
  const _RecoveryStatusNotice({required this.status, required this.message});

  final _RecoveryLookupStatus status;
  final String message;

  @override
  Widget build(BuildContext context) {
    final isPositive =
        status == _RecoveryLookupStatus.found ||
        status == _RecoveryLookupStatus.sent;
    final isNegative =
        status == _RecoveryLookupStatus.notFound ||
        status == _RecoveryLookupStatus.error;
    final background = isPositive
        ? const Color(0xFFEAF8EF)
        : isNegative
        ? const Color(0xFFFFEEF2)
        : const Color(0xFFFFF7E0);
    final border = isPositive
        ? const Color(0xFFB8E3C7)
        : isNegative
        ? AppColors.line
        : const Color(0xFFFFE7A8);
    final color = isPositive
        ? const Color(0xFF207544)
        : isNegative
        ? AppColors.accentDark
        : const Color(0xFF7A5100);
    final icon = status == _RecoveryLookupStatus.checking
        ? null
        : isPositive
        ? Icons.check_circle_rounded
        : isNegative
        ? Icons.error_outline_rounded
        : Icons.info_outline_rounded;

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (status == _RecoveryLookupStatus.checking)
            const SizedBox(
              height: 18,
              width: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(icon, color: color, size: 19),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: color,
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ForcedPasswordChangeScreen extends StatefulWidget {
  const ForcedPasswordChangeScreen({required this.account, super.key});

  final ClientAccount account;

  @override
  State<ForcedPasswordChangeScreen> createState() =>
      _ForcedPasswordChangeScreenState();
}

class _ForcedPasswordChangeScreenState
    extends State<ForcedPasswordChangeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _showPassword = false;
  bool _saving = false;
  String _message = '';

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordController.text != _confirmController.text) {
      setState(() => _message = 'Las contrasenas no coinciden.');
      return;
    }

    setState(() {
      _saving = true;
      _message = '';
    });

    try {
      final response =
          await postMobileApi('/api/mobile/clients/password/change', {
            'identity_number': widget.account.identity,
            'current_password': widget.account.password,
            'new_password': _passwordController.text,
          });

      final updatedAccount = ClientAccount.fromServerJson(
        response['client'] as Map<String, dynamic>,
        password: _passwordController.text,
      );

      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(
        _storedClientAccountKey,
        jsonEncode(updatedAccount.toJson()),
      );

      if (!mounted) return;
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (!mounted) {
          return;
        }

        if (updatedAccount.role == 'empleado') {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute<void>(
              builder: (_) => RoleDashboardScreen(
                account: updatedAccount,
                role: 'empleado',
              ),
            ),
          );
        } else if (updatedAccount.role == 'delivery') {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute<void>(
              builder: (_) => RoleDashboardScreen(
                account: updatedAccount,
                role: 'delivery',
              ),
            ),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute<void>(
              builder: (_) => MainMenuScreen(account: updatedAccount),
            ),
          );
        }
      });
    } on MobileApiException catch (error) {
      setState(() {
        _saving = false;
        _message = error.message;
      });
    } catch (_) {
      setState(() {
        _saving = false;
        _message = 'No se pudo cambiar la contrasena.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Actualiza tu contrasena',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        backgroundColor: Colors.white,
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.security_rounded,
                  size: 64,
                  color: AppColors.accent,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Por seguridad, debes cambiar la contrasena predeterminada antes de continuar.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.ink,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                if (_message.isNotEmpty) ...[
                  _InlineNotice(message: _message),
                  const SizedBox(height: 24),
                ],
                ClientTextField(
                  controller: _passwordController,
                  label: 'Nueva contrasena',
                  icon: Icons.lock_rounded,
                  obscureText: !_showPassword,
                  validator: _strongPasswordValidator,
                  suffix: IconButton(
                    onPressed: () =>
                        setState(() => _showPassword = !_showPassword),
                    icon: Icon(
                      _showPassword
                          ? Icons.visibility_off_rounded
                          : Icons.visibility_rounded,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ValueListenableBuilder<TextEditingValue>(
                  valueListenable: _passwordController,
                  builder: (context, value, child) {
                    return _PasswordStrengthMeter(password: value.text);
                  },
                ),
                const SizedBox(height: 16),
                ClientTextField(
                  controller: _confirmController,
                  label: 'Confirmar contrasena',
                  icon: Icons.lock_outline_rounded,
                  obscureText: !_showPassword,
                  validator: (value) => value == null || value.isEmpty
                      ? 'Confirma tu contrasena.'
                      : null,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  height: 54,
                  child: FilledButton.icon(
                    onPressed: _saving ? null : _changePassword,
                    icon: _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.check_rounded),
                    label: Text(
                      _saving ? 'Guardando...' : 'Cambiar contrasena',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ClientTextField extends StatefulWidget {
  const ClientTextField({
    required this.controller,
    required this.label,
    this.compact = false,
    this.icon,
    this.helper,
    this.keyboardType,
    this.obscureText = false,
    this.maxLines = 1,
    this.validator,
    this.suffix,
    super.key,
  });

  final TextEditingController controller;
  final String label;
  final bool compact;
  final IconData? icon;
  final String? helper;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int maxLines;
  final String? Function(String?)? validator;
  final Widget? suffix;

  @override
  State<ClientTextField> createState() => _ClientTextFieldState();
}

class _ClientTextFieldState extends State<ClientTextField> {
  late final FocusNode _focusNode;
  bool _touched = false;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    if (!_focusNode.hasFocus && !_touched) {
      setState(() {
        _touched = true;
      });
    }
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      focusNode: _focusNode,
      controller: widget.controller,
      keyboardType: widget.keyboardType,
      maxLines: widget.obscureText ? 1 : widget.maxLines,
      obscureText: widget.obscureText,
      validator: widget.validator,
      autovalidateMode: _touched
          ? AutovalidateMode.onUserInteraction
          : AutovalidateMode.disabled,
      style: const TextStyle(
        color: AppColors.ink,
        fontSize: 15,
        fontWeight: FontWeight.w700,
      ),
      decoration: InputDecoration(
        helperText: widget.helper,
        labelText: widget.label,
        prefixIcon: widget.icon == null ? null : Icon(widget.icon),
        suffixIcon: widget.suffix == null
            ? null
            : Padding(
                padding: const EdgeInsets.only(right: 8),
                child: widget.suffix,
              ),
        suffixIconConstraints: const BoxConstraints(
          minHeight: 46,
          minWidth: 74,
        ),
        filled: true,
        fillColor: AppColors.cream,
        contentPadding: EdgeInsets.symmetric(
          horizontal: 16,
          vertical: widget.compact ? 13 : 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.accent),
        ),
      ),
    );
  }
}

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({required this.account, super.key});

  final ClientAccount account;

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with WidgetsBindingObserver {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  final List<CartItem> _cart = [];
  final List<TransferAccount> _transferAccounts = [];
  String _deliveryAddress = '';
  Position? _deliveryPosition;
  String _deliveryMethod = 'domicilio';
  String _paymentMethod = 'efectivo';
  String? _transferReceiptUrl;
  String? _selectedTransferAccountId;
  bool _uploadingReceipt = false;
  bool _needsChange = false;
  String _changeAmount = '';
  bool _sending = false;
  bool _loadingCheckoutAddress = false;
  bool _creatingOrder = false;
  String? _activeOrderId;
  Timer? _deliveryCheckTimer;
  Timer? _transferAccountsTimer;
  VoidCallback? _refreshCheckoutSheet;
  bool _loadingTransferAccounts = false;
  bool _hasAskedDeliveryConfirmation = false;
  bool _hasAskedReadyForPickupConfirmation = false;
  bool _hasWarnedDeliveryFailed = false;
  bool _hasWarnedDeliveryConfirmed = false;
  ChatProduct? _guidedProduct;
  ChatPresentation? _guidedPresentation;
  String _guidedStep = '';

  static const _transferPaymentRejectedChatText =
      'Su pedido fue cancelado por la Administracion por el motivo que su comprobante de pago no pudo ser validado, Porfavor verifique su comprobante de pago y solicite el pedido nuevamente';

  String get _chatPrefsKey =>
      'minimarket_chat_history_${widget.account.identity}';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _deliveryAddress = widget.account.address;
    _loadChatHistory();
    _loadTransferAccounts();
    _startTransferAccountsRealtimeSync();
  }

  void _startTransferAccountsRealtimeSync() {
    _transferAccountsTimer?.cancel();
    _transferAccountsTimer = Timer.periodic(
      const Duration(seconds: 8),
      (_) => _loadTransferAccounts(),
    );
  }

  Future<void> _loadTransferAccounts() async {
    if (_loadingTransferAccounts) {
      return;
    }

    _loadingTransferAccounts = true;
    try {
      final response = await getMobileApi('/api/mobile/transfer-accounts');
      final accounts = TransferAccount.listFromJson(
        response['accounts'],
      ).where((account) => account.isEnabled).toList(growable: false);
      if (!mounted) {
        return;
      }

      if (!_areSameTransferAccounts(_transferAccounts, accounts)) {
        final previousSelectedId = _selectedTransferAccountId;
        final nextSelectedId =
            accounts.any((account) => account.id == previousSelectedId)
            ? previousSelectedId
            : accounts.isNotEmpty
            ? accounts.first.id
            : null;
        setState(() {
          _transferAccounts
            ..clear()
            ..addAll(accounts);
          _selectedTransferAccountId = nextSelectedId;
          if (_paymentMethod == 'transferencia' &&
              (accounts.isEmpty || previousSelectedId != nextSelectedId)) {
            _transferReceiptUrl = null;
          }
        });
        _refreshCheckoutIfOpen();
      }
    } catch (_) {
    } finally {
      _loadingTransferAccounts = false;
    }
  }

  bool _areSameTransferAccounts(
    List<TransferAccount> current,
    List<TransferAccount> next,
  ) {
    if (current.length != next.length) {
      return false;
    }

    for (var index = 0; index < current.length; index += 1) {
      final first = current[index];
      final second = next[index];
      if (first.id != second.id ||
          first.bankName != second.bankName ||
          first.holderName != second.holderName ||
          first.identityNumber != second.identityNumber ||
          first.accountNumber != second.accountNumber ||
          first.email != second.email ||
          first.isEnabled != second.isEnabled) {
        return false;
      }
    }

    return true;
  }

  void _refreshCheckoutIfOpen() {
    final refresh = _refreshCheckoutSheet;
    if (refresh != null) {
      refresh();
    }
  }

  TransferAccount? get _selectedTransferAccount {
    final selectedId = _selectedTransferAccountId;
    if (selectedId == null || selectedId.isEmpty) {
      return _transferAccounts.isNotEmpty ? _transferAccounts.first : null;
    }

    for (final account in _transferAccounts) {
      if (account.id == selectedId) {
        return account;
      }
    }

    return _transferAccounts.isNotEmpty ? _transferAccounts.first : null;
  }

  void _selectTransferAccount(String accountId) {
    if (_selectedTransferAccountId == accountId) {
      return;
    }

    setState(() {
      _selectedTransferAccountId = accountId;
      _transferReceiptUrl = null;
    });
    _refreshCheckoutIfOpen();
  }

  Future<void> _loadChatHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_chatPrefsKey);
    _resetGuidedPurchase();

    final firstName = _firstName;
    final savedHistory = prefs.getString(_chatPrefsKey);
    final loadedMessages = <ChatMessage>[];

    if (savedHistory != null && savedHistory.isNotEmpty) {
      try {
        final decoded = jsonDecode(savedHistory) as List<dynamic>;
        loadedMessages.addAll(
          decoded.map(
            (entry) => ChatMessage.fromJson(entry as Map<String, dynamic>),
          ),
        );
      } catch (_) {
        await prefs.remove(_chatPrefsKey);
      }
    }

    final hasSavedChatHistory = loadedMessages.isNotEmpty;

    if (loadedMessages.isEmpty) {
      loadedMessages.add(
        ChatMessage.assistant('Hola $firstName, Â¿quÃ© deseas pedir hoy?'),
      );
    }

    if (!mounted) {
      return;
    }
    setState(() {
      _messages.clear();
      _messages.add(
        ChatMessage.assistant(
          'Hola Bienvenido $firstName, estoy aqui para ayudarte a buscar lo que necesitas, que deseas hoy? 👋😃',
        ),
      );
    });

    if (hasSavedChatHistory) {
      setState(() {
        _messages.clear();
        _messages.addAll(loadedMessages);
      });
      _scrollToBottom();
    }

    final prefsId = prefs.getString('${_chatPrefsKey}_active_order');
    if (prefsId != null && prefsId.isNotEmpty) {
      _activeOrderId = prefsId;
      _startDeliveryPolling();
    }
  }

  Future<void> _saveChatHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = jsonEncode(_messages.map((e) => e.toJson()).toList());
    await prefs.setString(_chatPrefsKey, jsonStr);
  }

  bool _isTransferPaymentRejected(String notes) {
    final normalized = notes.toLowerCase();
    return normalized.contains('transferencia_rechazada') ||
        normalized.contains('comprobante de pago no pudo ser validado');
  }

  bool _hasTransferPaymentRejectedMessage(String? orderId) {
    return _messages.any((message) {
      if (orderId != null && message.activeOrderId != orderId) {
        return false;
      }

      return message.text.toLowerCase().contains(
        'comprobante de pago no pudo ser validado',
      );
    });
  }

  void _appendTransferPaymentRejectedMessage(String? orderId) {
    if (_hasTransferPaymentRejectedMessage(orderId)) {
      return;
    }

    _messages.add(
      ChatMessage.assistant(
        _transferPaymentRejectedChatText,
        isError: true,
        activeOrderId: orderId,
      ),
    );
  }

  void _deleteMessage(String id) {
    setState(() {
      _messages.removeWhere((m) => m.id == id);
    });
    _saveChatHistory();
  }

  void _clearChat() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Borrar chat'),
        content: const Text('¿Estas seguro de borrar toda la conversacion?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _resetGuidedPurchase();
                _messages.clear();
                final firstName = _firstName;
                _messages.add(
                  ChatMessage.assistant(
                    'Hola, $firstName. Escribeme el producto que buscas y consulto el catalogo del minimarket.',
                  ),
                );
              });
              _saveChatHistory();
            },
            child: const Text(
              'Borrar todo',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _deliveryCheckTimer?.cancel();
    _transferAccountsTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadTransferAccounts();
      _startTransferAccountsRealtimeSync();
      unawaited(_syncPickupStatusMessagesFromActiveOrder());
      return;
    }

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      _transferAccountsTimer?.cancel();
    }
  }

  void _startDeliveryPolling() {
    _deliveryCheckTimer?.cancel();
    _hasAskedDeliveryConfirmation = false;
    _hasAskedReadyForPickupConfirmation = false;
    _hasWarnedDeliveryConfirmed = false;
    unawaited(_syncPickupStatusMessagesFromActiveOrder());
    _deliveryCheckTimer = Timer.periodic(const Duration(seconds: 5), (
      timer,
    ) async {
      if (_activeOrderId == null ||
          (_hasAskedDeliveryConfirmation &&
              _hasAskedReadyForPickupConfirmation)) {
        timer.cancel();
        return;
      }
      try {
        final res = await getMobileApi('/api/mobile/orders/$_activeOrderId');
        if (res['ok'] == true) {
          final status = res['status']?.toString() ?? '';
          final notes = res['notes']?.toString() ?? '';

          if (status == 'cancelled') {
            final currentOrderId = _activeOrderId;
            if (_isTransferPaymentRejected(notes)) {
              unawaited(
                AppNotificationService.showOrderAlert(
                  title: 'Pago no validado',
                  body: _transferPaymentRejectedChatText,
                ),
              );
              if (mounted) {
                setState(() {
                  _appendTransferPaymentRejectedMessage(currentOrderId);
                });
                _saveChatHistory();
                _scrollToBottom();
              }
            }
            timer.cancel();
            _activeOrderId = null;
            unawaited(
              SharedPreferences.getInstance().then(
                (p) => p.remove('${_chatPrefsKey}_active_order'),
              ),
            );
            return;
          } else if (status == 'delivered') {
            final notes = res['notes']?.toString() ?? '';
            final isRetiroLocal = notes.toUpperCase().contains(
              'RETIRO EN LOCAL',
            );

            _hasAskedDeliveryConfirmation = true;
            timer.cancel();

            if (isRetiroLocal) {
              final ticketMatch = RegExp(
                r'TICKET:\s*([0-9]+)',
              ).firstMatch(notes);
              final ticket = ticketMatch != null
                  ? ticketMatch.group(1) ?? ''
                  : '';
              final ticketText = ticket.isNotEmpty ? ' TICKET: $ticket' : '';

              final currentOrderId = _activeOrderId;
              _activeOrderId = null;
              unawaited(
                SharedPreferences.getInstance().then(
                  (p) => p.remove('${_chatPrefsKey}_active_order'),
                ),
              );
              unawaited(
                AppNotificationService.showOrderAlert(
                  title: 'Pedido entregado',
                  body:
                      '✅ Tu pedido ha sido entregado. ¡Gracias por tu compra! 🛒',
                ),
              );
              if (mounted) {
                setState(() {
                  final hasReadyMsg = _messages.any((m) {
                    final text = m.text.toLowerCase();
                    return m.activeOrderId == currentOrderId &&
                        text.contains('listo') &&
                        text.contains('retir');
                  });
                  if (!hasReadyMsg) {
                    _messages.add(
                      ChatMessage.assistant(
                        '🎟️ Tu pedido$ticketText está listo para ser retirado en el local. 🛍️',
                        activeOrderId: currentOrderId,
                      ),
                    );
                  }
                  final hasDeliveredMsg = _messages.any(
                    (m) =>
                        m.activeOrderId == currentOrderId &&
                        m.text.toLowerCase().contains('ha sido entregado'),
                  );
                  if (!hasDeliveredMsg) {
                    _messages.add(
                      ChatMessage.assistant(
                        '✅ Tu pedido ha sido entregado. ¡Gracias por tu compra! 🛒',
                        activeOrderId: currentOrderId,
                      ),
                    );
                  }
                });
                _saveChatHistory();
                _scrollToBottom();
              }
            } else {
              unawaited(
                AppNotificationService.showOrderAlert(
                  title: 'Pedido entregado',
                  body:
                      'Tu pedido fue marcado como entregado. Confirma en el chat si lo recibiste.',
                ),
              );
              if (mounted) {
                setState(() {
                  final hasMsg = _messages.any(
                    (m) => m.text.contains(
                      '¿Confirmas que lo has recibido correctamente?',
                    ),
                  );
                  if (!hasMsg) {
                    _messages.add(
                      ChatMessage.assistant(
                        'Tu pedido ha sido marcado como entregado. 📦 ¿Confirmas que lo has recibido correctamente?',
                        requiresDeliveryConfirmation: true,
                        activeOrderId: _activeOrderId,
                      ),
                    );
                  }
                });
                _saveChatHistory();
                _scrollToBottom();
              }
            }
          } else if (status == 'preparing') {
            final String notes = res['notes'] ?? '';
            if (notes.toLowerCase().contains('repartidor report') &&
                !_hasWarnedDeliveryFailed) {
              _hasWarnedDeliveryFailed = true;
              unawaited(
                AppNotificationService.showOrderAlert(
                  title: 'Problema con la entrega',
                  body:
                      'El repartidor no pudo concretar la entrega. Revisa el chat.',
                ),
              );
              if (mounted) {
                setState(() {
                  _messages.add(
                    ChatMessage.assistant(
                      'Hubo un problema y el repartidor no pudo concretar la entrega. Tu pedido ha regresado a la tienda y nos pondremos en contacto contigo para reenviarlo.',
                    ),
                  );
                });
                _saveChatHistory();
                _scrollToBottom();
              }
            }
          } else if (status == 'confirmed') {
            final notes = res['notes']?.toString() ?? '';
            final isRetiroLocal = notes.toUpperCase().contains(
              'RETIRO EN LOCAL',
            );

            if (isRetiroLocal) {
              if (!_hasAskedReadyForPickupConfirmation) {
                _hasAskedReadyForPickupConfirmation = true;

                final ticketMatch = RegExp(
                  r'TICKET:\s*([0-9]+)',
                ).firstMatch(notes);
                final ticket = ticketMatch != null
                    ? ticketMatch.group(1) ?? ''
                    : '';
                final ticketText = ticket.isNotEmpty ? ' TICKET: $ticket' : '';

                unawaited(
                  AppNotificationService.showOrderAlert(
                    title: 'Tu pedido está listo',
                    body:
                        '🎟️ Tu pedido$ticketText está listo para ser retirado en el local. 🛍️',
                  ),
                );
                if (mounted) {
                  setState(() {
                    final hasMsg = _messages.any((m) {
                      final text = m.text.toLowerCase();
                      return m.activeOrderId == _activeOrderId &&
                          text.contains('listo') &&
                          text.contains('retir');
                    });
                    if (!hasMsg) {
                      _messages.add(
                        ChatMessage.assistant(
                          '🎟️ Tu pedido$ticketText está listo para ser retirado en el local. 🛍️',
                          activeOrderId: _activeOrderId,
                        ),
                      );
                    }
                  });
                  _saveChatHistory();
                  _scrollToBottom();
                }
              }
            } else {
              if (!_hasWarnedDeliveryConfirmed &&
                  res['delivery_user'] != null) {
                _hasWarnedDeliveryConfirmed = true;
                final deliveryUser = res['delivery_user'];
                final name = deliveryUser['name'] ?? 'asignado';
                final ci = deliveryUser['identity_number'] ?? 'N/A';
                unawaited(
                  AppNotificationService.showOrderAlert(
                    title: 'Tu pedido va en camino',
                    body:
                        'El delivery $name esta llevando tu pedido. Revisa el chat.',
                  ),
                );
                if (mounted) {
                  setState(() {
                    _messages.add(
                      ChatMessage.assistant(
                        '🛵 ¡Su pedido va en camino! El Delivery $name con número de cédula $ci está llevando su pedido.',
                      ),
                    );
                  });
                  _saveChatHistory();
                  _scrollToBottom();
                }
              }
            }
          }
        }
      } catch (_) {}
    });
  }

  Future<void> _syncPickupStatusMessagesFromActiveOrder() async {
    final orderId = _activeOrderId;
    if (orderId == null || orderId.isEmpty) {
      return;
    }

    try {
      final res = await getMobileApi('/api/mobile/orders/$orderId');
      if (res['ok'] != true) {
        return;
      }

      final status = res['status']?.toString() ?? '';
      final notes = res['notes']?.toString() ?? '';
      if (status == 'cancelled' && _isTransferPaymentRejected(notes)) {
        if (mounted) {
          var changed = false;
          setState(() {
            if (!_hasTransferPaymentRejectedMessage(orderId)) {
              _appendTransferPaymentRejectedMessage(orderId);
              changed = true;
            }
          });
          if (changed) {
            _saveChatHistory();
            _scrollToBottom();
          }
        }
        _activeOrderId = null;
        unawaited(
          SharedPreferences.getInstance().then(
            (p) => p.remove('${_chatPrefsKey}_active_order'),
          ),
        );
        return;
      }

      final isPickup =
          notes.contains('RETIRO EN LOCAL') &&
          (status == 'confirmed' || status == 'delivered');
      if (!isPickup) {
        return;
      }

      final ticketMatch = RegExp(r'TICKET:\s*([0-9]+)').firstMatch(notes);
      final ticket = ticketMatch != null ? ticketMatch.group(1) ?? '' : '';
      final ticketText = ticket.isNotEmpty ? ' TICKET: $ticket' : '';

      if (!mounted) {
        return;
      }

      var changed = false;
      setState(() {
        final hasReadyMsg = _messages.any((m) {
          final text = m.text.toLowerCase();
          return m.activeOrderId == orderId &&
              text.contains('listo') &&
              text.contains('retir');
        });
        if (!hasReadyMsg) {
          _messages.add(
            ChatMessage.assistant(
              '🎟️ Tu pedido$ticketText está listo para ser retirado en el local. 🛍️',
              activeOrderId: orderId,
            ),
          );
          changed = true;
        }
        _hasAskedReadyForPickupConfirmation = true;

        if (status == 'delivered') {
          final hasDeliveredMsg = _messages.any(
            (m) =>
                m.activeOrderId == orderId &&
                m.text.toLowerCase().contains('ha sido entregado'),
          );
          if (!hasDeliveredMsg) {
            _messages.add(
              ChatMessage.assistant(
                '✅ Tu pedido ha sido entregado. ¡Gracias por tu compra! 🛒',
                activeOrderId: orderId,
              ),
            );
            changed = true;
          }
          _hasAskedDeliveryConfirmation = true;
        }
      });

      if (status == 'delivered') {
        _activeOrderId = null;
        unawaited(
          SharedPreferences.getInstance().then(
            (p) => p.remove('${_chatPrefsKey}_active_order'),
          ),
        );
      }

      if (changed) {
        _saveChatHistory();
        _scrollToBottom();
      }
    } catch (_) {}
  }

  Future<void> _handleDeliveryConfirmation(
    String messageId,
    String orderId,
    String action,
  ) async {
    setState(() {
      _messages.removeWhere((m) => m.id == messageId);
      if (action == 'Si') {
        _messages.add(
          ChatMessage.assistant(
            '¡Muchas gracias por confirmar! 🎉 Que disfrutes de tu pedido. Siempre estamos a las órdenes para tu próxima compra.',
          ),
        );
        _activeOrderId = null;
        SharedPreferences.getInstance().then(
          (p) => p.remove('${_chatPrefsKey}_active_order'),
        );
      } else {
        _messages.add(
          ChatMessage.assistant(
            'Lo sentimos mucho. 😔 Nos pondremos en contacto inmediatamente con el repartidor para solucionar tu problema.',
          ),
        );
        _startDeliveryPolling();
      }
    });
    _saveChatHistory();
    _scrollToBottom();

    try {
      await putMobileApi('/api/mobile/orders/$orderId', {
        'action': action == 'Si' ? 'confirm_delivery' : 'reject_delivery',
      });
    } catch (_) {}
  }

  String get _firstName => _customerName.trim().isEmpty
      ? 'cliente'
      : _customerName.trim().split(RegExp(r'\s+')).first;
  String get _customerName => widget.account.name;
  double get _cartTotal => _cart.fold(0, (sum, item) => sum + item.lineTotal);

  Future<void> _sendMessage([String? preset]) async {
    if (_sending) {
      return;
    }

    final message = (preset ?? _messageController.text).trim();
    if (message.isEmpty) {
      return;
    }

    final normalizedForClear = _normalizeChatInput(message);
    if (normalizedForClear.contains('vaciar') &&
            normalizedForClear.contains('compra') ||
        normalizedForClear.contains('cancelar') &&
            normalizedForClear.contains('compra') ||
        normalizedForClear.contains('no deseo comprar')) {
      setState(() {
        _resetGuidedPurchase();
        _messageController.clear();
      });
      _clearCart();
      _saveChatHistory();
      _scrollToBottom();
      return;
    }

    if (_guidedStep.isNotEmpty) {
      setState(() {
        _messages.add(ChatMessage.user(message));
        _messageController.clear();
      });
      _handleGuidedPurchaseReply(message);
      _saveChatHistory();
      _scrollToBottom();
      return;
    }

    final history = _buildChatHistory();

    setState(() {
      _sending = true;
      _messages.add(ChatMessage.user(message));
      _messageController.clear();
    });
    _saveChatHistory();
    _scrollToBottom();

    try {
      final response = await postMobileApi('/api/chatbot', {
        'message': message,
        'customer_name': _customerName,
        'history': history,
      });
      final answer =
          response['answer'] as String? ??
          'Ya consulte el catalogo, pero no pude preparar una respuesta.';
      final products = ChatProduct.listFromJson(response['products']);
      final suggestedItems = SuggestedCartItem.mapFromJson(
        response['suggested_order'],
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _messages.add(
          ChatMessage.assistant(
            answer,
            products: products,
            suggestedItems: suggestedItems,
          ),
        );
      });
      _saveChatHistory();
    } on MobileApiException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _messages.add(
          ChatMessage.assistant(
            error.statusCode == 0
                ? 'No pude conectarme con el servidor. Revisa internet e intenta otra vez.'
                : error.message,
            isError: true,
          ),
        );
      });
      _saveChatHistory();
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToBottom();
      }
    }
  }

  void _startGuidedProductPurchase(ChatProduct product) {
    if (product.stock <= 0) {
      setState(() {
        _resetGuidedPurchase();
        _messages.add(
          ChatMessage.assistant(
            '${product.displayName} no se encuentra disponible en este momento.',
          ),
        );
      });
      _saveChatHistory();
      _scrollToBottom();
      return;
    }

    final presentations = _guidedPresentationsFor(product);
    setState(() {
      _guidedProduct = product;
      _guidedPresentation = null;
      _guidedStep = presentations.isEmpty ? 'quantity' : 'presentation';
      _messages.add(
        ChatMessage.assistant(
          presentations.isEmpty
              ? 'Si tenemos ${product.displayName}. Escribe la cantidad que deseas comprar.'
              : 'Si tenemos ${product.displayName} y estas son nuestras presentaciones disponibles.',
        ),
      );
    });
    _saveChatHistory();
    _scrollToBottom();
  }

  void _handleGuidedPurchaseReply(String message) {
    final normalized = _normalizeChatInput(message);
    if (normalized == 'cancelar' || normalized == 'salir') {
      setState(() {
        _resetGuidedPurchase();
        _messages.add(
          ChatMessage.assistant(
            'Listo, cancele esa seleccion. Escribe otro producto para buscarlo.',
          ),
        );
      });
      return;
    }

    final product = _guidedProduct;
    if (product == null) {
      _resetGuidedPurchase();
      return;
    }

    if (_guidedStep == 'presentation') {
      final halfQuintalPresentation = _guidedQuintalPresentationFor(product);
      final numericChoice = int.tryParse(message.trim());
      if (_isGuidedHalfQuintalChoice(product, message)) {
        if (halfQuintalPresentation == null) {
          setState(() {
            _messages.add(
              ChatMessage.assistant(
                'No reconoci esa presentacion. Elige una de estas opciones:\n${_formatGuidedPresentationOptions(product)}',
                isError: true,
              ),
            );
          });
          return;
        }

        const halfQuintalQuantity = 0.5;
        final requiredStock =
            halfQuintalQuantity * halfQuintalPresentation.unitQuantity;

        if (requiredStock > product.stock + 0.001) {
          setState(() {
            _messages.add(
              ChatMessage.assistant(
                'No hay stock suficiente para medio quintal. Solo tenemos ${_formatQuantity(product.stock)} lb disponibles.',
                isError: true,
              ),
            );
          });
          return;
        }

        _resetGuidedPurchase();
        _addProductToCart(
          product,
          quantity: halfQuintalQuantity,
          presentationId: halfQuintalPresentation.id,
        );
        return;
      }

      if (numericChoice == _guidedCancelOptionNumber(product)) {
        setState(() {
          _resetGuidedPurchase();
          _messages.add(
            ChatMessage.assistant('Listo, cancele la compra de este producto.'),
          );
        });
        return;
      }

      final presentation = _matchGuidedPresentation(product, message);
      if (presentation == null) {
        setState(() {
          _messages.add(
            ChatMessage.assistant(
              'No reconoci esa presentacion. Elige una de estas opciones:\n${_formatGuidedPresentationOptions(product)}',
              isError: true,
            ),
          );
        });
        return;
      }

      setState(() {
        _guidedPresentation = presentation;
        _guidedStep = 'quantity';
        _messages.add(
          ChatMessage.assistant(
            _isGuidedQuintalPresentation(presentation)
                ? 'Perfecto, ${presentation.name}. Ahora escribe cuantos quintales quieres comprar.'
                : 'Perfecto, ${presentation.name}. Ahora escribe la cantidad que deseas comprar.',
          ),
        );
      });
      return;
    }

    if (_guidedStep == 'quantity') {
      final quantity = _parseGuidedQuantity(message);
      if (quantity != null && quantity == 0) {
        setState(() {
          _resetGuidedPurchase();
          _messages.add(
            ChatMessage.assistant('Listo, cancele la compra de este producto.'),
          );
        });
        return;
      }

      if (quantity == null || quantity < 0) {
        setState(() {
          _messages.add(
            ChatMessage.assistant(
              'Escribe una cantidad valida, por ejemplo 1, 2, 4 o 10.',
              isError: true,
            ),
          );
        });
        return;
      }

      final presentation = _guidedPresentation;
      final requiredStock = quantity * (presentation?.unitQuantity ?? 1);
      if (requiredStock > product.stock + 0.001) {
        setState(() {
          final stockStr = _isGuidedWeightSale(product)
              ? '${_formatQuantity(product.stock)} lb'
              : '${_formatQuantity(product.stock)} unidades';

          String errorMessage;
          if (presentation != null &&
              presentation.unitQuantity > 1 &&
              !product.isWeightBased) {
            errorMessage =
                'No hay stock suficiente para esta cantidad la ${presentation.name.toLowerCase()} es de ${_formatQuantity(presentation.unitQuantity)} unidades en su presentacion .. pero tenemos $stockStr disponibles';
          } else {
            errorMessage =
                'No hay stock suficiente para esta cantidad. Solo tenemos $stockStr disponibles.';
          }

          _messages.add(ChatMessage.assistant(errorMessage, isError: true));

          final presentations = _guidedPresentationsFor(product);
          _guidedPresentation = null;

          if (presentations.isEmpty) {
            _guidedStep = 'quantity';
            _messages.add(
              ChatMessage.assistant('Escribe la cantidad que deseas comprar.'),
            );
          } else {
            _guidedStep = 'presentation';
            _messages.add(
              ChatMessage.assistant(
                'En que presentacion quieres comprarlo?\n${_formatGuidedPresentationOptions(product)}',
              ),
            );
          }
        });
        return;
      }

      _resetGuidedPurchase();
      _addProductToCart(
        product,
        quantity: quantity,
        presentationId: presentation?.id,
      );
    }
  }

  void _resetGuidedPurchase() {
    _guidedProduct = null;
    _guidedPresentation = null;
    _guidedStep = '';
  }

  List<ChatPresentation> _guidedPresentationsFor(ChatProduct product) {
    return product.presentations
        .where(
          (presentation) =>
              presentation.id.isNotEmpty &&
              !presentation.id.startsWith('default-') &&
              presentation.unitQuantity > 0,
        )
        .toList(growable: false);
  }

  String _formatGuidedPresentationOptions(ChatProduct product) {
    final presentations = _guidedPresentationsFor(product);
    final options = presentations.asMap().entries.map((entry) {
      final presentation = entry.value;
      final item = CartItem(
        product: product,
        quantity: 1,
        presentation: presentation,
      );
      return '${entry.key + 1}. ${_guidedPresentationLabel(product, presentation)} - ${_formatMoney(item.unitPrice)}';
    }).toList();
    final halfQuintalPresentation = _guidedQuintalPresentationFor(product);
    if (halfQuintalPresentation != null) {
      final item = CartItem(
        product: product,
        quantity: 0.5,
        presentation: halfQuintalPresentation,
      );
      options.add(
        '${options.length + 1}. Medio quintal (50 lb) - ${_formatMoney(item.lineTotal)}',
      );
    }
    options.add('${options.length + 1}. Cancelar');
    return options.join('\n');
  }

  String _guidedPresentationLabel(
    ChatProduct product,
    ChatPresentation presentation,
  ) {
    final content = _formatGuidedPresentationContent(product, presentation);
    return '${presentation.name} ($content)';
  }

  String _formatGuidedPresentationContent(
    ChatProduct product,
    ChatPresentation presentation,
  ) {
    final quantity = _formatQuantity(presentation.unitQuantity);
    if (_isGuidedWeightSale(product)) {
      return '$quantity lb';
    }

    return '$quantity ${presentation.unitQuantity == 1 ? 'unidad' : 'unidades'}';
  }

  ChatPresentation? _matchGuidedPresentation(
    ChatProduct product,
    String message,
  ) {
    final presentations = _guidedPresentationsFor(product);
    final numericChoice = int.tryParse(message.trim());
    if (numericChoice != null &&
        numericChoice >= 1 &&
        numericChoice <= presentations.length) {
      return presentations[numericChoice - 1];
    }

    final normalized = _normalizeChatInput(message);
    for (final presentation in presentations) {
      final option = _normalizeChatInput(presentation.name);
      final content = _normalizeChatInput(
        _formatGuidedPresentationContent(product, presentation),
      );
      final isBaseWeightPresentation =
          _isGuidedWeightSale(product) &&
          (presentation.unitQuantity - 1).abs() < 0.001;
      if (normalized == option ||
          normalized.contains(option) ||
          normalized == content ||
          normalized.contains(content) ||
          (isBaseWeightPresentation &&
              (normalized == 'libra' || normalized == 'libras'))) {
        return presentation;
      }
    }

    return null;
  }

  int _guidedCancelOptionNumber(ChatProduct product) {
    return _guidedPresentationsFor(product).length +
        (_guidedQuintalPresentationFor(product) == null ? 1 : 2);
  }

  ChatPresentation? _guidedQuintalPresentationFor(ChatProduct product) {
    for (final presentation in _guidedPresentationsFor(product)) {
      if (_isGuidedQuintalPresentation(presentation)) {
        return presentation;
      }
    }

    return null;
  }

  bool _isGuidedQuintalPresentation(ChatPresentation presentation) {
    final normalizedName = _normalizeChatInput(presentation.name);

    return normalizedName.contains('quintal') ||
        (presentation.unitQuantity - 100).abs() < 0.001;
  }

  bool _isGuidedWeightSale(ChatProduct product) {
    return product.isWeightBased ||
        _guidedQuintalPresentationFor(product) != null;
  }

  bool _isGuidedHalfQuintalChoice(ChatProduct product, String message) {
    if (_guidedQuintalPresentationFor(product) == null) {
      return false;
    }

    final normalized = _normalizeChatInput(message);
    final halfOptionNumber = _guidedPresentationsFor(product).length + 1;
    final numericChoice = int.tryParse(message.trim());

    return numericChoice == halfOptionNumber ||
        normalized == 'medio quintal' ||
        normalized == 'medio' ||
        normalized.contains('medio quintal') ||
        normalized.contains('media quintal');
  }

  double? _parseGuidedQuantity(String message) {
    final normalized = _normalizeChatInput(message);
    final numericMatch = RegExp(r'\d+(?:[\.,]\d+)?').firstMatch(normalized);
    if (numericMatch != null) {
      return double.tryParse(numericMatch.group(0)!.replaceAll(',', '.'));
    }

    const quantities = {
      'un': 1.0,
      'una': 1.0,
      'uno': 1.0,
      'dos': 2.0,
      'tres': 3.0,
      'cuatro': 4.0,
      'cinco': 5.0,
      'seis': 6.0,
      'siete': 7.0,
      'ocho': 8.0,
      'nueve': 9.0,
      'diez': 10.0,
    };

    for (final entry in quantities.entries) {
      if (normalized.split(' ').contains(entry.key)) {
        return entry.value;
      }
    }

    return null;
  }

  String _normalizeChatInput(String value) {
    const accents = {
      'á': 'a',
      'é': 'e',
      'í': 'i',
      'ó': 'o',
      'ú': 'u',
      'Á': 'a',
      'É': 'e',
      'Í': 'i',
      'Ó': 'o',
      'Ú': 'u',
      'ñ': 'n',
      'Ñ': 'n',
    };
    var normalized = value.toLowerCase().trim();
    accents.forEach((from, to) {
      normalized = normalized.replaceAll(from, to);
    });
    return normalized
        .replaceAll(RegExp(r'[^a-z0-9,\.\s]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  void _addProductToCart(
    ChatProduct product, {
    double quantity = 1,
    String? presentationId,
    bool announce = true,
  }) {
    final normalizedQuantity = quantity <= 0 ? 1.0 : quantity;
    final presentation = product.presentationById(presentationId);
    final index = _cart.indexWhere(
      (item) =>
          item.product.id == product.id &&
          item.presentation?.id == presentation?.id,
    );

    if (index >= 0) {
      final current = _cart[index];
      _cart[index] = current.copyWith(
        quantity: current.quantity + normalizedQuantity,
      );
    } else {
      _cart.add(
        CartItem(
          product: product,
          quantity: normalizedQuantity,
          presentation: presentation,
        ),
      );
    }

    if (announce) {
      final addedItem = CartItem(
        product: product,
        quantity: normalizedQuantity,
        presentation: presentation,
      );
      setState(() {
        _removeCartNoticesForProductIds({product.id});
        _messages.add(
          ChatMessage.assistant(
            _buildCartAddedMessage(addedItem),
            isCartNotice: true,
            cartProductIds: [product.id],
          ),
        );
      });
      _scrollToBottom();
    }
  }

  void _addSuggestedProductToCart(
    ChatProduct product,
    SuggestedCartItem? suggestion,
  ) {
    final parts = suggestion?.effectiveParts ?? const <SuggestedCartItem>[];

    if (parts.length <= 1) {
      _addProductToCart(
        product,
        quantity: suggestion?.quantity ?? 1,
        presentationId: suggestion?.presentationId,
      );
      return;
    }

    for (final part in parts) {
      _addProductToCart(
        product,
        quantity: part.quantity,
        presentationId: part.presentationId,
        announce: false,
      );
    }

    setState(() {
      _removeCartNoticesForProductIds({product.id});
      _messages.add(
        ChatMessage.assistant(
          'Se agrego ${_suggestedPresentationLabel(product, null, suggestion)} de ${product.displayName} al pedido. Puedes seguir comprando o revisar el pedido.',
          isCartNotice: true,
          cartProductIds: [product.id],
        ),
      );
    });
    _scrollToBottom();
  }

  void _addProductsToCart(
    List<ChatProduct> products,
    Map<String, SuggestedCartItem> suggestions,
  ) {
    final addableProducts = products
        .where(
          (product) =>
              _canAddSuggestedProduct(product, suggestions[product.id]),
        )
        .toList(growable: false);

    if (addableProducts.isEmpty) {
      setState(() {
        _messages.add(
          ChatMessage.assistant(
            'No pude agregar esos productos porque no hay stock suficiente.',
          ),
        );
      });
      _scrollToBottom();
      return;
    }

    for (final product in addableProducts) {
      final suggestion = suggestions[product.id];
      final parts = suggestion?.effectiveParts ?? const <SuggestedCartItem>[];
      if (parts.length > 1) {
        for (final part in parts) {
          _addProductToCart(
            product,
            quantity: part.quantity,
            presentationId: part.presentationId,
            announce: false,
          );
        }
      } else {
        _addProductToCart(
          product,
          quantity: suggestion?.quantity ?? 1,
          presentationId: suggestion?.presentationId,
          announce: false,
        );
      }
    }

    final addedProductIds = addableProducts
        .map((product) => product.id)
        .toList(growable: false);
    setState(() {
      _removeCartNoticesForProductIds(addedProductIds.toSet());
      _messages.add(
        ChatMessage.assistant(
          'He agregado ${addableProducts.length} productos a tu carrito. ¿Deseas pedir algo más?',
        ),
      );
    });
    _scrollToBottom();
  }

  void _removeCartItem(CartItem item) {
    setState(() {
      _cart.remove(item);
      for (final m in _messages) {
        m.addedProductIds.remove(item.product.id);
      }
      _removeCartNoticesForProductIds({item.product.id});
    });
    _saveChatHistory();
  }

  void _removeSuggestedProductFromCart(
    ChatProduct product,
    SuggestedCartItem? suggestion,
  ) {
    final parts = suggestion?.effectiveParts ?? const <SuggestedCartItem>[];

    setState(() {
      if (parts.isEmpty) {
        _cart.removeWhere((item) => item.product.id == product.id);
      } else {
        for (final part in parts) {
          final presentation = product.presentationById(part.presentationId);
          _cart.removeWhere(
            (item) =>
                item.product.id == product.id &&
                item.presentation?.id == presentation?.id,
          );
        }
      }

      if (!_cart.any((item) => item.product.id == product.id)) {
        for (final m in _messages) {
          m.addedProductIds.remove(product.id);
        }
        _removeCartNoticesForProductIds({product.id});
      }
    });
    _saveChatHistory();
  }

  void _clearCart() {
    setState(() {
      _cart.clear();

      final messagesToRemove = <ChatMessage>{};
      for (int i = 0; i < _messages.length; i++) {
        final m = _messages[i];
        if (m.isCartNotice || _looksLikeCartNotice(m.text)) {
          messagesToRemove.add(m);
        } else if (m.addedProductIds.isNotEmpty) {
          messagesToRemove.add(m);
          if (i > 0 && _messages[i - 1].isUser) {
            messagesToRemove.add(_messages[i - 1]);
          }
        }
      }

      _messages.removeWhere((m) => messagesToRemove.contains(m));
      for (final m in _messages) {
        m.addedProductIds.clear();
      }

      _messages.add(
        ChatMessage.assistant('Carrito y selección actual vaciados.'),
      );
    });
    _saveChatHistory();
  }

  void _removeCartNoticesForProductIds(Set<String> productIds) {
    if (productIds.isEmpty) {
      return;
    }

    _messages.removeWhere(
      (message) =>
          (message.isCartNotice &&
              message.cartProductIds.any(productIds.contains)) ||
          _looksLikeCartNotice(message.text),
    );
  }

  bool _looksLikeCartNotice(String text) {
    final normalized = text.toLowerCase();
    return (normalized.startsWith('se agrego ') ||
            normalized.startsWith('he agregado ')) &&
        (normalized.contains(' al pedido.') ||
            normalized.contains(' a tu carrito.'));
  }

  Future<void> _showCheckout() async {
    if (_cart.isEmpty) {
      return;
    }

    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (sheetContext) {
          return StatefulBuilder(
            builder: (context, setSheetState) {
              _refreshCheckoutSheet = () {
                if (sheetContext.mounted) {
                  setSheetState(() {});
                }
              };

              void refreshOrClose() {
                if (_cart.isEmpty) {
                  Navigator.of(sheetContext).pop();
                } else {
                  setSheetState(() {});
                }
              }

              return FractionallySizedBox(
                heightFactor: 0.88,
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(22),
                  ),
                  child: _CartPanel(
                    cart: _cart,
                    total: _cartTotal,
                    transferAccounts: _transferAccounts,
                    selectedTransferAccountId: _selectedTransferAccount?.id,
                    deliveryAddress: _deliveryAddress.trim().isEmpty
                        ? widget.account.address
                        : _deliveryAddress,
                    deliveryMethod: _deliveryMethod,
                    paymentMethod: _paymentMethod,
                    loadingAddress: _loadingCheckoutAddress,
                    creatingOrder: _creatingOrder,
                    transferReceiptUrl: _transferReceiptUrl,
                    uploadingReceipt: _uploadingReceipt,
                    onAttachReceipt: () async {
                      await _uploadTransferReceipt();
                      setSheetState(() {});
                    },
                    onRemoveReceipt: () {
                      setState(() => _transferReceiptUrl = null);
                      setSheetState(() {});
                    },
                    onRegisteredAddress: () {
                      _useRegisteredAddressForDelivery();
                      setSheetState(() {});
                    },
                    onCurrentAddress: () async {
                      await _useCurrentAddressForDelivery();
                      if (sheetContext.mounted) {
                        setSheetState(() {});
                      }
                    },
                    onDeliveryMethodChanged: (method) {
                      _deliveryMethod = method;
                      setSheetState(() {});
                    },
                    onPaymentChanged: (method) {
                      _setPaymentMethod(method);
                      setSheetState(() {});
                    },
                    onTransferAccountChanged: (accountId) {
                      _selectTransferAccount(accountId);
                      setSheetState(() {});
                    },
                    needsChange: _needsChange,
                    changeAmount: _changeAmount,
                    onNeedsChangeChanged: (val) {
                      setState(() => _needsChange = val);
                      setSheetState(() {});
                    },
                    onChangeAmountChanged: (val) {
                      setState(() => _changeAmount = val);
                      setSheetState(() {});
                    },
                    onRemove: (item) {
                      _removeCartItem(item);
                      refreshOrClose();
                    },
                    onClear: () {
                      _clearCart();
                      refreshOrClose();
                    },
                    onCopyPreview: _copyReceiptPreview,
                    onConfirm: () async {
                      final confirmation = _confirmOrder();
                      setSheetState(() {});
                      await confirmation;
                      if (sheetContext.mounted && _cart.isEmpty) {
                        Navigator.of(sheetContext).pop();
                      } else if (sheetContext.mounted) {
                        setSheetState(() {});
                      }
                    },
                  ),
                ),
              );
            },
          );
        },
      );
    } finally {
      _refreshCheckoutSheet = null;
    }
  }

  void _useRegisteredAddressForDelivery() {
    final address = widget.account.address.trim();

    setState(() {
      _deliveryAddress = address;
      _deliveryPosition = null;
      if (address.isNotEmpty) {
        _messages.add(
          ChatMessage.assistant(
            'Usare tu direccion registrada para la entrega:\n$address',
          ),
        );
      }
    });

    if (address.isNotEmpty) {
      _scrollToBottom();
    }
  }

  void _setPaymentMethod(String method) {
    setState(() {
      _paymentMethod = method;
      if (method == 'transferencia' &&
          _selectedTransferAccountId == null &&
          _transferAccounts.isNotEmpty) {
        _selectedTransferAccountId = _transferAccounts.first.id;
      }
    });
    if (method == 'transferencia') {
      _loadTransferAccounts();
    }
  }

  Future<void> _useCurrentAddressForDelivery() async {
    if (_loadingCheckoutAddress) {
      return;
    }

    setState(() => _loadingCheckoutAddress = true);

    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        setState(() {
          _messages.add(
            ChatMessage.assistant(
              'Activa el GPS para detectar tu direccion.',
              isError: true,
            ),
          );
          _loadingCheckoutAddress = false;
        });
        _scrollToBottom();
      }
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (mounted) {
        setState(() {
          _messages.add(
            ChatMessage.assistant(
              'Permite el acceso a la ubicacion o usa tu direccion registrada.',
              isError: true,
            ),
          );
          _loadingCheckoutAddress = false;
        });
        _scrollToBottom();
      }
      return;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      final address = await reverseGeocodePosition(position);

      if (!mounted) {
        return;
      }

      setState(() {
        _deliveryAddress = address;
        _deliveryPosition = position;
      });
      _scrollToBottom();
    } on LocationException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _messages.add(ChatMessage.assistant(error.message, isError: true));
      });
      _scrollToBottom();
    } finally {
      if (mounted) {
        setState(() => _loadingCheckoutAddress = false);
      }
    }
  }

  Future<void> _uploadTransferReceipt() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 70,
    );
    if (image == null) return;

    setState(() => _uploadingReceipt = true);
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$_mobileApiBaseUrl/api/mobile/orders/upload-receipt'),
      );
      request.files.add(await http.MultipartFile.fromPath('file', image.path));
      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      final data = jsonDecode(responseBody);

      if (response.statusCode == 200 && data['ok'] == true) {
        setState(() => _transferReceiptUrl = data['publicUrl']);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['error'] ?? 'Error al subir la imagen')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error de conexión al subir la imagen')),
      );
    } finally {
      setState(() => _uploadingReceipt = false);
    }
  }

  Future<void> _confirmOrder() async {
    if (_cart.isEmpty || _creatingOrder) {
      return;
    }

    final address = _deliveryAddress.trim().isEmpty
        ? widget.account.address
        : _deliveryAddress.trim();

    if (address.isEmpty) {
      setState(() {
        _messages.add(
          ChatMessage.assistant(
            'Necesito una direccion de entrega. Usa tu direccion registrada o tu ubicacion actual.',
            isError: true,
          ),
        );
      });
      _scrollToBottom();
      return;
    }

    if (_paymentMethod == 'transferencia' && _transferAccounts.isEmpty) {
      setState(() {
        _messages.add(
          ChatMessage.assistant(
            'No hay cuentas bancarias habilitadas para transferencia. Elige efectivo o intenta mas tarde.',
            isError: true,
          ),
        );
      });
      _scrollToBottom();
      return;
    }

    if (_paymentMethod == 'transferencia' && _selectedTransferAccount == null) {
      setState(() {
        _messages.add(
          ChatMessage.assistant(
            'Escoge el banco al que haras la transferencia antes de confirmar el pedido.',
            isError: true,
          ),
        );
      });
      _scrollToBottom();
      return;
    }

    setState(() => _creatingOrder = true);

    try {
      final response = await postMobileApi('/api/mobile/orders', {
        'customer_name': _customerName,
        'customer_identity': widget.account.identity,
        'customer_phone': widget.account.phone,
        'channel': 'chatbot',
        'payment_method': _paymentMethod,
        if (_paymentMethod == 'transferencia' && _transferReceiptUrl != null)
          'transfer_receipt_url': _transferReceiptUrl,
        'notes': _buildOrderNotes(address),
        if (_deliveryPosition != null && _deliveryAddress.trim() == address)
          'delivery_lat': _deliveryPosition!.latitude,
        if (_deliveryPosition != null && _deliveryAddress.trim() == address)
          'delivery_lng': _deliveryPosition!.longitude,
        'items': _cart
            .map(
              (item) => {
                'product_id': item.product.id,
                if (item.presentation != null)
                  'presentation_id': item.presentation!.id,
                'quantity': _jsonQuantity(item.quantity),
              },
            )
            .toList(),
      });
      final order = response['order'] is Map
          ? Map<String, dynamic>.from(response['order'] as Map)
          : <String, dynamic>{};
      final orderCode = order['order_code']?.toString() ?? 'Pedido registrado';
      final total = _readDouble(order['total']);
      final receiptText = _buildReceiptText(
        orderCode: orderCode,
        total: total > 0 ? total : _cartTotal,
        address: address,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _messages.add(ChatMessage.assistant(receiptText));
        for (final m in _messages) {
          m.addedProductIds.clear();
        }
        _cart.clear();
        _transferReceiptUrl = null;
        _needsChange = false;
        _changeAmount = '';
        _paymentMethod = 'efectivo';
        _saveChatHistory();

        final newOrderId =
            order['id']?.toString() ?? order['order_id']?.toString();
        if (newOrderId != null && newOrderId.isNotEmpty) {
          _activeOrderId = newOrderId;
          SharedPreferences.getInstance().then(
            (p) => p.setString('${_chatPrefsKey}_active_order', newOrderId),
          );
          _startDeliveryPolling();
        }
      });
      _scrollToBottom();
    } on MobileApiException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        final message = _friendlyOrderError(error);
        final alreadyShown =
            _messages.isNotEmpty &&
            _messages.last.isError &&
            _messages.last.text == message;
        if (!alreadyShown) {
          _messages.add(ChatMessage.assistant(message, isError: true));
        }
      });
      _scrollToBottom();
    } finally {
      if (mounted) {
        setState(() => _creatingOrder = false);
      }
    }
  }

  String _friendlyOrderError(MobileApiException error) {
    if (error.statusCode == 0) {
      return 'No pude conectar con el servidor para guardar el pedido.';
    }

    final normalized = error.message.toLowerCase();
    if (normalized.contains('schema cache') ||
        normalized.contains('identity_number')) {
      return 'No pude registrar los datos del cliente. Intenta nuevamente en unos segundos.';
    }

    return error.message;
  }

  String _buildOrderNotes(String address) {
    if (_deliveryMethod == 'retiro') {
      return [
        'RETIRO EN LOCAL',
        'Pago: ${_paymentMethod == 'transferencia' ? 'Transferencia' : 'Efectivo'}',
        if (_paymentMethod == 'transferencia') _transferBankText(),
      ].join('\n');
    }
    return [
      'Entrega a domicilio',
      'Direccion: $address',
      'Pago: ${_paymentMethod == 'transferencia' ? _transferPaymentLabel() : 'Efectivo'}',
      if (_paymentMethod == 'efectivo' && _needsChange)
        'Necesita cambio/vuelto: Si${_changeAmount.trim().isNotEmpty ? ' (Para ${_changeAmount.trim()})' : ''}',
      if (_paymentMethod == 'transferencia') _transferBankText(),
    ].join('\n');
  }

  String _buildReceiptText({
    required String orderCode,
    required double total,
    required String address,
  }) {
    final subtotal = _cart.fold(0.0, (sum, item) => sum + item.baseLineTotal);
    final ivaAmount = total > subtotal ? total - subtotal : 0.0;

    final lines = <String>[
      'Pedido confirmado.',
      'Comprobante: $orderCode',
      'Cliente: ${widget.account.name}',
      'Cedula/RUC: ${widget.account.identity.trim().isNotEmpty ? widget.account.identity : "Consumidor Final"}',
      '',
      if (_deliveryMethod == 'retiro') ...[
        'Metodo de entrega: Retiro en el local',
        '',
      ] else ...[
        'Entrega a domicilio:',
        address,
        '',
      ],
      'Detalle:',
      ..._cart.map(_formatReceiptCartLine),
      '',
    ];

    if (ivaAmount > 0) {
      lines.addAll([
        'Subtotal: ${_formatMoney(subtotal)}',
        'IVA: ${_formatMoney(ivaAmount)}',
      ]);
    }

    lines.addAll([
      'Total: ${_formatMoney(total)}',
      '',
      _paymentMethod == 'transferencia'
          ? 'Metodo de pago: ${_transferPaymentLabel().toLowerCase()}.\n${_transferBankText()}\nEl comprobante ha sido adjuntado y esta sujeto a validacion.'
          : 'Metodo de pago: efectivo al momento de la entrega.${_needsChange ? ' (Requiere cambio/vuelto${_changeAmount.trim().isNotEmpty ? ' para ${_changeAmount.trim()}' : ''})' : ''}',
    ]);

    return lines.join('\n');
  }

  String _transferBankText() {
    final account = _selectedTransferAccount;

    if (account == null) {
      return 'Transferencia: sin cuenta bancaria habilitada para clientes.';
    }

    return [
      'Cuenta bancaria seleccionada',
      'Banco: ${account.bankName.trim().isEmpty ? "Banco por configurar" : account.bankName}',
      'Titular: ${account.holderName}',
      'Cedula/RUC: ${account.identityNumber}',
      'Cuenta: ${account.accountNumber}',
      if (account.email?.isNotEmpty == true) 'Correo: ${account.email}',
    ].join('\n');
  }

  String _transferPaymentLabel() {
    final bankName = _selectedTransferAccount?.bankName.trim();
    return bankName == null || bankName.isEmpty
        ? 'Transferencia'
        : 'Transferencia de banco $bankName';
  }

  Future<void> _copyReceiptPreview() async {
    if (_cart.isEmpty) {
      return;
    }

    final text = _buildReceiptText(
      orderCode: 'BORRADOR',
      total: _cartTotal,
      address: _deliveryAddress.trim().isEmpty
          ? widget.account.address
          : _deliveryAddress.trim(),
    );
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Borrador de comprobante copiado.')),
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOutCubic,
      );
    });
  }

  List<Map<String, Object?>> _buildChatHistory() {
    final start = _messages.length > 8 ? _messages.length - 8 : 0;
    final recentMessages = _messages.sublist(start);

    return recentMessages.map((message) {
      final productIds = message.productIds;

      return <String, Object?>{
        'role': message.isUser ? 'user' : 'assistant',
        'message': message.text,
        if (productIds.isNotEmpty) 'product_ids': productIds,
      };
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final firstName = _firstName;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFFF0D5), Color(0xFFFFF9F5), Color(0xFFFFD6E2)],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isCompact = constraints.maxWidth < 520;

              return Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 720),
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                      isCompact ? 12 : 18,
                      isCompact ? 10 : 18,
                      isCompact ? 12 : 18,
                      12,
                    ),
                    child: Column(
                      children: [
                        _ChatHeader(
                          firstName: _firstName,
                          compact: isCompact,
                          onLogout: () => Navigator.of(context).pop(),
                          onClearChat: _clearChat,
                        ),
                        const SizedBox(height: 12),
                        Expanded(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.94),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: AppColors.line),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.accent.withValues(
                                    alpha: 0.11,
                                  ),
                                  blurRadius: 32,
                                  offset: const Offset(0, 18),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(18),
                              child: Column(
                                children: [
                                  Expanded(
                                    child: ListView.separated(
                                      controller: _scrollController,
                                      padding: EdgeInsets.all(
                                        isCompact ? 14 : 18,
                                      ),
                                      itemCount: _messages.length,
                                      separatorBuilder: (_, _) =>
                                          const SizedBox(height: 12),
                                      itemBuilder: (context, index) {
                                        final message = _messages[index];
                                        return _ChatBubble(
                                          message: message,
                                          onDelete: () =>
                                              _deleteMessage(message.id),
                                          onConfirmDelivery:
                                              (orderId, action) =>
                                                  _handleDeliveryConfirmation(
                                                    message.id,
                                                    orderId,
                                                    action,
                                                  ),
                                          onAddProduct: (product, suggestion) =>
                                              _addSuggestedProductToCart(
                                                product,
                                                suggestion,
                                              ),
                                          onSelectProduct: (product) =>
                                              _startGuidedProductPurchase(
                                                product,
                                              ),
                                          onRemoveProduct:
                                              (product, suggestion) =>
                                                  _removeSuggestedProductFromCart(
                                                    product,
                                                    suggestion,
                                                  ),
                                          getCartQuantity: (productId) {
                                            return _cart
                                                .where(
                                                  (item) =>
                                                      item.product.id ==
                                                      productId,
                                                )
                                                .fold(
                                                  0.0,
                                                  (sum, item) =>
                                                      sum + item.stockQuantity,
                                                );
                                          },
                                          onAddProducts:
                                              (products, suggestions) =>
                                                  _addProductsToCart(
                                                    products,
                                                    suggestions,
                                                  ),
                                        );
                                      },
                                    ),
                                  ),
                                  if (_cart.isNotEmpty)
                                    _CartSummaryBar(
                                      cart: _cart,
                                      total: _cartTotal,
                                      onOpen: _showCheckout,
                                      onRemove: _removeCartItem,
                                    ),
                                  _ChatComposer(
                                    controller: _messageController,
                                    sending: _sending,
                                    onSend: () => _sendMessage(),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader({
    required this.firstName,
    required this.compact,
    required this.onLogout,
    required this.onClearChat,
  });

  final String firstName;
  final bool compact;
  final VoidCallback onLogout;
  final VoidCallback onClearChat;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.72)),
      ),
      child: Padding(
        padding: EdgeInsets.all(compact ? 12 : 16),
        child: Row(
          children: [
            Container(
              height: compact ? 48 : 56,
              width: compact ? 48 : 56,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.accent.withValues(alpha: 0.15),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset('assets/Logo2.png', fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bienvenido, $firstName',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.ink,
                      fontSize: compact ? 24 : 30,
                      fontWeight: FontWeight.w900,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Consulta productos, precios y disponibilidad.',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: compact ? 12 : 13,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: AppColors.ink),
              onSelected: (value) {
                if (value == 'clear') onClearChat();
                if (value == 'logout') onLogout();
              },
              itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                const PopupMenuItem<String>(
                  value: 'clear',
                  child: Text('Borrar todo el chat'),
                ),
                const PopupMenuItem<String>(
                  value: 'logout',
                  child: Text(
                    'Salir / Volver',
                    style: TextStyle(color: Colors.red),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CartSummaryBar extends StatelessWidget {
  const _CartSummaryBar({
    required this.cart,
    required this.total,
    required this.onOpen,
    required this.onRemove,
  });

  final List<CartItem> cart;
  final double total;
  final VoidCallback onOpen;
  final ValueChanged<CartItem> onRemove;

  @override
  Widget build(BuildContext context) {
    final itemCount = cart.length;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(
                Icons.shopping_cart_checkout_rounded,
                color: AppColors.accent,
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$itemCount ${itemCount == 1 ? 'producto' : 'productos'} en el pedido',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      'Total ${_formatMoney(total)}',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: onOpen,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Revisar pedido'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ...cart.map(
                  (item) => ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 230),
                    child: InputChip(
                      label: Text(
                        _formatCartItemName(item),
                        overflow: TextOverflow.ellipsis,
                      ),
                      tooltip: 'Quitar ${_formatCartItemName(item)}',
                      onDeleted: () => onRemove(item),
                      deleteIcon: const Icon(Icons.close_rounded, size: 16),
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                      backgroundColor: const Color(0xFFFFEEF2),
                      side: const BorderSide(color: AppColors.line),
                      labelStyle: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CartPanel extends StatelessWidget {
  const _CartPanel({
    required this.cart,
    required this.total,
    required this.transferAccounts,
    required this.selectedTransferAccountId,
    required this.deliveryAddress,
    required this.deliveryMethod,
    required this.paymentMethod,
    required this.loadingAddress,
    required this.creatingOrder,
    required this.onRegisteredAddress,
    required this.onCurrentAddress,
    required this.onDeliveryMethodChanged,
    required this.onPaymentChanged,
    required this.onTransferAccountChanged,
    required this.onRemove,
    required this.onClear,
    required this.onCopyPreview,
    required this.onConfirm,
    required this.needsChange,
    required this.changeAmount,
    required this.onNeedsChangeChanged,
    required this.onChangeAmountChanged,
    this.transferReceiptUrl,
    required this.uploadingReceipt,
    this.onAttachReceipt,
    this.onRemoveReceipt,
  });

  final List<CartItem> cart;
  final double total;
  final List<TransferAccount> transferAccounts;
  final String? selectedTransferAccountId;
  final String deliveryAddress;
  final String deliveryMethod;
  final String paymentMethod;
  final bool loadingAddress;
  final bool creatingOrder;
  final VoidCallback onRegisteredAddress;
  final VoidCallback onCurrentAddress;
  final ValueChanged<String> onDeliveryMethodChanged;
  final ValueChanged<String> onPaymentChanged;
  final ValueChanged<String> onTransferAccountChanged;
  final ValueChanged<CartItem> onRemove;
  final VoidCallback onClear;
  final VoidCallback onCopyPreview;
  final VoidCallback onConfirm;
  final bool needsChange;
  final String changeAmount;
  final ValueChanged<bool> onNeedsChangeChanged;
  final ValueChanged<String> onChangeAmountChanged;
  final String? transferReceiptUrl;
  final bool uploadingReceipt;
  final VoidCallback? onAttachReceipt;
  final VoidCallback? onRemoveReceipt;

  @override
  Widget build(BuildContext context) {
    final isTransfer = paymentMethod == 'transferencia';
    final hasTransferAccounts = transferAccounts.isNotEmpty;
    final addressText = deliveryAddress.trim().isEmpty
        ? 'Sin direccion de entrega seleccionada'
        : deliveryAddress.trim();

    return Container(
      width: double.infinity,
      clipBehavior: Clip.hardEdge,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.receipt_long_rounded,
                  color: AppColors.accent,
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Pedido en curso',
                    style: TextStyle(
                      color: AppColors.ink,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Text(
                  _formatMoney(total),
                  style: const TextStyle(
                    color: AppColors.accentDark,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...cart.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _CartLine(item: item, onRemove: () => onRemove(item)),
              ),
            ),
            const Divider(height: 18, color: AppColors.line),
            const Text(
              'Metodo de entrega',
              style: TextStyle(
                color: AppColors.ink,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 7),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _PaymentButton(
                  label: 'Entrega a domicilio',
                  icon: Icons.local_shipping_rounded,
                  selected: deliveryMethod == 'domicilio',
                  onTap: () => onDeliveryMethodChanged('domicilio'),
                ),
                _PaymentButton(
                  label: 'Retiro en el local',
                  icon: Icons.storefront_rounded,
                  selected: deliveryMethod == 'retiro',
                  onTap: () => onDeliveryMethodChanged('retiro'),
                ),
              ],
            ),
            if (deliveryMethod == 'domicilio') ...[
              const SizedBox(height: 12),
              const Text(
                'Direccion de entrega',
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.cream,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.line),
                ),
                child: Text(
                  addressText,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: onRegisteredAddress,
                    icon: const Icon(Icons.home_rounded, size: 17),
                    label: const Text('Registrada'),
                  ),
                  OutlinedButton.icon(
                    onPressed: loadingAddress ? null : onCurrentAddress,
                    icon: loadingAddress
                        ? const SizedBox(
                            height: 15,
                            width: 15,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.my_location_rounded, size: 17),
                    label: const Text('Ubicacion actual'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            const Text(
              'Metodo de pago',
              style: TextStyle(
                color: AppColors.ink,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 7),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _PaymentButton(
                  label: 'Efectivo',
                  icon: Icons.payments_rounded,
                  selected: paymentMethod == 'efectivo',
                  onTap: () => onPaymentChanged('efectivo'),
                ),
                _PaymentButton(
                  label: 'Transferencia',
                  icon: Icons.account_balance_rounded,
                  selected: isTransfer,
                  onTap: () => onPaymentChanged('transferencia'),
                ),
              ],
            ),
            if (paymentMethod == 'efectivo' && deliveryMethod != 'retiro') ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Checkbox(
                    value: needsChange,
                    onChanged: (val) => onNeedsChangeChanged(val ?? false),
                    activeColor: AppColors.accent,
                  ),
                  const Text(
                    '¿Necesita cambio / suelto?',
                    style: TextStyle(fontSize: 12, color: AppColors.ink),
                  ),
                ],
              ),
              if (needsChange)
                Padding(
                  padding: const EdgeInsets.only(left: 48.0, top: 4.0),
                  child: TextField(
                    decoration: const InputDecoration(
                      isDense: true,
                      hintText: '¿Para cuánto? (Ej. \$20)',
                      hintStyle: TextStyle(fontSize: 12, color: Colors.grey),
                      border: OutlineInputBorder(),
                    ),
                    style: const TextStyle(fontSize: 12),
                    onChanged: onChangeAmountChanged,
                  ),
                ),
            ],
            if (isTransfer) ...[
              const SizedBox(height: 10),
              _TransferAccountsBox(
                accounts: transferAccounts,
                selectedAccountId: selectedTransferAccountId,
                onSelected: onTransferAccountChanged,
              ),
              if (hasTransferAccounts) ...[
                const SizedBox(height: 12),
                if (transferReceiptUrl != null)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GestureDetector(
                        onTap: () {
                          showDialog<void>(
                            context: context,
                            builder: (ctx) => Dialog(
                              backgroundColor: Colors.transparent,
                              insetPadding: const EdgeInsets.all(16),
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  InteractiveViewer(
                                    child: Image.network(
                                      transferReceiptUrl!,
                                      fit: BoxFit.contain,
                                    ),
                                  ),
                                  Positioned(
                                    top: 0,
                                    right: 0,
                                    child: IconButton(
                                      icon: const Icon(
                                        Icons.close,
                                        color: Colors.white,
                                        size: 30,
                                      ),
                                      onPressed: () => Navigator.pop(ctx),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            transferReceiptUrl!,
                            width: 60,
                            height: 80,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => const Icon(
                              Icons.image_not_supported,
                              size: 40,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.check_circle,
                                  color: Colors.green,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                const Expanded(
                                  child: Text(
                                    'Comprobante adjuntado',
                                    style: TextStyle(
                                      color: Colors.green,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              onPressed: onRemoveReceipt,
                              icon: const Icon(Icons.close, size: 16),
                              label: const Text(
                                'Eliminar',
                                style: TextStyle(fontSize: 12),
                              ),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 0,
                                ),
                                minimumSize: const Size(0, 32),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: uploadingReceipt ? null : onAttachReceipt,
                      icon: uploadingReceipt
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.upload_file),
                      label: Text(
                        uploadingReceipt
                            ? 'Subiendo...'
                            : 'Adjuntar comprobante',
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.accent,
                        side: const BorderSide(color: AppColors.accent),
                      ),
                    ),
                  ),
              ],
            ],
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 8,
              runSpacing: 8,
              children: [
                TextButton.icon(
                  onPressed: onClear,
                  icon: const Icon(Icons.delete_outline_rounded),
                  label: const Text('Vaciar'),
                ),
                OutlinedButton.icon(
                  onPressed: onCopyPreview,
                  icon: const Icon(Icons.content_copy_rounded, size: 17),
                  label: const Text('Copiar'),
                ),
                FilledButton.icon(
                  onPressed:
                      creatingOrder || (isTransfer && !hasTransferAccounts)
                      ? null
                      : onConfirm,
                  icon: creatingOrder
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check_circle_rounded),
                  label: Text(creatingOrder ? 'Guardando' : 'Confirmar pedido'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CartLine extends StatelessWidget {
  const _CartLine({required this.item, required this.onRemove});

  final CartItem item;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBFD),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          _ProductThumb(imageUrl: item.product.imageUrl),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatCartItemName(item),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${_formatCartItemQuantity(item)} x ${_formatMoney(item.unitPrice)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            _formatMoney(item.lineTotal),
            style: const TextStyle(
              color: AppColors.accentDark,
              fontSize: 12.5,
              fontWeight: FontWeight.w900,
            ),
          ),
          IconButton(
            tooltip: 'Quitar',
            onPressed: onRemove,
            icon: const Icon(Icons.close_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}

class _TransferAccountsBox extends StatelessWidget {
  const _TransferAccountsBox({
    required this.accounts,
    required this.selectedAccountId,
    required this.onSelected,
  });

  final List<TransferAccount> accounts;
  final String? selectedAccountId;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    if (accounts.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF5D2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFFD86B)),
        ),
        child: const Text(
          'No hay cuentas bancarias habilitadas para transferencia.',
          style: TextStyle(
            color: AppColors.ink,
            fontSize: 12,
            fontWeight: FontWeight.w800,
            height: 1.35,
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: accounts
          .asMap()
          .entries
          .map((entry) {
            final index = entry.key + 1;
            final account = entry.value;
            final selected =
                account.id == selectedAccountId ||
                (selectedAccountId == null && index == 1);

            return InkWell(
              onTap: () => onSelected(account.id),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                margin: EdgeInsets.only(
                  bottom: index == accounts.length ? 0 : 8,
                ),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: selected ? const Color(0xFFFFF5D2) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected
                        ? AppColors.accent
                        : const Color(0xFFFFD86B),
                    width: selected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      selected
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: selected ? AppColors.accent : AppColors.muted,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            selected
                                ? 'Banco seleccionado'
                                : accounts.length > 1
                                ? 'Cuenta bancaria $index'
                                : 'Cuenta bancaria',
                            style: const TextStyle(
                              color: AppColors.accentDark,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            [
                              'Banco: ${account.bankName.trim().isEmpty ? "Banco por configurar" : account.bankName}',
                              'Titular: ${account.holderName}',
                              'Cedula/RUC: ${account.identityNumber}',
                              'Cuenta: ${account.accountNumber}',
                              if (account.email?.isNotEmpty == true)
                                'Correo: ${account.email}',
                            ].join('\n'),
                            style: const TextStyle(
                              color: AppColors.ink,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          })
          .toList(growable: false),
    );
  }
}

class _PaymentButton extends StatelessWidget {
  const _PaymentButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      selected: selected,
      onSelected: (_) => onTap(),
      avatar: Icon(
        icon,
        color: selected ? Colors.white : AppColors.accentDark,
        size: 17,
      ),
      label: Text(label),
      labelStyle: TextStyle(
        color: selected ? Colors.white : AppColors.ink,
        fontWeight: FontWeight.w900,
      ),
      selectedColor: AppColors.accent,
      backgroundColor: const Color(0xFFFFEEF2),
      side: BorderSide(color: selected ? AppColors.accent : AppColors.line),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    );
  }
}

class _ChatBubble extends StatefulWidget {
  const _ChatBubble({
    required this.message,
    required this.onAddProduct,
    required this.onRemoveProduct,
    required this.onAddProducts,
    required this.getCartQuantity,
    this.onSelectProduct,
    this.onDelete,
    this.onConfirmDelivery,
  });

  final ChatMessage message;
  final void Function(ChatProduct, SuggestedCartItem?) onAddProduct;
  final void Function(ChatProduct, SuggestedCartItem?) onRemoveProduct;
  final void Function(List<ChatProduct>, Map<String, SuggestedCartItem>)
  onAddProducts;
  final double Function(String) getCartQuantity;
  final void Function(ChatProduct)? onSelectProduct;
  final VoidCallback? onDelete;
  final void Function(String orderId, String action)? onConfirmDelivery;

  @override
  State<_ChatBubble> createState() => _ChatBubbleState();
}

class _ChatBubbleState extends State<_ChatBubble> {
  @override
  Widget build(BuildContext context) {
    final message = widget.message;
    final isUser = message.isUser;
    final background = isUser
        ? AppColors.accent
        : message.isError
        ? const Color(0xFFFFEEF2)
        : AppColors.cream;
    final foreground = isUser
        ? Colors.white
        : message.isError
        ? AppColors.accentDark
        : AppColors.ink;

    Widget bubble = Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isUser ? 16 : 4),
              bottomRight: Radius.circular(isUser ? 4 : 16),
            ),
            border: isUser ? null : Border.all(color: AppColors.line),
          ),
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.text,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    height: 1.38,
                  ),
                ),
                if (message.products.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ...message.products
                      .where((p) => !message.discardedProductIds.contains(p.id))
                      .map((product) {
                        final suggestion = message.suggestedItems[product.id];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _ChatProductCard(
                            product: product,
                            suggestion: suggestion,
                            isAdded: message.addedProductIds.contains(
                              product.id,
                            ),
                            onAdd: () {
                              setState(() {
                                message.addedProductIds.add(product.id);
                              });
                              widget.onAddProduct(product, suggestion);
                            },
                            onSelect: () {
                              widget.onSelectProduct?.call(product);
                            },
                            getCartQuantity: widget.getCartQuantity,
                            onRemoveAdded: () {
                              setState(() {
                                message.addedProductIds.remove(product.id);
                              });
                              widget.onRemoveProduct(product, suggestion);
                            },
                            onDiscard: () {
                              setState(() {
                                message.discardedProductIds.add(product.id);
                              });
                            },
                          ),
                        );
                      }),
                  Builder(
                    builder: (context) {
                      final visibleProducts = message.products
                          .where(
                            (p) => !message.discardedProductIds.contains(p.id),
                          )
                          .toList();
                      final pendingProducts = visibleProducts
                          .where(
                            (p) =>
                                message.suggestedItems.containsKey(p.id) &&
                                !message.addedProductIds.contains(p.id) &&
                                _canAddSuggestedProduct(
                                  p,
                                  message.suggestedItems[p.id],
                                ),
                          )
                          .toList();

                      if (visibleProducts.length > 1 &&
                          pendingProducts.length > 1) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 4, bottom: 8),
                          child: SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: () {
                                setState(() {
                                  for (final p in pendingProducts) {
                                    message.addedProductIds.add(p.id);
                                  }
                                });
                                widget.onAddProducts(
                                  pendingProducts,
                                  message.suggestedItems,
                                );
                              },
                              icon: const Icon(
                                Icons.playlist_add_check_circle_rounded,
                              ),
                              label: Text(
                                'Agregar los ${pendingProducts.length} ítems',
                              ),
                            ),
                          ),
                        );
                      }
                      return const SizedBox();
                    },
                  ),
                ],
                if (message.requiresDeliveryConfirmation &&
                    message.deliveryConfirmationAnswer == null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            '¿Recibiste tu pedido con éxito?',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: Colors.black87,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.green[600],
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                    ),
                                  ),
                                  icon: const Icon(
                                    Icons.check_circle_outline,
                                    size: 20,
                                  ),
                                  label: const Text(
                                    'Sí, lo recibí',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                  onPressed: () {
                                    if (message.activeOrderId != null &&
                                        widget.onConfirmDelivery != null) {
                                      widget.onConfirmDelivery!(
                                        message.activeOrderId!,
                                        'Si',
                                      );
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red[600],
                                    side: BorderSide(color: Colors.red[200]!),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 12,
                                    ),
                                  ),
                                  icon: const Icon(
                                    Icons.cancel_outlined,
                                    size: 20,
                                  ),
                                  label: const Text(
                                    'No lo he recibido',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                  onPressed: () {
                                    if (message.activeOrderId != null &&
                                        widget.onConfirmDelivery != null) {
                                      widget.onConfirmDelivery!(
                                        message.activeOrderId!,
                                        'No',
                                      );
                                    }
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );

    if (widget.onDelete != null) {
      bubble = GestureDetector(
        onLongPress: () {
          showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Eliminar mensaje'),
              content: const Text('¿Seguro que deseas borrar este mensaje?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancelar'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    widget.onDelete!();
                  },
                  child: const Text(
                    'Borrar',
                    style: TextStyle(color: Colors.red),
                  ),
                ),
              ],
            ),
          );
        },
        child: bubble,
      );
    }

    return bubble;
  }
}

class _ChatProductCard extends StatelessWidget {
  const _ChatProductCard({
    required this.product,
    required this.suggestion,
    required this.isAdded,
    required this.onAdd,
    required this.onSelect,
    required this.getCartQuantity,
    required this.onRemoveAdded,
    required this.onDiscard,
  });

  final ChatProduct product;
  final SuggestedCartItem? suggestion;
  final bool isAdded;
  final VoidCallback onAdd;
  final VoidCallback onSelect;
  final double Function(String) getCartQuantity;
  final VoidCallback onRemoveAdded;
  final VoidCallback onDiscard;

  @override
  Widget build(BuildContext context) {
    final suggestedPresentation = product.presentationById(
      suggestion?.presentationId,
    );
    final isOutOfStock = !_canAddSuggestedProduct(product, suggestion);
    final suggestedPresentationLabel = _suggestedPresentationLabel(
      product,
      suggestedPresentation,
      suggestion,
    );
    final isBundleSuggestion = suggestion?.parts.isNotEmpty == true;
    final isDefaultUnitSuggestion =
        suggestedPresentation != null &&
        !isBundleSuggestion &&
        suggestedPresentation.unitQuantity <= 1.001 &&
        (suggestion?.quantity ?? 1.0) == 1.0;

    final priceLabel = suggestion == null
        ? product.priceLabel
        : '$suggestedPresentationLabel ${_formatMoney(_suggestedCartItemTotal(product, suggestion))}';
    final addLabel = isOutOfStock
        ? 'Agotado'
        : isAdded
        ? 'Agregado'
        : suggestion == null
        ? 'Seleccionar'
        : suggestedPresentation != null && isDefaultUnitSuggestion
        ? 'Agregar'
        : suggestedPresentation != null || isBundleSuggestion
        ? 'Agregar $suggestedPresentationLabel'
        : 'Agregar';

    final cartQuantity = getCartQuantity(product.id);
    final availableStock = product.stock - cartQuantity;

    Widget stockBadge() {
      String stockText = 'Agotado';
      bool isAvailable = availableStock > 0;

      if (isAvailable) {
        if (suggestedPresentation != null &&
            suggestedPresentation.unitQuantity > 0) {
          final qty = availableStock / suggestedPresentation.unitQuantity;
          if (qty >= 1) {
            final qtyFloor = qty.floorToDouble();
            stockText =
                'Stock: ${_formatQuantity(qtyFloor)} ${suggestedPresentation.name}';
          } else {
            stockText =
                'Stock: ${_formatQuantity(availableStock)} ${product.measurementUnit}';
          }
        } else {
          stockText =
              'Stock: ${_formatQuantity(availableStock)} ${product.measurementUnit}';
        }
      }

      return Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: isAvailable ? Colors.green.shade50 : Colors.red.shade50,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: isAvailable ? Colors.green.shade200 : Colors.red.shade200,
              width: 1,
            ),
          ),
          child: Text(
            stockText,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            softWrap: false,
            style: TextStyle(
              color: isAvailable ? Colors.green.shade700 : Colors.red.shade700,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
    }

    Widget productDetails() {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            product.displayName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.ink,
              fontSize: 13.5,
              fontWeight: FontWeight.w900,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 6),
          stockBadge(),
        ],
      );
    }

    Widget addButton({required bool fullWidth}) {
      final isSelectMode = suggestion == null && !isAdded;
      return SizedBox(
        height: 34,
        width: fullWidth ? double.infinity : null,
        child: FilledButton(
          onPressed: (isOutOfStock || isAdded)
              ? null
              : (isSelectMode ? onSelect : onAdd),
          style: FilledButton.styleFrom(
            backgroundColor: isAdded ? Colors.grey.shade400 : AppColors.accent,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isAdded
                      ? Icons.check_circle_rounded
                      : isSelectMode
                      ? Icons.touch_app_rounded
                      : Icons.add_shopping_cart_rounded,
                  size: 15,
                ),
                const SizedBox(width: 4),
                Text(
                  addLabel,
                  maxLines: 1,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    Widget priceText({TextAlign align = TextAlign.right}) {
      return Text(
        priceLabel,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        textAlign: align,
        style: TextStyle(
          color: isOutOfStock ? Colors.grey.shade600 : AppColors.accentDark,
          fontSize: 13,
          fontWeight: FontWeight.w900,
        ),
      );
    }

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(11),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.line),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 360;

              if (compact) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _ProductThumb(imageUrl: product.imageUrl),
                        const SizedBox(width: 10),
                        Expanded(child: productDetails()),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Align(alignment: Alignment.centerRight, child: priceText()),
                    const SizedBox(height: 7),
                    addButton(fullWidth: true),
                  ],
                );
              }

              return Row(
                children: [
                  _ProductThumb(imageUrl: product.imageUrl),
                  const SizedBox(width: 10),
                  Expanded(child: productDetails()),
                  const SizedBox(width: 10),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 190),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        priceText(),
                        const SizedBox(height: 7),
                        addButton(fullWidth: false),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        Positioned(
          top: -6,
          right: -6,
          child: GestureDetector(
            onTap: isAdded ? onRemoveAdded : onDiscard,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.close_rounded,
                size: 16,
                color: Colors.red,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ProductThumb extends StatelessWidget {
  const _ProductThumb({required this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl?.trim();

    if (url == null || url.isEmpty) {
      return const _ProductThumbFallback();
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Image.network(
        url,
        height: 42,
        width: 42,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const _ProductThumbFallback(),
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) {
            return child;
          }

          return const _ProductThumbFallback(showProgress: true);
        },
      ),
    );
  }
}

class _ProductThumbFallback extends StatelessWidget {
  const _ProductThumbFallback({this.showProgress = false});

  final bool showProgress;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      width: 42,
      decoration: BoxDecoration(
        color: const Color(0xFFFFEEF2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: showProgress
          ? const Padding(
              padding: EdgeInsets.all(12),
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.shopping_basket_rounded, color: AppColors.accent),
    );
  }
}

class _ChatComposer extends StatelessWidget {
  const _ChatComposer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => sending ? null : onSend(),
              decoration: InputDecoration(
                hintText: 'Escribe tu mensaje...',
                prefixIcon: const Icon(Icons.search_rounded),
                filled: true,
                fillColor: AppColors.cream,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 15,
                  vertical: 13,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.line),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.line),
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
          ),
          const SizedBox(width: 10),
          SizedBox(
            height: 50,
            width: 50,
            child: FilledButton(
              onPressed: sending ? null : onSend,
              style: FilledButton.styleFrom(
                padding: EdgeInsets.zero,
                backgroundColor: AppColors.accent,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppColors.accent.withValues(
                  alpha: 0.48,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: sending
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: AppColors.warning,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.ink, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.ink,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEEF2),
        border: Border.all(color: AppColors.line),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded, color: AppColors.accent),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AppColors.accentDark,
                fontSize: 13,
                fontWeight: FontWeight.w800,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PasswordStrengthMeter extends StatelessWidget {
  const _PasswordStrengthMeter({required this.password});

  final String password;

  @override
  Widget build(BuildContext context) {
    final strength = _passwordStrength(password);
    final hasMinimumLength = password.length >= 8;
    final hasUppercase = RegExp(r'[A-Z]').hasMatch(password);
    final hasNumber = RegExp(r'\d').hasMatch(password);
    final hasSymbol = RegExp(r'[^A-Za-z0-9]').hasMatch(password);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: strength.value,
            minHeight: 9,
            backgroundColor: const Color(0xFFFFE1E8),
            color: strength.color,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          runSpacing: 4,
          children: [
            Text(
              strength.label,
              style: TextStyle(
                color: strength.color,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const Text(
              'Mínimo 8, mayúscula, números y símbolos',
              style: TextStyle(
                color: AppColors.muted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 7,
          runSpacing: 7,
          children: [
            _PasswordRulePill(
              label: '8 caracteres',
              completed: hasMinimumLength,
            ),
            _PasswordRulePill(label: '1 mayúscula', completed: hasUppercase),
            _PasswordRulePill(label: 'Números', completed: hasNumber),
            _PasswordRulePill(label: 'Símbolos', completed: hasSymbol),
          ],
        ),
      ],
    );
  }
}

class _PasswordRulePill extends StatelessWidget {
  const _PasswordRulePill({required this.label, required this.completed});

  final String label;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: completed ? const Color(0xFFE9F9EE) : const Color(0xFFFFF4F7),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: completed ? const Color(0xFF68B984) : AppColors.line,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            completed
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked,
            color: completed ? const Color(0xFF2F8D4E) : AppColors.muted,
            size: 14,
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: completed ? const Color(0xFF2F8D4E) : AppColors.muted,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class ChatMessage {
  ChatMessage._({
    String? id,
    DateTime? createdAt,
    required this.text,
    required this.isUser,
    this.products = const [],
    this.suggestedItems = const {},
    this.isError = false,
    this.requiresDeliveryConfirmation = false,
    this.activeOrderId,
    this.deliveryConfirmationAnswer,
    this.isCartNotice = false,
    this.cartProductIds = const [],
  }) : id = id ?? DateTime.now().microsecondsSinceEpoch.toString(),
       createdAt = createdAt ?? DateTime.now();

  factory ChatMessage.user(String text) {
    return ChatMessage._(text: text, isUser: true);
  }

  factory ChatMessage.assistant(
    String text, {
    List<ChatProduct> products = const [],
    Map<String, SuggestedCartItem> suggestedItems = const {},
    bool isError = false,
    bool requiresDeliveryConfirmation = false,
    String? activeOrderId,
    bool isCartNotice = false,
    List<String> cartProductIds = const [],
  }) {
    return ChatMessage._(
      text: text,
      isUser: false,
      products: products,
      suggestedItems: suggestedItems,
      isError: isError,
      requiresDeliveryConfirmation: requiresDeliveryConfirmation,
      activeOrderId: activeOrderId,
      isCartNotice: isCartNotice,
      cartProductIds: cartProductIds,
    );
  }

  final String id;
  final DateTime createdAt;
  final String text;
  final bool isUser;
  final List<ChatProduct> products;
  final Map<String, SuggestedCartItem> suggestedItems;
  final bool isError;
  final bool requiresDeliveryConfirmation;
  final String? activeOrderId;
  final bool isCartNotice;
  final List<String> cartProductIds;
  String? deliveryConfirmationAnswer;
  final Set<String> discardedProductIds = {};
  final Set<String> addedProductIds = {};

  List<String> get productIds => products
      .map((product) => product.id)
      .where((productId) => productId.isNotEmpty)
      .toList(growable: false);

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'createdAt': createdAt.toIso8601String(),
      'text': text,
      'isUser': isUser,
      'products': products.map((e) => e.toJson()).toList(),
      'suggestedItems': suggestedItems.map((k, v) => MapEntry(k, v.toJson())),
      'isError': isError,
      'requiresDeliveryConfirmation': requiresDeliveryConfirmation,
      'activeOrderId': activeOrderId,
      'deliveryConfirmationAnswer': deliveryConfirmationAnswer,
      'isCartNotice': isCartNotice,
      'cartProductIds': cartProductIds,
    };
  }

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final productsList = json['products'] as List<dynamic>? ?? [];
    final suggestedMap = json['suggestedItems'] as Map<String, dynamic>? ?? {};

    final msg = ChatMessage._(
      id: json['id'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      text: json['text'] as String? ?? '',
      isUser: json['isUser'] as bool? ?? false,
      products: productsList
          .map((p) => ChatProduct.fromJson(p as Map<String, dynamic>))
          .toList(),
      suggestedItems: SuggestedCartItem.mapFromJson(suggestedMap),
      isError: json['isError'] as bool? ?? false,
      requiresDeliveryConfirmation:
          json['requiresDeliveryConfirmation'] as bool? ?? false,
      activeOrderId: json['activeOrderId'] as String?,
      isCartNotice: json['isCartNotice'] as bool? ?? false,
      cartProductIds: (json['cartProductIds'] as List<dynamic>? ?? [])
          .map((value) => value.toString())
          .where((value) => value.isNotEmpty)
          .toList(growable: false),
    );
    msg.deliveryConfirmationAnswer =
        json['deliveryConfirmationAnswer'] as String?;
    return msg;
  }
}

class SuggestedCartItem {
  const SuggestedCartItem({
    required this.productId,
    required this.quantity,
    required this.presentationId,
    this.parts = const [],
  });

  final String productId;
  final double quantity;
  final String? presentationId;
  final List<SuggestedCartItem> parts;

  List<SuggestedCartItem> get effectiveParts => parts.isEmpty ? [this] : parts;

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'quantity': quantity,
    'presentationId': presentationId,
    if (parts.isNotEmpty) 'parts': parts.map((part) => part.toJson()).toList(),
  };

  factory SuggestedCartItem.fromJson(Map<String, dynamic> json) =>
      SuggestedCartItem(
        productId: (json['productId'] ?? json['product_id'])?.toString() ?? '',
        quantity: (json['quantity'] as num?)?.toDouble() ?? 1.0,
        presentationId: _readOptionalString(
          json['presentationId'] ?? json['presentation_id'],
        ),
        parts: (json['parts'] as List<dynamic>? ?? [])
            .whereType<Map>()
            .map(
              (part) =>
                  SuggestedCartItem.fromJson(Map<String, dynamic>.from(part)),
            )
            .toList(growable: false),
      );

  static Map<String, SuggestedCartItem> mapFromJson(Object? value) {
    if (value is! Map) {
      return const {};
    }

    final rawItems = value['items'] is List
        ? value['items'] as List
        : value.values.toList(growable: false);
    final suggestions = <String, SuggestedCartItem>{};
    for (final rawItem in rawItems) {
      final item = rawItem is Map<String, dynamic>
          ? rawItem
          : rawItem is Map
          ? Map<String, dynamic>.from(rawItem)
          : null;
      if (item == null) {
        continue;
      }

      final productId =
          (item['product_id'] ?? item['productId'])?.toString() ?? '';
      final quantity = _readDouble(item['quantity']);
      if (productId.isEmpty || quantity <= 0) {
        continue;
      }

      final next = SuggestedCartItem(
        productId: productId,
        quantity: quantity,
        presentationId: _readOptionalString(
          item['presentation_id'] ?? item['presentationId'],
        ),
      );
      final current = suggestions[productId];
      if (current == null) {
        suggestions[productId] = next;
      } else {
        suggestions[productId] = SuggestedCartItem(
          productId: productId,
          quantity: 1,
          presentationId: null,
          parts: [...current.effectiveParts, next],
        );
      }
    }

    return suggestions;
  }
}

class CartItem {
  const CartItem({
    required this.product,
    required this.quantity,
    this.presentation,
  });

  final ChatProduct product;
  final double quantity;
  final ChatPresentation? presentation;

  double get baseUnitPrice => presentation?.price ?? product.price;
  double get unitPrice {
    if (!product.hasIva) return baseUnitPrice;
    final ivaAmount = double.parse(
      (baseUnitPrice * product.ivaRate / 100).toStringAsFixed(2),
    );
    return baseUnitPrice + ivaAmount;
  }

  double get stockQuantity => quantity * (presentation?.unitQuantity ?? 1);
  double get lineTotal => unitPrice * quantity;
  double get baseLineTotal => baseUnitPrice * quantity;

  CartItem copyWith({double? quantity}) {
    return CartItem(
      product: product,
      quantity: quantity ?? this.quantity,
      presentation: presentation,
    );
  }
}

class ChatPresentation {
  const ChatPresentation({
    required this.id,
    required this.name,
    required this.unitQuantity,
    required this.price,
  });

  final String id;
  final String name;
  final double unitQuantity;
  final double price;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'unit_quantity': unitQuantity,
    'price': price,
  };

  factory ChatPresentation.fromJson(Map<String, dynamic> json) {
    return ChatPresentation(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Presentacion',
      unitQuantity: _readDouble(json['unit_quantity']),
      price: _readDouble(json['price']),
    );
  }

  static List<ChatPresentation> listFromJson(Object? value) {
    if (value is! List) {
      return const [];
    }

    return value
        .whereType<Map>()
        .map(
          (item) => ChatPresentation.fromJson(Map<String, dynamic>.from(item)),
        )
        .where(
          (presentation) =>
              presentation.id.isNotEmpty && presentation.unitQuantity > 0,
        )
        .toList(growable: false);
  }
}

class ChatProduct {
  const ChatProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.hasIva,
    required this.ivaRate,
    required this.measurementUnit,
    required this.stock,
    required this.imageUrl,
    this.presentations = const [],
  });

  final String id;
  final String name;
  final double price;
  final bool hasIva;
  final double ivaRate;
  final String measurementUnit;
  final double stock;
  final String? imageUrl;
  final List<ChatPresentation> presentations;

  double get priceWithIva {
    if (!hasIva) return price;
    final ivaAmount = double.parse((price * ivaRate / 100).toStringAsFixed(2));
    return price + ivaAmount;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'price': price,
    'has_iva': hasIva,
    'iva_rate': ivaRate,
    'measurement_unit': measurementUnit,
    'stock': stock,
    'image_url': imageUrl,
    'presentations': presentations.map((p) => p.toJson()).toList(),
  };

  String get priceLabel {
    final unit = isWeightBased ? 'Libra' : 'Unidad';
    return '$unit ${_formatMoney(priceWithIva)}';
  }

  String get stockLabel {
    return stock > 0 ? 'Disponible' : 'Agotado';
  }

  bool get isWeightBased => measurementUnit == 'lb';

  String get displayName => isWeightBased
      ? name
            .replaceFirst(RegExp(r'\s+100\s*lb\s*$', caseSensitive: false), '')
            .trim()
      : name;

  ChatPresentation? presentationById(String? presentationId) {
    if (presentationId == null || presentationId.isEmpty) {
      return null;
    }

    for (final presentation in presentations) {
      if (presentation.id == presentationId) {
        return presentation;
      }
    }

    return null;
  }

  factory ChatProduct.fromJson(Map<String, dynamic> json) {
    return ChatProduct(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Producto',
      price: _readDouble(json['price']),
      hasIva: json['has_iva'] == true,
      ivaRate: _readDouble(json['iva_rate']),
      measurementUnit: _normalizeMeasurementUnit(json['measurement_unit']),
      stock: _readDouble(json['stock']),
      imageUrl: _readOptionalString(json['image_url']),
      presentations: ChatPresentation.listFromJson(json['presentations']),
    );
  }

  static List<ChatProduct> listFromJson(Object? value) {
    if (value is! List) {
      return const [];
    }

    final products = <ChatProduct>[];
    for (final item in value) {
      if (item is Map<String, dynamic>) {
        products.add(ChatProduct.fromJson(item));
      } else if (item is Map) {
        products.add(ChatProduct.fromJson(Map<String, dynamic>.from(item)));
      }
    }

    return products;
  }
}

class TransferAccount {
  const TransferAccount({
    required this.id,
    required this.bankName,
    required this.holderName,
    required this.identityNumber,
    required this.accountNumber,
    required this.email,
    required this.isEnabled,
  });

  final String id;
  final String bankName;
  final String holderName;
  final String identityNumber;
  final String accountNumber;
  final String? email;
  final bool isEnabled;

  Map<String, dynamic> toJson() => {
    'bank_name': bankName,
    'holder_name': holderName,
    'identity_number': identityNumber,
    'account_number': accountNumber,
    'email': email,
    'is_enabled': isEnabled,
  };

  factory TransferAccount.fromJson(Map<String, dynamic> json) {
    return TransferAccount(
      id: json['id']?.toString() ?? '',
      bankName: json['bank_name']?.toString() ?? '',
      holderName: json['holder_name']?.toString() ?? '',
      identityNumber: json['identity_number']?.toString() ?? '',
      accountNumber: json['account_number']?.toString() ?? '',
      email: _readOptionalString(json['email']),
      isEnabled: json['is_enabled'] != false,
    );
  }

  static List<TransferAccount> listFromJson(Object? value) {
    if (value is! List) {
      return const [];
    }

    return value
        .whereType<Map>()
        .map(
          (item) => TransferAccount.fromJson(Map<String, dynamic>.from(item)),
        )
        .where((account) => account.id.isNotEmpty)
        .toList(growable: false);
  }
}

class ClientAccount {
  const ClientAccount({
    this.id = '',
    required this.name,
    required this.identity,
    required this.email,
    required this.phone,
    required this.address,
    required this.password,
    this.source = 'android',
    this.isAdmin = false,
    this.role = 'cliente',
  });

  final String id;
  final String name;
  final String identity;
  final String email;
  final String phone;
  final String address;
  final String password;
  final String source;
  final bool isAdmin;
  final String role;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'identity': identity,
      'email': email,
      'phone': phone,
      'address': address,
      'password': password,
      'source': source,
      'isAdmin': isAdmin,
      'role': role,
    };
  }

  factory ClientAccount.fromJson(Map<String, dynamic> json) {
    return ClientAccount(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      identity: json['identity'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      address: json['address'] as String? ?? '',
      password: json['password'] as String? ?? '',
      source: json['source'] as String? ?? 'android',
      isAdmin: json['isAdmin'] as bool? ?? false,
      role: json['role'] as String? ?? 'cliente',
    );
  }

  factory ClientAccount.fromServerJson(
    Map<String, dynamic> json, {
    required String password,
  }) {
    return ClientAccount(
      id: json['id'] as String? ?? '',
      name: json['full_name'] as String? ?? '',
      identity: json['identity_number'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      address: json['address'] as String? ?? '',
      password: password,
      source: json['source'] as String? ?? 'android',
      isAdmin: json['role'] == 'admin',
      role: json['role'] as String? ?? 'cliente',
    );
  }
}

class LocationException implements Exception {
  const LocationException(this.message);

  final String message;
}

class MobileApiException implements Exception {
  const MobileApiException(this.message, {required this.statusCode});

  final String message;
  final int statusCode;
}

class PasswordRecoveryLookup {
  const PasswordRecoveryLookup({required this.exists, required this.email});

  final bool exists;
  final String? email;
}

class PasswordStrength {
  const PasswordStrength({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final double value;
  final Color color;
}

PasswordStrength _passwordStrength(String password) {
  if (password.isEmpty) {
    return const PasswordStrength(
      label: 'Esperando contrasena',
      value: 0.08,
      color: AppColors.muted,
    );
  }

  final hasMinimumLength = password.length >= 8;
  final hasUppercase = RegExp(r'[A-Z]').hasMatch(password);
  final hasNumber = RegExp(r'\d').hasMatch(password);
  final hasLowercase = RegExp(r'[a-z]').hasMatch(password);
  final hasSymbol = RegExp(r'[^A-Za-z0-9]').hasMatch(password);

  var score = 0;
  if (hasMinimumLength) score++;
  if (hasUppercase) score++;
  if (hasNumber) score++;
  if (hasLowercase) score++;
  if (hasSymbol || password.length >= 12) score++;

  if (score <= 1) {
    return const PasswordStrength(
      label: 'Muy debil',
      value: 0.22,
      color: Color(0xFFE53935),
    );
  }

  if (score == 2) {
    return const PasswordStrength(
      label: 'Debil',
      value: 0.45,
      color: Color(0xFFF57C00),
    );
  }

  if (hasMinimumLength && hasUppercase && hasNumber && score >= 5) {
    return const PasswordStrength(
      label: 'Muy segura',
      value: 1,
      color: Color(0xFF2E7D32),
    );
  }

  if (hasMinimumLength && hasUppercase && hasNumber) {
    return const PasswordStrength(
      label: 'Segura',
      value: 0.78,
      color: Color(0xFF43A047),
    );
  }

  return const PasswordStrength(
    label: 'Aceptable',
    value: 0.62,
    color: Color(0xFFFBC02D),
  );
}

Future<String> resolveCurrentAddressFromGps() async {
  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw const LocationException('Activa el GPS para detectar tu direccion.');
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }

  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever) {
    throw const LocationException(
      'Permite el acceso a la ubicacion o escribe la direccion manualmente.',
    );
  }

  final position = await Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
  );

  return reverseGeocodePosition(position);
}

Future<String> reverseGeocodePosition(Position position) async {
  final coordinates =
      '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';

  final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', {
    'format': 'jsonv2',
    'lat': position.latitude.toString(),
    'lon': position.longitude.toString(),
    'zoom': '18',
    'addressdetails': '1',
    'accept-language': 'es',
  });

  final headers = <String, String>{'Accept': 'application/json'};
  if (!kIsWeb) {
    headers['User-Agent'] = 'MinimarketIATesis/1.0';
  }

  final response = await http
      .get(uri, headers: headers)
      .timeout(const Duration(seconds: 8));

  if (response.statusCode != 200) {
    return 'Ubicacion GPS: $coordinates';
  }

  final payload = jsonDecode(response.body) as Map<String, dynamic>;
  final displayName = payload['display_name'];
  if (displayName is String && displayName.trim().isNotEmpty) {
    return displayName;
  }

  return 'Ubicacion GPS: $coordinates';
}

double _readDouble(Object? value) {
  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value?.toString() ?? '') ?? 0;
}

bool _canAddSuggestedProduct(
  ChatProduct product,
  SuggestedCartItem? suggestion,
) {
  final parts = suggestion?.effectiveParts ?? const <SuggestedCartItem>[];
  final requiredQuantity = parts.isEmpty
      ? 1.0
      : parts.fold(0.0, (sum, part) {
          final presentation = product.presentationById(part.presentationId);
          return sum + part.quantity * (presentation?.unitQuantity ?? 1.0);
        });

  return product.stock + 0.001 >= requiredQuantity;
}

double _suggestedCartItemTotal(
  ChatProduct product,
  SuggestedCartItem? suggestion,
) {
  final parts = suggestion?.effectiveParts ?? const <SuggestedCartItem>[];
  if (parts.isEmpty) {
    return CartItem(product: product, quantity: 1).lineTotal;
  }

  return parts.fold(0.0, (sum, part) {
    final presentation = product.presentationById(part.presentationId);
    return sum +
        CartItem(
          product: product,
          quantity: part.quantity,
          presentation: presentation,
        ).lineTotal;
  });
}

String _suggestedPresentationLabel(
  ChatProduct product,
  ChatPresentation? presentation,
  SuggestedCartItem? suggestion,
) {
  if (suggestion?.parts.isNotEmpty == true) {
    return suggestion!.parts
        .map(
          (part) => _suggestedPresentationLabel(
            product,
            product.presentationById(part.presentationId),
            part,
          ),
        )
        .join(' + ');
  }

  final label =
      presentation?.name ?? (product.isWeightBased ? 'Libra' : 'Unidad');
  final quantity = suggestion?.quantity ?? 1.0;

  if (presentation != null && (quantity - 0.5).abs() < 0.001) {
    return '${_halfPresentationPrefix(label)} $label';
  }

  if (presentation != null && (quantity - 1).abs() >= 0.001) {
    return _formatPresentationQuantity(
      quantity,
      label,
      presentation.unitQuantity,
    );
  }

  return label;
}

String _formatPresentationQuantity(
  double quantity,
  String presentationName,
  double unitQuantity,
) {
  if ((quantity - 0.5).abs() < 0.001) {
    return '${_halfPresentationPrefix(presentationName)} $presentationName';
  }

  final wholeQuantity = quantity.floorToDouble();
  final fractionalQuantity = double.parse(
    (quantity - wholeQuantity).toStringAsFixed(3),
  );

  if (wholeQuantity > 0 && fractionalQuantity > 0.001 && unitQuantity > 1.001) {
    final wholeLabel =
        '${_formatQuantity(wholeQuantity)} ${_pluralPresentationName(presentationName, wholeQuantity)}';
    final remainderQuantity = double.parse(
      (fractionalQuantity * unitQuantity).toStringAsFixed(3),
    );

    if ((fractionalQuantity - 0.5).abs() < 0.001) {
      return '$wholeLabel + ${_halfPresentationPrefix(presentationName)} $presentationName';
    }

    return '$wholeLabel + ${_formatQuantity(remainderQuantity)} ${_pluralUnitLabel('unidad', remainderQuantity)}';
  }

  return '${_formatQuantity(quantity)} ${_pluralPresentationName(presentationName, quantity)}';
}

String _pluralPresentationName(String presentationName, double quantity) {
  if ((quantity - 1).abs() < 0.001) {
    return presentationName;
  }

  final words = presentationName.trim().split(RegExp(r'\s+'));
  if (words.isEmpty) {
    return presentationName;
  }

  words[words.length - 1] = _pluralUnitLabel(words.last, quantity);
  return words.join(' ');
}

String _pluralUnitLabel(String unit, double quantity) {
  if ((quantity - 1).abs() < 0.001) {
    return unit;
  }

  if (unit == 'unidad') {
    return 'unidades';
  }

  if (unit.endsWith('z')) {
    return '${unit.substring(0, unit.length - 1)}ces';
  }

  if (RegExp(r'[aeiou]$', caseSensitive: false).hasMatch(unit)) {
    return '${unit}s';
  }

  if (RegExp(r'[lnrd]$', caseSensitive: false).hasMatch(unit)) {
    return '${unit}es';
  }

  return '${unit}s';
}

String _halfPresentationPrefix(String presentationName) {
  final normalized = presentationName.trim().toLowerCase();
  final words = normalized
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty);
  final firstWord = words.isEmpty ? '' : words.first;
  const feminineWords = {
    'botella',
    'caja',
    'docena',
    'funda',
    'lata',
    'paca',
    'unidad',
  };

  return feminineWords.contains(firstWord) ? 'Media' : 'Medio';
}

String? _readOptionalString(Object? value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}

String _normalizeMeasurementUnit(Object? value) {
  final normalized = value?.toString().trim().toLowerCase() ?? '';
  if (normalized.contains('lb') ||
      normalized.contains('libra') ||
      normalized.contains('granel')) {
    return 'lb';
  }

  return 'unit';
}

String _formatMoney(double value) {
  return '\$${value.toStringAsFixed(2)}';
}

double _invoiceItemIvaRate(Map<String, dynamic> item) {
  if (item['has_iva'] != true) {
    return 0;
  }

  final value = item['iva_rate'];
  if (value is num && value > 0) {
    return value.toDouble();
  }

  final parsed = double.tryParse(value?.toString() ?? '') ?? 0;
  return parsed > 0 ? parsed : 15.0;
}

double _invoicePriceWithIva(double value, double ivaRate) {
  if (ivaRate <= 0) {
    return value;
  }

  return double.parse((value + value * ivaRate / 100).toStringAsFixed(2));
}

String _invoiceFormatIvaRate(double value) {
  if (value % 1 == 0) {
    return value.toStringAsFixed(0);
  }

  return value.toStringAsFixed(2);
}

Widget _buildInvoiceColumnSummary({
  required double subtotal,
  required double total,
  required Color accentColor,
}) {
  final ivaAmount = total > subtotal ? total - subtotal : 0.0;
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    margin: const EdgeInsets.fromLTRB(8, 16, 8, 0),
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
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('IVA (15%):', style: TextStyle(fontSize: 12)),
            Text(
              '\$${ivaAmount.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
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

Widget _buildInvoiceSummaryLine({
  required String label,
  required String value,
}) {
  return Row(
    children: [
      const Expanded(flex: 5, child: SizedBox.shrink()),
      const Expanded(flex: 2, child: SizedBox.shrink()),
      Expanded(
        flex: 2,
        child: Text(
          label,
          textAlign: TextAlign.right,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
        ),
      ),
      Expanded(
        flex: 2,
        child: Text(
          value,
          textAlign: TextAlign.right,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
        ),
      ),
      const Expanded(flex: 2, child: SizedBox.shrink()),
    ],
  );
}

String _buildCartAddedMessage(CartItem item) {
  final productName = item.product.displayName;
  final presentation = item.presentation;

  if (_isQuintalBasedCartItem(item) &&
      presentation != null &&
      (presentation.unitQuantity - 1).abs() >= 0.001) {
    if (_isHalfQuintalCartItem(item)) {
      return 'El medio quintal de $productName (${_formatQuantity(item.stockQuantity)} lb) se agrego al pedido. Puedes seguir comprando o revisar el pedido.';
    }

    return 'El ${presentation.name} de $productName (${_formatQuantity(item.stockQuantity)} lb) se agrego al pedido. Puedes seguir comprando o revisar el pedido.';
  }

  if (_isQuintalBasedCartItem(item) || item.product.isWeightBased) {
    return 'Las ${_formatQuantity(item.stockQuantity)} libras de $productName se agregaron al pedido. Puedes seguir comprando o revisar el pedido.';
  }

  return 'Se agrego ${_formatCartItemQuantity(item)} de $productName al pedido. Puedes seguir comprando o revisar el pedido.';
}

String _formatReceiptCartLine(CartItem item) {
  final productName = _formatCartItemName(item);
  final quantity = _formatCartItemQuantity(item);

  if (!item.product.hasIva) {
    return '- $productName: $quantity x ${_formatMoney(item.baseUnitPrice)} = ${_formatMoney(item.baseLineTotal)}';
  }

  return '- $productName: $quantity x ${_formatMoney(item.baseUnitPrice)} sin IVA / ${_formatMoney(item.unitPrice)} con IVA (${_invoiceFormatIvaRate(item.product.ivaRate)}%) = ${_formatMoney(item.lineTotal)}';
}

String _formatCartItemName(CartItem item) {
  final presentation = item.presentation;
  if (_isQuintalBasedCartItem(item) &&
      presentation != null &&
      (presentation.unitQuantity - 1).abs() >= 0.001) {
    if (_isHalfQuintalCartItem(item)) {
      return 'Medio quintal ${item.product.displayName} ${_formatQuantity(item.stockQuantity)} lb';
    }

    return '${presentation.name} ${item.product.displayName} ${_formatQuantity(item.stockQuantity)} lb';
  }

  return item.product.displayName;
}

String _formatCartItemQuantity(CartItem item) {
  final product = item.product;
  final quantity = item.stockQuantity;
  final normalized = _formatQuantity(quantity);

  if (product.isWeightBased || _isQuintalBasedCartItem(item)) {
    final presentationName = item.presentation?.name.trim();
    if ((quantity - 50).abs() < 0.001) {
      return '$normalized lb (medio quintal)';
    }

    final quintalCount = quantity / 100;
    if (quantity >= 100) {
      final quintals = _formatQuantity(quintalCount);
      return '$normalized lb ($quintals quintal${(quintalCount - 1).abs() < 0.001 ? '' : 'es'})';
    }

    if (presentationName?.isNotEmpty == true &&
        (item.presentation!.unitQuantity - 1).abs() >= 0.001) {
      return '$normalized lb ($presentationName)';
    }

    return '$normalized lb';
  }

  final presentationName = item.presentation?.name.trim();
  if (presentationName?.isNotEmpty == true &&
      (item.presentation!.unitQuantity - 1).abs() >= 0.001) {
    return _formatPresentationQuantity(
      item.quantity,
      presentationName!,
      item.presentation!.unitQuantity,
    );
  }

  return '${_formatQuantity(item.quantity)} unidad${item.quantity == 1 ? '' : 'es'}';
}

bool _isHalfQuintalCartItem(CartItem item) {
  final presentation = item.presentation;

  return presentation != null &&
      (presentation.unitQuantity - 100).abs() < 0.001 &&
      (item.quantity - 0.5).abs() < 0.001;
}

bool _isQuintalBasedCartItem(CartItem item) {
  final presentation = item.presentation;

  return presentation != null &&
      ((presentation.unitQuantity - 100).abs() < 0.001 ||
          _normalizeCartPresentationName(
            presentation.name,
          ).contains('quintal'));
}

String _normalizeCartPresentationName(String value) {
  return value
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[áàäâ]'), 'a')
      .replaceAll(RegExp(r'[éèëê]'), 'e')
      .replaceAll(RegExp(r'[íìïî]'), 'i')
      .replaceAll(RegExp(r'[óòöô]'), 'o')
      .replaceAll(RegExp(r'[úùüû]'), 'u')
      .replaceAll(RegExp(r'\s+'), ' ');
}

num _jsonQuantity(double value) {
  final normalized = double.parse(value.toStringAsFixed(3));

  if (normalized % 1 == 0) {
    return normalized.toInt();
  }

  return normalized;
}

String _formatQuantity(double value) {
  final fixed = value.toStringAsFixed(3);
  return fixed.replaceFirst(RegExp(r'\.?0+$'), '');
}

String? _required(String? value) {
  if (value == null || value.trim().isEmpty) {
    return 'Este campo es obligatorio.';
  }
  return null;
}

String? _identityValidator(String? value) {
  final cleanId = value?.trim().toUpperCase() ?? '';
  if (cleanId.isEmpty) {
    return 'La cedula es obligatoria.';
  }

  // Cédula venezolana (V o E opcional)
  if (RegExp(r'^([VE]-?)?\d{6,8}$').hasMatch(cleanId)) {
    return null;
  }

  final ecuadorianCleanId = cleanId.replaceAll(RegExp(r'[^0-9]'), '');
  if (ecuadorianCleanId.length != 10 && ecuadorianCleanId.length != 13) {
    return 'La cédula o RUC no es válido.';
  }

  int sum = 0;
  for (int i = 0; i < 9; i++) {
    int val = int.tryParse(ecuadorianCleanId[i]) ?? 0;
    if (i % 2 == 0) {
      val *= 2;
      if (val > 9) val -= 9;
    }
    sum += val;
  }
  int checkDigit = (10 - (sum % 10)) % 10;
  int lastDigit = int.tryParse(ecuadorianCleanId[9]) ?? -1;

  if (checkDigit != lastDigit) {
    return 'La cédula o RUC no es válido.';
  }

  return null;
}

String? _emailValidator(String? value) {
  final text = value?.trim() ?? '';
  if (text.isEmpty) {
    return 'Ingresa un correo valido (use @gmail, @hotmail, etc).';
  }
  final regex = RegExp(
    r'^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|yahoo\.es|live\.com|icloud\.com)$',
    caseSensitive: false,
  );
  if (!regex.hasMatch(text)) {
    return 'Correo inválido (use @gmail, @hotmail, etc).';
  }
  return null;
}

String? _phoneValidator(String? value) {
  final text = value?.replaceAll(RegExp(r'[\s\-\(\)]'), '') ?? '';
  if (text.isEmpty) {
    return 'El telefono es obligatorio.';
  }
  if (RegExp(r'^09\d{8}$').hasMatch(text)) return null;
  if (RegExp(r'^0\d{8}$').hasMatch(text)) return null;
  if (RegExp(r'^\+?593\d{8,9}$').hasMatch(text)) return null;
  if (RegExp(r'^1800\d{6}$').hasMatch(text)) return null;

  return 'Número de teléfono inválido.';
}

String? _loginPasswordValidator(String? value) {
  final text = value ?? '';
  if (text.isEmpty) {
    return 'La contrasena es obligatoria.';
  }
  return null;
}

String? _strongPasswordValidator(String? value) {
  final text = value ?? '';
  if (text.isEmpty) {
    return 'La contrasena es obligatoria.';
  }
  if (text.length < 8) {
    return 'Usa minimo 8 caracteres.';
  }
  if (!RegExp(r'[A-Z]').hasMatch(text)) {
    return 'Agrega al menos una mayuscula.';
  }
  if (!RegExp(r'\d').hasMatch(text)) {
    return 'Agrega al menos un numero.';
  }
  if (!RegExp(r'[^A-Za-z0-9]').hasMatch(text)) {
    return 'Agrega al menos un simbolo.';
  }
  return null;
}

class MainMenuScreen extends StatefulWidget {
  const MainMenuScreen({super.key, required this.account});

  final ClientAccount account;

  @override
  State<MainMenuScreen> createState() => _MainMenuScreenState();
}

class _MainMenuScreenState extends State<MainMenuScreen> {
  static const String _menuOrderPreferencesKey = 'client_menu_order';
  static const List<String> _defaultMenuOrder = ['assistant', 'purchases'];

  Timer? _clientOrderTimer;
  String? _watchedOrderId;
  bool _clientOrderWatcherPaused = false;
  bool _hasNotifiedClientDeliveryFailed = false;
  bool _hasNotifiedClientDeliveryConfirmed = false;
  bool _hasNotifiedClientDelivered = false;
  bool _hasNotifiedClientReadyForPickup = false;
  bool _hasNotifiedClientTransferRejected = false;
  List<String> _menuOrder = List<String>.of(_defaultMenuOrder);

  ClientAccount get account => widget.account;
  String get _chatPrefsKey => 'minimarket_chat_history_${account.identity}';
  static const _transferPaymentRejectedChatText =
      'Su pedido fue cancelado por la Administracion por el motivo que su comprobante de pago no pudo ser validado, Porfavor verifique su comprobante de pago y solicite el pedido nuevamente';

  @override
  void initState() {
    super.initState();
    unawaited(_loadMenuOrder());
    unawaited(_loadWatchedOrder());
    _clientOrderTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => unawaited(_checkClientOrderNotification()),
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
    _clientOrderTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadWatchedOrder() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final orderId = prefs.getString('${_chatPrefsKey}_active_order');
      if (!mounted || orderId == null || orderId.isEmpty) {
        _watchedOrderId = null;
        return;
      }
      _watchedOrderId = orderId;
      await _checkClientOrderNotification(initial: true);
    } catch (_) {}
  }

  Future<void> _checkClientOrderNotification({bool initial = false}) async {
    if (_clientOrderWatcherPaused) {
      return;
    }

    var orderId = _watchedOrderId;
    if (orderId == null || orderId.isEmpty) {
      try {
        final prefs = await SharedPreferences.getInstance();
        orderId = prefs.getString('${_chatPrefsKey}_active_order');
        _watchedOrderId = orderId;
      } catch (_) {
        return;
      }
    }

    if (orderId == null || orderId.isEmpty) {
      return;
    }

    try {
      final res = await getMobileApi('/api/mobile/orders/$orderId');
      if (res['ok'] != true) {
        return;
      }

      final status = res['status']?.toString() ?? '';
      final notes = res['notes']?.toString() ?? '';
      final isRetiroLocal = notes.toUpperCase().contains('RETIRO EN LOCAL');
      final isTransferPaymentRejected = _isTransferPaymentRejectedNotes(notes);
      final shouldWritePickupChatMessageOnInitial =
          initial &&
          isRetiroLocal &&
          (status == 'confirmed' || status == 'delivered');
      final shouldWriteTransferRejectionOnInitial =
          initial && status == 'cancelled' && isTransferPaymentRejected;

      if (initial &&
          !shouldWritePickupChatMessageOnInitial &&
          !shouldWriteTransferRejectionOnInitial) {
        return;
      }

      if (status == 'cancelled' && isTransferPaymentRejected) {
        if (!_hasNotifiedClientTransferRejected) {
          _hasNotifiedClientTransferRejected = true;
          if (!initial) {
            unawaited(
              AppNotificationService.showOrderAlert(
                title: 'Pago no validado',
                body: _transferPaymentRejectedChatText,
              ),
            );
          }
          unawaited(
            _appendAssistantChatMessageIfMissing(
              'transfer_payment_rejected',
              _transferPaymentRejectedChatText,
              orderId: orderId,
            ),
          );
        }
        _watchedOrderId = null;
        unawaited(
          SharedPreferences.getInstance().then(
            (p) => p.remove('${_chatPrefsKey}_active_order'),
          ),
        );
      } else if (status == 'confirmed') {
        if (isRetiroLocal) {
          if (!_hasNotifiedClientReadyForPickup) {
            _hasNotifiedClientReadyForPickup = true;
            final ticketMatch = RegExp(r'TICKET:\s*([0-9]+)').firstMatch(notes);
            final ticket = ticketMatch != null
                ? ticketMatch.group(1) ?? ''
                : '';
            final ticketText = ticket.isNotEmpty ? ' TICKET: $ticket' : '';

            if (!initial) {
              unawaited(
                AppNotificationService.showOrderAlert(
                  title: 'Tu pedido está listo',
                  body:
                      '🎟️ Tu pedido$ticketText está listo para ser retirado en el local. 🛍️',
                ),
              );
            }
            unawaited(
              _appendAssistantChatMessageIfMissing(
                'pickup_ready',
                '🎟️ Tu pedido$ticketText está listo para ser retirado en el local. 🛍️',
                orderId: orderId,
              ),
            );
          }
        } else {
          if (!_hasNotifiedClientDeliveryConfirmed &&
              res['delivery_user'] != null) {
            _hasNotifiedClientDeliveryConfirmed = true;
            final deliveryUser = res['delivery_user'];
            final name = deliveryUser['name'] ?? 'asignado';
            unawaited(
              AppNotificationService.showOrderAlert(
                title: 'Tu pedido va en camino',
                body: 'El delivery $name esta llevando tu pedido.',
              ),
            );
          }
        }
      } else if (status == 'delivered' && !_hasNotifiedClientDelivered) {
        _hasNotifiedClientDelivered = true;

        if (isRetiroLocal) {
          if (!initial) {
            unawaited(
              AppNotificationService.showOrderAlert(
                title: 'Pedido entregado',
                body:
                    '✅ Tu pedido ha sido entregado. ¡Gracias por tu compra! 🛒',
              ),
            );
          }
          unawaited(
            _appendAssistantChatMessageIfMissing(
              'pickup_delivered',
              '✅ Tu pedido ha sido entregado. ¡Gracias por tu compra! 🛒',
              orderId: orderId,
            ),
          );
        } else {
          unawaited(
            AppNotificationService.showOrderAlert(
              title: 'Pedido entregado',
              body:
                  'Tu pedido fue marcado como entregado. Entra al chat para confirmar si lo recibiste.',
            ),
          );
        }
      } else if (status == 'preparing' && !_hasNotifiedClientDeliveryFailed) {
        final notes = res['notes']?.toString() ?? '';
        if (notes.toLowerCase().contains('repartidor report')) {
          _hasNotifiedClientDeliveryFailed = true;
          unawaited(
            AppNotificationService.showOrderAlert(
              title: 'Problema con la entrega',
              body: 'El repartidor no pudo concretar la entrega.',
            ),
          );
        }
      }
    } catch (_) {}
  }

  Future<void> _appendAssistantChatMessageIfMissing(
    String marker,
    String text, {
    String? orderId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_chatPrefsKey);
      final messages = <ChatMessage>[];

      if (jsonStr != null && jsonStr.isNotEmpty) {
        final decoded = jsonDecode(jsonStr) as List<dynamic>;
        messages.addAll(
          decoded.map(
            (entry) => ChatMessage.fromJson(entry as Map<String, dynamic>),
          ),
        );
      }

      final exists = messages.any(
        (message) => _chatMessageMatchesMarker(message, marker, orderId),
      );
      if (exists) {
        return;
      }

      messages.add(ChatMessage.assistant(text, activeOrderId: orderId));
      await prefs.setString(
        _chatPrefsKey,
        jsonEncode(messages.map((message) => message.toJson()).toList()),
      );
    } catch (_) {}
  }

  bool _isTransferPaymentRejectedNotes(String notes) {
    final normalized = notes.toLowerCase();
    return normalized.contains('transferencia_rechazada') ||
        normalized.contains('comprobante de pago no pudo ser validado');
  }

  bool _chatMessageMatchesMarker(
    ChatMessage message,
    String marker,
    String? orderId,
  ) {
    if (orderId != null && message.activeOrderId != orderId) {
      return false;
    }
    final normalized = message.text.toLowerCase();
    if (marker == 'pickup_ready') {
      return normalized.contains('listo') && normalized.contains('retir');
    }

    if (marker == 'pickup_delivered') {
      return normalized.contains('ha sido entregado');
    }

    if (marker == 'transfer_payment_rejected') {
      return normalized.contains('comprobante de pago no pudo ser validado');
    }

    return normalized.contains(marker.toLowerCase());
  }

  Future<void> _openShoppingAssistant(BuildContext context) async {
    _clientOrderWatcherPaused = true;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => WelcomeScreen(account: account)),
    );
    _clientOrderWatcherPaused = false;
    _hasNotifiedClientDeliveryFailed = false;
    _hasNotifiedClientDeliveryConfirmed = false;
    _hasNotifiedClientDelivered = false;
    _hasNotifiedClientReadyForPickup = false;
    _hasNotifiedClientTransferRejected = false;
    await _loadWatchedOrder();
  }

  void _logout(BuildContext context) {
    unawaited(logoutToAccess(context));
  }

  @override
  Widget build(BuildContext context) {
    final String displayName = account.name.trim().isEmpty
        ? 'Usuario'
        : account.name.trim();
    final String firstName = 'Cliente $displayName';
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
            tooltip: 'Cerrar sesion',
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
                      color: AppColors.accent.withValues(alpha: 0.2),
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

  Map<String, _DashboardMenuItem> _buildMenuItems(BuildContext context) {
    return {
      'assistant': _DashboardMenuItem(
        id: 'assistant',
        title: 'Asistente de compras',
        subtitle: 'Consulta y compra por chat',
        icon: Icons.chat_bubble_rounded,
        onTap: () => unawaited(_openShoppingAssistant(context)),
      ),
      'purchases': _DashboardMenuItem(
        id: 'purchases',
        title: 'Mis compras',
        subtitle: 'Revisa tu historial y comprobantes',
        icon: Icons.receipt_long_rounded,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => ClientInvoicesScreen(account: account),
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
  }) {
    return Card(
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
  }
}

class _DashboardMenuItem {
  const _DashboardMenuItem({
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

class ClientInvoicesScreen extends StatefulWidget {
  const ClientInvoicesScreen({super.key, required this.account});

  final ClientAccount account;

  @override
  State<ClientInvoicesScreen> createState() => _ClientInvoicesScreenState();
}

class _ClientInvoicesScreenState extends State<ClientInvoicesScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _invoices = [];

  @override
  void initState() {
    super.initState();
    _fetchInvoices();
  }

  Future<void> _fetchInvoices() async {
    try {
      final response = await getMobileApi('/api/mobile/clients/invoices', {
        'identity': widget.account.identity,
      });
      if (mounted) {
        setState(() {
          _invoices = response['invoices'] as List<dynamic>? ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is MobileApiException
              ? e.message
              : 'Error al cargar facturas.';
          _loading = false;
        });
      }
    }
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoString;
    }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis compras', style: TextStyle(color: Colors.white)),
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

    if (_invoices.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.receipt_long_rounded,
                size: 64,
                color: Colors.grey,
              ),
              const SizedBox(height: 16),
              const Text(
                'No tienes compras registradas aún.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _invoices.length,
      itemBuilder: (context, index) {
        final invoice = _invoices[index] as Map<String, dynamic>;
        final items = invoice['items'] as List<dynamic>? ?? [];
        final status = (invoice['status'] as String? ?? '').toUpperCase();
        final isCancelled = invoice['status'] == 'cancelled';
        final subtotal = (invoice['subtotal'] as num?) ?? 0.0;
        final discount = (invoice['discount'] as num?) ?? 0.0;
        final total = (invoice['total'] as num?) ?? 0.0;

        String displayNotes = invoice['notes']?.toString() ?? '';
        displayNotes = displayNotes.replaceAll(RegExp(r'Cuenta: .*\n?'), '');
        displayNotes = displayNotes.replaceAll(
          RegExp(r'Cedula/RUC: .*\n?'),
          '',
        );
        displayNotes = displayNotes.replaceAll(
          RegExp(r'CLIENTE_CEDULA: .*\n?'),
          '',
        );
        displayNotes = displayNotes.replaceAll(
          RegExp(r'METODO_PAGO: .*\n?'),
          '',
        );
        displayNotes = displayNotes.replaceAll(
          RegExp(r'COMPROBANTE: .*\n?'),
          '',
        );
        displayNotes = displayNotes.replaceAll(
          RegExp(r'RETIRO EN LOCAL\n?'),
          '',
        );
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

        displayNotes = displayNotes.replaceAll(
          RegExp(r'^Entrega a domicilio\s*'),
          '',
        );
        displayNotes = displayNotes.trim();

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          elevation: 4,
          shadowColor: Colors.black26,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          clipBehavior: Clip.antiAlias,
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              backgroundColor: Colors.white,
              collapsedBackgroundColor: Colors.white,
              tilePadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
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
                          invoice['invoice_number']?.toString() ?? '',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _formatDate(invoice['created_at']?.toString() ?? ''),
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
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
                          color: isCancelled
                              ? Colors.red[700]
                              : Colors.green[700],
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
                            Row(
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
                                Column(
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
                                    Text(
                                      'Comprobante de venta',
                                      style: TextStyle(
                                        color: Colors.white.withValues(
                                          alpha: 0.9,
                                        ),
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    invoice['invoice_number']?.toString() ?? '',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                    textAlign: TextAlign.right,
                                  ),
                                ],
                              ),
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
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFFF9FA),
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
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
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
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
                                            const Text(
                                              'Entrega a domicilio',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
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
                                          ],
                                        ),
                                      ),
                                    ],
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
                                    final unitWithIva = _invoicePriceWithIva(
                                      price.toDouble(),
                                      ivaRate,
                                    );
                                    final lineTotalWithIva =
                                        _invoicePriceWithIva(
                                          lineTotal.toDouble(),
                                          ivaRate,
                                        );
                                    final name =
                                        (map['product_name']?.toString() ??
                                        'Producto');
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
                                              style: const TextStyle(
                                                fontSize: 11,
                                              ),
                                            ),
                                          ),
                                          Expanded(
                                            flex: 2,
                                            child: Text(
                                              '\$${lineTotal.toStringAsFixed(2)}',
                                              textAlign: TextAlign.right,
                                              style: const TextStyle(
                                                fontSize: 11,
                                              ),
                                            ),
                                          ),
                                          Expanded(
                                            flex: 2,
                                            child: Text(
                                              '\$${(lineTotal * ivaRate / 100).toStringAsFixed(2)}',
                                              textAlign: TextAlign.right,
                                              style: const TextStyle(
                                                fontSize: 11,
                                              ),
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
                      if (invoice['transfer_receipt_url'] != null &&
                          invoice['transfer_receipt_url'].toString().isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
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
                                    errorBuilder:
                                        (context, error, stackTrace) =>
                                            const Padding(
                                              padding: EdgeInsets.all(16.0),
                                              child: Text(
                                                'Error al cargar comprobante',
                                                style: TextStyle(
                                                  color: Colors.red,
                                                ),
                                                textAlign: TextAlign.center,
                                              ),
                                            ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
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
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class RoleOrdersScreen extends StatefulWidget {
  const RoleOrdersScreen({
    super.key,
    required this.account,
    required this.role,
    this.initialIndex = 0,
  });
  final int initialIndex;

  final ClientAccount account;
  final String role;

  @override
  State<RoleOrdersScreen> createState() => _RoleOrdersScreenState();
}

class _RoleOrdersScreenState extends State<RoleOrdersScreen> {
  List<dynamic> _activeOrders = [];
  List<dynamic> _historyOrders = [];
  bool _loading = true;
  bool _hasShownActiveOrders = false;
  bool _returningToMenu = false;
  Timer? _pollingTimer;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
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
    if (initial && mounted) {
      setState(() => _loading = true);
    }
    try {
      final responseOrders = await getMobileApi('/api/admin/orders');
      final List<dynamic> orders = responseOrders['orders'] ?? [];

      final responseInvoices = await getMobileApi('/api/admin/invoices');
      final List<dynamic> invoices = responseInvoices['invoices'] ?? [];

      // Filter orders based on role
      final List<dynamic> roleActiveOrders = orders.where((o) {
        final st = o['status'];
        final assignedEmployeeId = o['employee_user_id']?.toString() ?? '';
        final assignedToCurrentEmployee =
            assignedEmployeeId.isEmpty ||
            assignedEmployeeId == widget.account.id;
        if (widget.role == 'empleado') {
          if (st == 'pending') {
            if (!assignedToCurrentEmployee) {
              return false;
            }
            if (_isTransferPaymentOrder(o)) {
              final notes = o['notes']?.toString() ?? '';
              return notes.contains('[PAGO_APROBADO]');
            }
            return true;
          }
          return (st == 'preparing' || st == 'confirmed') &&
              assignedEmployeeId == widget.account.id;
        } else if (widget.role == 'delivery') {
          return st == 'confirmed' &&
              o['delivery_user_id'] == widget.account.id;
        }
        return false;
      }).toList();

      final List<dynamic> roleHistoryOrders = invoices.where((o) {
        if (widget.role == 'empleado') {
          return o['employee_user_id'] == widget.account.id;
        } else if (widget.role == 'delivery') {
          return o['delivery_user_id'] == widget.account.id;
        }
        return false;
      }).toList();
      final shouldReturnToMenu =
          !initial &&
          _currentIndex == 0 &&
          !_returningToMenu &&
          _hasShownActiveOrders &&
          roleActiveOrders.isEmpty;

      if (mounted) {
        setState(() {
          _activeOrders = roleActiveOrders;
          _historyOrders = roleHistoryOrders;
          _loading = false;
          if (roleActiveOrders.isNotEmpty) {
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
      if (widget.role == 'empleado' && status == 'preparing') {
        payload['employee_user_id'] = widget.account.id;
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

  void _logout() {
    unawaited(logoutToAccess(context));
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.role == 'empleado'
        ? 'PANEL DE EMPLEADO'
        : 'PANEL DE DELIVERY';
    final bgColor = AppColors.accent;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
        ),
        backgroundColor: bgColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _currentIndex == 0
          ? SharedOrdersList(
              orders: _activeOrders,
              isActive: true,
              role: widget.role,
              onUpdateStatus: _updateOrderStatus,
            )
          : SharedOrdersList(
              orders: _historyOrders,
              isActive: false,
              role: widget.role,
              onUpdateStatus: _updateOrderStatus,
            ),
    );
  }
}

class RoleDashboardScreen extends StatefulWidget {
  const RoleDashboardScreen({
    super.key,
    required this.account,
    required this.role,
  });

  final ClientAccount account;
  final String role;

  @override
  State<RoleDashboardScreen> createState() => _RoleDashboardScreenState();
}

class _RoleDashboardScreenState extends State<RoleDashboardScreen> {
  late final OrderNotificationWatcher _notificationWatcher;
  Timer? _notificationTimer;
  int _activeOrdersCount = 0;
  int _cashHandoversCount = 0;
  List<String> _menuOrder = const [];

  ClientAccount get account => widget.account;
  String get role => widget.role;
  String get _menuOrderPreferencesKey => '${role}_menu_order';
  List<String> get _defaultMenuOrder => role == 'delivery'
      ? const ['activeOrders', 'history', 'cashHandovers']
      : const ['activeOrders', 'history'];

  @override
  void initState() {
    super.initState();
    _menuOrder = List<String>.of(_defaultMenuOrder);
    _notificationWatcher = OrderNotificationWatcher(
      role: widget.role,
      deliveryUserId: widget.account.id,
    );
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

    final defaultOrder = _defaultMenuOrder;
    final cleanedOrder = savedOrder
        .where(defaultOrder.contains)
        .toSet()
        .toList();
    final missingItems = defaultOrder.where(
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
      final relevantOrders = orders.where(_isRelevantOrder).toList();
      await _notificationWatcher.check(relevantOrders, initial: initial);

      if (mounted) {
        setState(() {
          _activeOrdersCount = relevantOrders.length;
        });
      }
    } catch (_) {}

    if (role == 'delivery') {
      await _checkCashHandoverBadge();
    }
  }

  Future<void> _checkCashHandoverBadge() async {
    try {
      final response = await getMobileApi(
        '/api/mobile/delivery/cash-handovers',
        {'identity': account.identity},
      );
      final cashOrders = response['cashOrders'] as List<dynamic>? ?? [];
      final pendingCashCount = cashOrders.where((order) {
        if (order is! Map) return false;
        final status =
            order['cash_handover_status']?.toString().toLowerCase() ??
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

  bool _isRelevantOrder(dynamic order) {
    if (order is! Map) {
      return false;
    }

    final status = order['status']?.toString();
    final assignedEmployeeId = order['employee_user_id']?.toString() ?? '';
    final assignedToCurrentEmployee =
        assignedEmployeeId.isEmpty || assignedEmployeeId == account.id;

    if (role == 'empleado') {
      if (status == 'pending') {
        if (!assignedToCurrentEmployee) {
          return false;
        }
        if (_isTransferPaymentOrder(order)) {
          final notes = order['notes']?.toString() ?? '';
          return notes.contains('[PAGO_APROBADO]');
        }
        return true;
      }
      return (status == 'preparing' || status == 'confirmed') &&
          assignedEmployeeId == account.id;
    }

    if (role == 'delivery') {
      return status == 'confirmed' &&
          order['delivery_user_id']?.toString() == account.id;
    }

    return false;
  }

  void _logout(BuildContext context) {
    unawaited(logoutToAccess(context));
  }

  Widget _buildMenuCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
    int badgeCount = 0,
  }) {
    final bgColor = AppColors.accent;
    Widget card = Card(
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
              const Icon(
                Icons.arrow_forward_ios_rounded,
                color: Color(0xFFD4C9CE),
                size: 20,
              ),
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

  Map<String, _DashboardMenuItem> _buildMenuItems(BuildContext context) {
    return {
      'activeOrders': _DashboardMenuItem(
        id: 'activeOrders',
        title: role == 'empleado'
            ? 'Pedidos por Despachar'
            : 'Pedidos por entregar',
        subtitle: 'Gestiona los pedidos actuales',
        icon: Icons.list_alt,
        badgeCount: _activeOrdersCount,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => RoleOrdersScreen(
                account: account,
                role: role,
                initialIndex: 0,
              ),
            ),
          );
        },
      ),
      'history': _DashboardMenuItem(
        id: 'history',
        title: 'Historial',
        subtitle: 'Revisa los pedidos completados',
        icon: Icons.history,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => RoleOrdersScreen(
                account: account,
                role: role,
                initialIndex: 1,
              ),
            ),
          );
        },
      ),
      if (role == 'delivery')
        'cashHandovers': _DashboardMenuItem(
          id: 'cashHandovers',
          title: 'Recaudación Efectivo',
          subtitle: 'Dinero pendiente por entregar',
          icon: Icons.attach_money,
          badgeCount: _cashHandoversCount,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => RoleCashHandoversScreen(account: account),
              ),
            );
          },
        ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final String displayName = account.name.trim().isEmpty
        ? 'Usuario'
        : account.name.trim();
    final String roleCapitalized = role == 'empleado' ? 'Empleado' : 'Delivery';
    final String firstName = '$roleCapitalized $displayName';

    final title = role == 'empleado'
        ? 'PANEL DE EMPLEADO'
        : 'PANEL DE DELIVERY';
    final bgColor = AppColors.accent;
    final menuItemsById = _buildMenuItems(context);
    final orderedMenuItems = _menuOrder
        .where((id) => menuItemsById.containsKey(id))
        .map((id) => menuItemsById[id]!)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
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
                      color: AppColors.accent.withValues(alpha: 0.2),
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
}

bool _isTransferPaymentOrder(dynamic order) {
  if (order is! Map) {
    return false;
  }

  final method = order['payment_method']?.toString().toLowerCase().trim();
  if (method == 'transferencia') {
    return true;
  }

  final receipt = order['transfer_receipt_url']?.toString().trim();
  if (receipt != null && receipt.isNotEmpty) {
    return true;
  }

  final notes = order['notes']?.toString().toLowerCase() ?? '';
  return notes.contains('pago: transferencia') ||
      notes.contains('metodo_pago: transferencia') ||
      notes.contains('metodo de pago: transferencia');
}

class RoleCashHandoversScreen extends StatefulWidget {
  const RoleCashHandoversScreen({super.key, required this.account});
  final ClientAccount account;

  @override
  State<RoleCashHandoversScreen> createState() =>
      _RoleCashHandoversScreenState();
}

class _RoleCashHandoversScreenState extends State<RoleCashHandoversScreen> {
  bool _isLoading = true;
  List<dynamic> _orders = [];
  String _filterType = 'all';
  String _startDate = '';
  String _endDate = '';
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _fetchHandovers();
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _fetchHandovers(isBackground: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchHandovers({bool isBackground = false}) async {
    if (!isBackground) setState(() => _isLoading = true);
    try {
      String url =
          '/api/mobile/delivery/cash-handovers?identity=${widget.account.identity}';
      if (_hasCompleteDateFilter && _startDate.isNotEmpty) {
        url += '&startDate=${_startDate}T00:00:00.000Z';
      }
      if (_hasCompleteDateFilter && _endDate.isNotEmpty) {
        url += '&endDate=${_endDate}T23:59:59.999Z';
      }

      final response = await getMobileApi(url);
      if (response['ok'] == true) {
        setState(() {
          _orders = response['cashOrders'] as List<dynamic>? ?? [];
        });
      } else {
        _showSnackBar('Error: ${response['error']}', isError: true);
      }
    } catch (e) {
      _showSnackBar('Error de red al obtener recaudaciones', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  bool get _hasCompleteDateFilter {
    if (_filterType == 'all') {
      return false;
    }

    if (_filterType == 'day' || _filterType == 'month') {
      return _startDate.isNotEmpty && _endDate.isNotEmpty;
    }

    return _filterType == 'range' &&
        _startDate.isNotEmpty &&
        _endDate.isNotEmpty;
  }

  String _formatDateValue(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  String _formatDisplayDate(String value) {
    final parsed = DateTime.tryParse(value);
    if (parsed == null) {
      return value;
    }

    return '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}/${parsed.year}';
  }

  String _monthLabel(int month) {
    const labels = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    return labels[month - 1];
  }

  String _selectedMonthLabel() {
    if (_startDate.isEmpty) {
      return 'Seleccionar mes';
    }

    final parsed = DateTime.tryParse(_startDate);
    if (parsed == null) {
      return _startDate;
    }

    return '${_monthLabel(parsed.month)} ${parsed.year}';
  }

  Future<void> _handOverMoney(List<String> orderIds) async {
    setState(() => _isLoading = true);
    try {
      final response =
          await postMobileApi('/api/mobile/delivery/cash-handovers', {
            'identity': widget.account.identity,
            'orderIds': orderIds,
            'action': 'hand_over',
          });
      if (response['ok'] == true) {
        _showSnackBar('Dinero marcado como entregado al Admin');
        await _fetchHandovers();
      } else {
        _showSnackBar('Error: ${response['error']}', isError: true);
        setState(() => _isLoading = false);
      }
    } catch (e) {
      _showSnackBar('Error de red al entregar dinero', isError: true);
      setState(() => _isLoading = false);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        final formatted = _formatDateValue(picked);
        if (_filterType == 'day') {
          _startDate = formatted;
          _endDate = formatted;
        } else {
          if (isStart) {
            _startDate = formatted;
          } else {
            _endDate = formatted;
          }
        }
      });
      if (_hasCompleteDateFilter) {
        _fetchHandovers();
      }
    }
  }

  Future<void> _selectMonth(BuildContext context) async {
    var selectedYear =
        DateTime.tryParse(_startDate)?.year ?? DateTime.now().year;

    final selected = await showModalBottomSheet<DateTime>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.chevron_left),
                          onPressed: () =>
                              setSheetState(() => selectedYear -= 1),
                        ),
                        Text(
                          selectedYear.toString(),
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chevron_right),
                          onPressed: () =>
                              setSheetState(() => selectedYear += 1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: 12,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 2.4,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                      itemBuilder: (context, index) {
                        final month = index + 1;
                        return OutlinedButton(
                          onPressed: () => Navigator.of(
                            sheetContext,
                          ).pop(DateTime(selectedYear, month)),
                          child: Text(_monthLabel(month)),
                        );
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (selected == null) {
      return;
    }

    final firstDay = DateTime(selected.year, selected.month);
    final lastDay = DateTime(selected.year, selected.month + 1, 0);
    setState(() {
      _startDate = _formatDateValue(firstDay);
      _endDate = _formatDateValue(lastDay);
    });
    _fetchHandovers();
  }

  @override
  Widget build(BuildContext context) {
    final pendingOrders = _orders
        .where((o) => o['cash_handover_status'] == 'pending')
        .toList();
    final handedOverOrders = _orders
        .where((o) => o['cash_handover_status'] == 'handed_over')
        .toList();
    final confirmedOrders = _orders
        .where((o) => o['cash_handover_status'] == 'confirmed')
        .toList();

    final totalPendingAmount = pendingOrders.fold<double>(
      0.0,
      (sum, item) =>
          sum + (double.tryParse(item['total']?.toString() ?? '0') ?? 0.0),
    );
    final totalConfirmedAmount = confirmedOrders.fold<double>(
      0.0,
      (sum, item) =>
          sum + (double.tryParse(item['total']?.toString() ?? '0') ?? 0.0),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Recaudación',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
        backgroundColor: AppColors.accent,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchHandovers,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Filtrar historial de entregas:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _filterType,
                          decoration: const InputDecoration(
                            isDense: true,
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 8,
                            ),
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'all',
                              child: Text('Todo el historial'),
                            ),
                            DropdownMenuItem(
                              value: 'day',
                              child: Text('Por Día'),
                            ),
                            DropdownMenuItem(
                              value: 'month',
                              child: Text('Por Mes'),
                            ),
                            DropdownMenuItem(
                              value: 'range',
                              child: Text('Rango Libre'),
                            ),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _filterType = val ?? 'all';
                              _startDate = '';
                              _endDate = '';
                            });
                            _fetchHandovers();
                          },
                        ),
                        if (_filterType != 'all') ...[
                          const SizedBox(height: 12),
                          if (_filterType == 'range') ...[
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () => _selectDate(context, true),
                                    child: Text(
                                      _startDate.isEmpty
                                          ? 'Desde'
                                          : _formatDisplayDate(_startDate),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () =>
                                        _selectDate(context, false),
                                    child: Text(
                                      _endDate.isEmpty
                                          ? 'Hasta'
                                          : _formatDisplayDate(_endDate),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ] else ...[
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: () => _filterType == 'month'
                                    ? _selectMonth(context)
                                    : _selectDate(context, true),
                                child: Text(
                                  _filterType == 'month'
                                      ? _selectedMonthLabel()
                                      : _startDate.isEmpty
                                      ? 'Seleccionar fecha'
                                      : _formatDisplayDate(_startDate),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ],
                    ),
                  ),
                  if (pendingOrders.isEmpty &&
                      handedOverOrders.isEmpty &&
                      confirmedOrders.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(40),
                        child: Text(
                          'No hay recaudaciones de efectivo para mostrar.',
                          style: TextStyle(color: Colors.grey, fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  if (pendingOrders.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'Total en tu poder',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.black54,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$${totalPendingAmount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              color: Colors.amber,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            icon: const Icon(
                              Icons.check_circle_outline,
                              color: Colors.white,
                            ),
                            label: const Text(
                              'Entregar TODO el dinero',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.amber.shade600,
                              minimumSize: const Size(double.infinity, 45),
                            ),
                            onPressed: () {
                              final ids = pendingOrders
                                  .map((o) => o['id'].toString())
                                  .toList();
                              _handOverMoney(ids);
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Pedidos pendientes por entregar:',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...pendingOrders.map(
                      (order) => _buildOrderCard(order, true),
                    ),
                  ],
                  if (handedOverOrders.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'Dinero entregado (Esperando confirmación del Admin):',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...handedOverOrders.map(
                      (order) => _buildOrderCard(order, false),
                    ),
                  ],
                  if (confirmedOrders.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Dinero entregado:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.green,
                          ),
                        ),
                        Text(
                          '\$${totalConfirmedAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ...confirmedOrders.map(
                      (order) => _buildOrderCard(order, false),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildOrderCard(dynamic order, bool isPending) {
    final amount = double.tryParse(order['total']?.toString() ?? '0') ?? 0.0;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  order['order_code']?.toString() ?? 'Pedido',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                Text(
                  '\$${amount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    color: AppColors.accent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Cliente: ${order['customer_name'] ?? 'Consumidor'}',
              style: const TextStyle(color: Colors.grey),
            ),
            if (isPending) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => _handOverMoney([order['id'].toString()]),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.green,
                    side: const BorderSide(color: Colors.green),
                  ),
                  child: const Text('Entregar dinero'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
