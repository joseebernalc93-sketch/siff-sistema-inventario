import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'dart:ui';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:vibration/vibration.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    DartPluginRegistrant.ensureInitialized();
  } catch (_) {}

  try {
    await Firebase.initializeApp();
  } catch (_) {}

  await AppNotificationService.writeChatMessageFromPushData(message.data);
}

class AppNotificationService {
  AppNotificationService._();

  static const _channelId = 'minimarket_order_alerts';
  static const _channelName = 'Alertas de pedidos';
  static const _channelDescription =
      'Notificaciones de pedidos para administrador, empleado y delivery.';
  static const _transferPaymentRejectedChatText =
      'Su pedido fue cancelado por la Administracion por el motivo que su comprobante de pago no pudo ser validado, Porfavor verifique su comprobante de pago y solicite el pedido nuevamente';

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static bool _initialized = false;
  static bool _firebaseInitialized = false;
  static bool _messageHandlersAttached = false;
  static final Random _random = Random();

  static Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const initializationSettings = InitializationSettings(
      android: androidSettings,
    );

    await _plugin.initialize(settings: initializationSettings);
    await _initializeFirebaseMessaging();

    final android = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();

    await android?.createNotificationChannel(
      AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: _channelDescription,
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        vibrationPattern: Int64List.fromList([0, 350, 150, 350]),
      ),
    );

    await android?.requestNotificationsPermission();
    _initialized = true;
  }

  static Future<String?> getFirebaseMessagingToken() async {
    await initialize();
    if (!_firebaseInitialized) {
      return null;
    }

    try {
      return FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }

  static Stream<String> get onFirebaseMessagingTokenRefresh =>
      FirebaseMessaging.instance.onTokenRefresh;

  static Future<void> showOrderAlert({
    required String title,
    required String body,
  }) async {
    await initialize();
    await _signalDevice();

    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDescription,
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        vibrationPattern: Int64List.fromList([0, 350, 150, 350]),
        category: AndroidNotificationCategory.status,
      ),
    );

    await _plugin.show(
      id:
          DateTime.now().millisecondsSinceEpoch.remainder(1000000) +
          _random.nextInt(999),
      title: title,
      body: body,
      notificationDetails: details,
    );
  }

  static Future<void> _signalDevice() async {
    try {
      if (await Vibration.hasVibrator() == true) {
        await Vibration.vibrate(pattern: [0, 350, 150, 350]);
      }
    } catch (_) {}

    try {
      await SystemSound.play(SystemSoundType.alert);
    } catch (_) {}
  }

  static Future<void> _initializeFirebaseMessaging() async {
    if (_firebaseInitialized) {
      return;
    }

    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      await FirebaseMessaging.instance
          .setForegroundNotificationPresentationOptions(
            alert: true,
            badge: true,
            sound: true,
          );
      _firebaseInitialized = true;
      _attachMessageHandlers();
    } catch (_) {
      _firebaseInitialized = false;
    }
  }

  static void _attachMessageHandlers() {
    if (_messageHandlersAttached) {
      return;
    }

    FirebaseMessaging.onMessage.listen((message) async {
      await writeChatMessageFromPushData(message.data);

      final notification = message.notification;
      final title = notification?.title ?? message.data['title']?.toString();
      final body = notification?.body ?? message.data['body']?.toString();

      if (title == null || body == null) {
        return;
      }

      showOrderAlert(title: title, body: body);
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      writeChatMessageFromPushData(message.data);
    });

    FirebaseMessaging.instance.getInitialMessage().then((message) {
      if (message != null) {
        writeChatMessageFromPushData(message.data);
      }
    });

    _messageHandlersAttached = true;
  }

  static Future<void> writeChatMessageFromPushData(
    Map<String, dynamic> data,
  ) async {
    final event = data['event']?.toString();
    final isPickupReady = event == 'pickup_ready';
    final isPickupDelivered =
        event == 'order_delivered' &&
        (data['pickup_ticket']?.toString().trim().isNotEmpty ?? false);
    final isTransferPaymentRejected = event == 'transfer_payment_rejected';

    if (!isPickupReady && !isPickupDelivered && !isTransferPaymentRejected) {
      return;
    }

    final identity = data['customer_identity']?.toString().trim() ?? '';
    if (identity.isEmpty) {
      return;
    }

    final ticket = data['pickup_ticket']?.toString().trim() ?? '';
    final orderId = data['order_id']?.toString().trim();
    if (isTransferPaymentRejected) {
      await _appendAssistantChatMessage(
        identity: identity,
        marker: 'transfer_payment_rejected',
        orderId: orderId,
        text: _transferPaymentRejectedChatText,
        ticket: ticket,
      );
      return;
    }

    final text = isPickupReady
        ? _pickupReadyChatText(ticket)
        : '✅ Tu pedido ha sido entregado. ¡Gracias por tu compra! 🛒';
    final marker = isPickupReady ? 'pickup_ready' : 'pickup_delivered';

    await _appendAssistantChatMessage(
      identity: identity,
      marker: marker,
      orderId: orderId,
      text: text,
      ticket: ticket,
    );
  }

  static Future<void> _appendAssistantChatMessage({
    required String identity,
    required String marker,
    required String text,
    required String ticket,
    String? orderId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final chatKey = 'minimarket_chat_history_$identity';
      final jsonStr = prefs.getString(chatKey);
      final messages = <Map<String, dynamic>>[];

      if (jsonStr != null && jsonStr.isNotEmpty) {
        final decoded = jsonDecode(jsonStr) as List<dynamic>;
        for (final entry in decoded) {
          if (entry is Map) {
            messages.add(Map<String, dynamic>.from(entry));
          }
        }
      }

      final exists = messages.any(
        (message) => _messageMatchesMarker(message, marker, ticket, orderId),
      );
      if (exists) {
        return;
      }

      final now = DateTime.now();
      messages.add({
        'id': now.microsecondsSinceEpoch.toString(),
        'createdAt': now.toIso8601String(),
        'text': text,
        'isUser': false,
        'products': <dynamic>[],
        'suggestedItems': <String, dynamic>{},
        'isError': false,
        'requiresDeliveryConfirmation': false,
        'activeOrderId': orderId,
        'deliveryConfirmationAnswer': null,
        'isCartNotice': false,
        'cartProductIds': <dynamic>[],
      });

      await prefs.setString(chatKey, jsonEncode(messages));
    } catch (_) {}
  }

  static bool _messageMatchesMarker(
    Map<String, dynamic> message,
    String marker,
    String ticket,
    String? orderId,
  ) {
    if (orderId != null && message['activeOrderId']?.toString() != orderId) {
      return false;
    }
    final text = message['text']?.toString() ?? '';
    final normalized = text.toLowerCase();
    if (marker == 'pickup_ready') {
      final mentionsTicket =
          ticket.isEmpty || normalized.contains(ticket.toLowerCase());
      return mentionsTicket &&
          normalized.contains('listo') &&
          normalized.contains('retir');
    }

    if (marker == 'pickup_delivered') {
      return normalized.contains('ha sido entregado');
    }

    if (marker == 'transfer_payment_rejected') {
      return normalized.contains('comprobante de pago no pudo ser validado');
    }

    return normalized.contains(marker.toLowerCase());
  }

  static String _pickupReadyChatText(String ticket) {
    final ticketText = ticket.isEmpty ? '' : ' TICKET: $ticket';
    return '🎟️ Tu pedido$ticketText está listo para ser retirado en el local. 🛍️';
  }
}

class OrderNotificationSnapshot {
  const OrderNotificationSnapshot({
    required this.id,
    required this.code,
    required this.status,
    required this.deliveryUserId,
    required this.notes,
    required this.paymentMethod,
    required this.total,
  });

  final String id;
  final String code;
  final String status;
  final String deliveryUserId;
  final String notes;
  final String paymentMethod;
  final double total;

  factory OrderNotificationSnapshot.fromJson(Map<dynamic, dynamic> order) {
    return OrderNotificationSnapshot(
      id: order['id']?.toString() ?? '',
      code:
          order['order_code']?.toString() ??
          order['code']?.toString() ??
          order['invoice_number']?.toString() ??
          '',
      status: order['status']?.toString() ?? '',
      deliveryUserId: order['delivery_user_id']?.toString() ?? '',
      notes: order['notes']?.toString() ?? '',
      paymentMethod: _readPaymentMethod(order),
      total: _readOrderTotal(order),
    );
  }

  String get displayCode => code.isEmpty ? id : code;
  bool get isTransfer => paymentMethod == 'transferencia';
  bool get isRetiroLocal => notes.toUpperCase().contains('RETIRO EN LOCAL');
  String get deliveryPaymentText => isTransfer
      ? 'Pago: Transferencia. No cobrar efectivo.'
      : 'Pago: Efectivo. Cobrar: \$${total.toStringAsFixed(2)}.';

  String get fingerprint =>
      '$status|$deliveryUserId|$notes|$paymentMethod|$total';
}

class OrderNotificationWatcher {
  OrderNotificationWatcher({required this.role, this.deliveryUserId});

  final String role;
  final String? deliveryUserId;
  final Map<String, OrderNotificationSnapshot> _seen = {};
  bool _primed = false;

  Future<void> check(List<dynamic> orders, {bool initial = false}) async {
    final next = <String, OrderNotificationSnapshot>{};

    for (final order in orders.whereType<Map>()) {
      final snapshot = OrderNotificationSnapshot.fromJson(order);
      if (snapshot.id.isEmpty) {
        continue;
      }
      next[snapshot.id] = snapshot;
    }

    if (!_primed || initial) {
      _seen
        ..clear()
        ..addAll(next);
      _primed = true;
      return;
    }

    for (final entry in next.entries) {
      final previous = _seen[entry.key];
      final current = entry.value;

      if (previous == null) {
        await _notifyNewOrder(current);
      } else if (previous.fingerprint != current.fingerprint) {
        await _notifyChangedOrder(previous, current);
      }
    }

    _seen
      ..clear()
      ..addAll(next);
  }

  Future<void> _notifyNewOrder(OrderNotificationSnapshot order) {
    if (role == 'delivery') {
      return AppNotificationService.showOrderAlert(
        title: 'Pedido para entregar',
        body:
            'Te asignaron el pedido ${order.displayCode}. ${order.deliveryPaymentText}',
      );
    }

    if (role == 'empleado') {
      return AppNotificationService.showOrderAlert(
        title: 'Pedido por despachar',
        body: 'Revisa el pedido ${order.displayCode}.',
      );
    }

    return AppNotificationService.showOrderAlert(
      title: 'Nuevo pedido recibido',
      body: 'Ingreso el pedido ${order.displayCode}.',
    );
  }

  Future<void> _notifyChangedOrder(
    OrderNotificationSnapshot previous,
    OrderNotificationSnapshot current,
  ) {
    final noteAlert = _noteAlert(previous.notes, current.notes);
    if (noteAlert != null) {
      return AppNotificationService.showOrderAlert(
        title: noteAlert.title,
        body: '${noteAlert.body} Pedido ${current.displayCode}.',
      );
    }

    if (role == 'delivery' &&
        current.deliveryUserId.isNotEmpty &&
        current.deliveryUserId == deliveryUserId &&
        previous.deliveryUserId != current.deliveryUserId) {
      return AppNotificationService.showOrderAlert(
        title: 'Pedido asignado',
        body: 'Tienes que entregar el pedido ${current.displayCode}.',
      );
    }

    if (previous.status != current.status) {
      return AppNotificationService.showOrderAlert(
        title: 'Pedido actualizado',
        body:
            'El pedido ${current.displayCode} ahora esta ${_statusLabel(current.status, current.isRetiroLocal)}.',
      );
    }

    return Future.value();
  }

  _OrderNoteAlert? _noteAlert(String previousNotes, String currentNotes) {
    final previous = previousNotes.toLowerCase();
    final current = currentNotes.toLowerCase();

    if (!previous.contains('cliente confirmo que recibio el pedido: no') &&
        current.contains('cliente confirmo que recibio el pedido: no')) {
      return const _OrderNoteAlert(
        'Cliente marco no recibido',
        'El cliente reporto que no recibio su pedido.',
      );
    }

    if (!previous.contains('cliente confirmo que recibio el pedido: si') &&
        current.contains('cliente confirmo que recibio el pedido: si')) {
      return const _OrderNoteAlert(
        'Cliente confirmo recibido',
        'El cliente confirmo la entrega.',
      );
    }

    if (!previous.contains('repartidor report') &&
        current.contains('repartidor report')) {
      return const _OrderNoteAlert(
        'Delivery no pudo entregar',
        'El repartidor reporto un problema de entrega.',
      );
    }

    return null;
  }

  String _statusLabel(String status, bool isRetiroLocal) {
    switch (status) {
      case 'pending':
        return 'pendiente';
      case 'preparing':
        return 'en preparacion';
      case 'confirmed':
        return isRetiroLocal ? 'listo para retiro' : 'en camino';
      case 'delivered':
        return 'entregado';
      case 'cancelled':
        return 'cancelado';
      default:
        return status.isEmpty ? 'actualizado' : status;
    }
  }
}

class _OrderNoteAlert {
  const _OrderNoteAlert(this.title, this.body);

  final String title;
  final String body;
}

String _readPaymentMethod(Map<dynamic, dynamic> order) {
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

double _readOrderTotal(Map<dynamic, dynamic> order) {
  final value = order['total'];
  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value?.toString() ?? '') ?? 0;
}
