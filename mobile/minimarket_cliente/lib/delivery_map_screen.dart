import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'main.dart' show AppColors; // for colors

class DeliveryMapScreen extends StatefulWidget {
  const DeliveryMapScreen({
    super.key,
    required this.destinationLat,
    required this.destinationLng,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
  });

  final double destinationLat;
  final double destinationLng;
  final String customerName;
  final String customerPhone;
  final String customerAddress;

  @override
  State<DeliveryMapScreen> createState() => _DeliveryMapScreenState();
}

class _DeliveryMapScreenState extends State<DeliveryMapScreen> {
  final MapController _mapController = MapController();
  StreamSubscription<Position>? _positionStream;
  LatLng? _currentLocation;
  bool _isLoadingLocation = true;
  List<LatLng> _routePoints = [];
  bool _isFetchingRoute = false;
  double? _estimatedDistance;
  double? _estimatedDuration;
  bool _isPanelExpanded = true;

  @override
  void initState() {
    super.initState();
    _startLocationUpdates();
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    super.dispose();
  }

  Future<void> _startLocationUpdates() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) setState(() => _isLoadingLocation = false);
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (mounted) setState(() => _isLoadingLocation = false);
      return;
    }

    try {
      final initialPosition = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(initialPosition.latitude, initialPosition.longitude);
          _isLoadingLocation = false;
        });
        _fetchRoute();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingLocation = false);
    }

    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });
        _fetchRoute();
      }
    });
  }

  Future<void> _fetchRoute() async {
    if (_currentLocation == null || _isFetchingRoute) return;
    
    setState(() => _isFetchingRoute = true);
    
    final startLat = _currentLocation!.latitude;
    final startLng = _currentLocation!.longitude;
    final endLat = widget.destinationLat;
    final endLng = widget.destinationLng;

    final url = Uri.parse('http://router.project-osrm.org/route/v1/driving/$startLng,$startLat;$endLng,$endLat?geometries=geojson');
    
    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['routes'] != null && data['routes'].isNotEmpty) {
          final geometry = data['routes'][0]['geometry'];
          final coordinates = geometry['coordinates'] as List;
          
          if (mounted) {
            setState(() {
              _routePoints = coordinates.map((coord) => LatLng(coord[1], coord[0])).toList();
              _estimatedDistance = data['routes'][0]['distance']?.toDouble();
              _estimatedDuration = data['routes'][0]['duration']?.toDouble();
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Error fetching route: $e');
    } finally {
      if (mounted) setState(() => _isFetchingRoute = false);
    }
  }

  void _centerOnDestination() {
    _mapController.move(LatLng(widget.destinationLat, widget.destinationLng), 16.0);
  }

  void _centerOnMe() {
    if (_currentLocation != null) {
      _mapController.move(_currentLocation!, 16.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final destination = LatLng(widget.destinationLat, widget.destinationLng);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ruta de Entrega', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        backgroundColor: Colors.amber.shade700,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: destination,
              initialZoom: 15.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.minimarket.joelys',
              ),
              if (_routePoints.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _routePoints,
                      color: Colors.blue.shade700,
                      strokeWidth: 5.0,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: destination,
                    width: 60,
                    height: 60,
                    child: const Icon(
                      Icons.location_on,
                      color: Colors.red,
                      size: 45,
                    ),
                  ),
                  if (_currentLocation != null)
                    Marker(
                      point: _currentLocation!,
                      width: 50,
                      height: 50,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.blue.shade600.withOpacity(0.3),
                        ),
                        child: Center(
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.blue.shade700,
                              border: Border.all(color: Colors.white, width: 3),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          
          if (_isLoadingLocation)
            const Positioned(
              top: 16,
              left: 0,
              right: 0,
              child: Center(
                child: Card(
                  child: Padding(
                    padding: EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                        SizedBox(width: 8),
                        Text('Buscando GPS...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            
          Positioned(
            right: 16,
            bottom: 200,
            child: Column(
              children: [
                FloatingActionButton(
                  heroTag: 'btnDestination',
                  mini: true,
                  backgroundColor: Colors.red.shade600,
                  foregroundColor: Colors.white,
                  onPressed: _centerOnDestination,
                  child: const Icon(Icons.pin_drop),
                ),
                const SizedBox(height: 8),
                FloatingActionButton(
                  heroTag: 'btnMe',
                  mini: true,
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white,
                  onPressed: _centerOnMe,
                  child: const Icon(Icons.my_location),
                ),
              ],
            ),
          ),
            
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 20,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _isPanelExpanded = !_isPanelExpanded;
                        });
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Column(
                        children: [
                          Center(
                            child: Container(
                              width: 40,
                              height: 5,
                              margin: const EdgeInsets.only(bottom: 10),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade300,
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                          Icon(
                            _isPanelExpanded ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_up,
                            color: Colors.grey,
                            size: 20,
                          ),
                          const SizedBox(height: 10),
                        ],
                      ),
                    ),
                    if (_estimatedDuration != null && _estimatedDistance != null)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.blue.shade100),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            Column(
                              children: [
                                const Icon(Icons.timer_outlined, color: Colors.blue, size: 28),
                                const SizedBox(height: 4),
                                Text(
                                  '${(_estimatedDuration! / 60).ceil()} min',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.blue),
                                ),
                                const Text('Estimado', style: TextStyle(fontSize: 12, color: Colors.blueGrey)),
                              ],
                            ),
                            Container(width: 1, height: 40, color: Colors.blue.shade200),
                            Column(
                              children: [
                                const Icon(Icons.route_outlined, color: Colors.blue, size: 28),
                                const SizedBox(height: 4),
                                Text(
                                  '${(_estimatedDistance! / 1000).toStringAsFixed(1)} km',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.blue),
                                ),
                                const Text('Distancia', style: TextStyle(fontSize: 12, color: Colors.blueGrey)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    if (_isPanelExpanded) ...[
                      if (_estimatedDuration != null && _estimatedDistance != null)
                        const SizedBox(height: 20),
                      const Text('DETALLES DEL CLIENTE', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.grey, fontSize: 12, letterSpacing: 1.2)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: Colors.amber.shade100,
                          child: Text(
                            widget.customerName.isNotEmpty ? widget.customerName.substring(0, 1).toUpperCase() : 'C',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber.shade800, fontSize: 20),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(widget.customerName.isEmpty ? 'Consumidor Final' : widget.customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.phone, color: Colors.grey, size: 16),
                                  const SizedBox(width: 6),
                                  Text(widget.customerPhone.isEmpty ? 'Sin teléfono' : widget.customerPhone, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: Colors.black87)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            shape: BoxShape.circle,
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.phone_in_talk, color: Colors.green),
                            onPressed: () {
                              // Implementar llamada nativa en el futuro
                            },
                          ),
                        )
                      ],
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Divider(height: 1),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.location_on, color: Colors.red, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Dirección de entrega', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              Text(
                                widget.customerAddress.isEmpty ? 'No especificada' : widget.customerAddress,
                                style: const TextStyle(fontSize: 14, height: 1.4, color: Colors.black87, fontWeight: FontWeight.w500),
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    ], // end if _isPanelExpanded
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
