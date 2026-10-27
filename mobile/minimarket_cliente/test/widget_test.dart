import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:minimarket_cliente/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    resetClientSessionForTesting();
    mobileApiBaseUrlOverride = '';
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('shows client login first', (tester) async {
    await tester.pumpWidget(const MinimarketClientApp());

    expect(find.text('Iniciar sesion'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Registrarse'), findsOneWidget);
    expect(find.text('Olvidaste tu contrasena?'), findsNothing);
    expect(find.text('Crear cuenta'), findsNothing);
  });

  testWidgets('opens client register form from login', (tester) async {
    await tester.pumpWidget(const MinimarketClientApp());

    await tester.ensureVisible(find.text('Registrarse'));
    await tester.tap(find.text('Registrarse'));
    await tester.pumpAndSettle();

    expect(find.text('Crear cuenta'), findsOneWidget);
    expect(find.text('Registrarme'), findsOneWidget);
    expect(find.text('Direccion principal'), findsOneWidget);
  });

  testWidgets('shows client login on desktop width', (tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MinimarketClientApp());

    expect(find.text('Iniciar sesion'), findsOneWidget);
    expect(find.text('Asistente de compras'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
  });

  testWidgets('shows forgot password link after wrong password', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'minimarket_client_account': jsonEncode({
        'name': 'Cliente Demo',
        'identity': '0963671755',
        'email': '',
        'phone': '0999999999',
        'address': 'Direccion demo',
        'password': 'correcta1',
      }),
    });

    await tester.pumpWidget(const MinimarketClientApp());
    await tester.enterText(find.bySemanticsLabel('Cedula'), '0963671755');
    await tester.enterText(find.bySemanticsLabel('Contrasena'), 'incorrecta');
    await tester.ensureVisible(find.text('Entrar'));
    await tester.tap(find.text('Entrar'));
    await tester.pumpAndSettle();

    expect(find.text('Contrasena incorrecta.'), findsOneWidget);
    expect(find.text('Olvidaste tu contrasena?'), findsOneWidget);

    await tester.tap(find.text('Olvidaste tu contrasena?'));
    await tester.pumpAndSettle();

    expect(find.text('Recuperar contrasena'), findsOneWidget);
    expect(find.text('Cedula o correo'), findsOneWidget);
  });

  testWidgets('shows recovery send button only when account exists', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: PasswordRecoveryScreen(
          initialIdentifier: '0953230844',
          onLookup: (_) async => const PasswordRecoveryLookup(
            exists: true,
            email: 'jo****e@example.com',
          ),
          onSend: (_) async =>
              'Te enviamos un enlace de recuperacion a jo****e@example.com.',
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();

    expect(find.text('Correo: jo****e@example.com'), findsOneWidget);
    expect(
      find.text('Enviar enlace de recuperacion al correo'),
      findsOneWidget,
    );
  });

  testWidgets('blocks weak password registration with visible guidance', (
    tester,
  ) async {
    await tester.pumpWidget(const MinimarketClientApp());

    await tester.ensureVisible(find.text('Registrarse'));
    await tester.tap(find.text('Registrarse'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.bySemanticsLabel('Nombre completo'),
      'Jose Demo',
    );
    await tester.enterText(find.bySemanticsLabel('Cedula'), '0953230844');
    await tester.enterText(
      find.bySemanticsLabel('Correo electronico'),
      'jose@example.com',
    );
    await tester.enterText(find.bySemanticsLabel('Telefono'), '0962334369');
    await tester.enterText(
      find.bySemanticsLabel('Direccion principal'),
      'Cuenca 5428 y calle 28',
    );
    await tester.enterText(find.bySemanticsLabel('Contrasena'), 'jose');
    await tester.pump();

    expect(find.text('Muy debil'), findsOneWidget);

    await tester.ensureVisible(find.text('Registrarme'));
    await tester.tap(find.text('Registrarme'));
    await tester.pump();

    expect(find.text('Usa minimo 8 caracteres.'), findsOneWidget);
    expect(
      find.textContaining('Revisa los campos marcados.'),
      findsAtLeastNWidgets(1),
    );
  });

  testWidgets('registers client with strong password and opens welcome', (
    tester,
  ) async {
    await tester.pumpWidget(const MinimarketClientApp());

    await tester.ensureVisible(find.text('Registrarse'));
    await tester.tap(find.text('Registrarse'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.bySemanticsLabel('Nombre completo'),
      'Jose Eloy Bernal',
    );
    await tester.enterText(find.bySemanticsLabel('Cedula'), '0953230844');
    await tester.enterText(
      find.bySemanticsLabel('Correo electronico'),
      'jose@example.com',
    );
    await tester.enterText(find.bySemanticsLabel('Telefono'), '0962334369');
    await tester.enterText(
      find.bySemanticsLabel('Direccion principal'),
      'Cuenca 5428 y calle 28',
    );
    await tester.enterText(find.bySemanticsLabel('Contrasena'), 'Cliente123');
    await tester.pump();

    expect(find.text('Segura'), findsOneWidget);

    await tester.ensureVisible(find.text('Registrarme'));
    await tester.tap(find.text('Registrarme'));
    await tester.pumpAndSettle();

    expect(find.text('Bienvenido, Jose'), findsOneWidget);
    expect(find.text('Ej: quiero medio quintal de arroz...'), findsOneWidget);
    expect(find.text('Que productos tienen?'), findsNothing);
    expect(find.text('Salir'), findsOneWidget);
  });

  testWidgets('logs out from welcome and returns to login', (tester) async {
    await tester.pumpWidget(const MinimarketClientApp());

    await tester.ensureVisible(find.text('Registrarse'));
    await tester.tap(find.text('Registrarse'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.bySemanticsLabel('Nombre completo'),
      'Jose Eloy Bernal',
    );
    await tester.enterText(find.bySemanticsLabel('Cedula'), '0953230844');
    await tester.enterText(
      find.bySemanticsLabel('Correo electronico'),
      'jose@example.com',
    );
    await tester.enterText(find.bySemanticsLabel('Telefono'), '0962334369');
    await tester.enterText(
      find.bySemanticsLabel('Direccion principal'),
      'Cuenca 5428 y calle 28',
    );
    await tester.enterText(find.bySemanticsLabel('Contrasena'), 'Cliente123');

    await tester.ensureVisible(find.text('Registrarme'));
    await tester.tap(find.text('Registrarme'));
    await tester.pumpAndSettle();

    expect(find.text('Bienvenido, Jose'), findsOneWidget);

    await tester.tap(find.text('Salir'));
    await tester.pumpAndSettle();

    expect(find.text('Iniciar sesion'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Crear cuenta'), findsNothing);
  });
}
