import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { io } from 'socket.io-client';
import { SOCKET_URL, useStore } from '../store/useStore';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';

export default function LiveMapScreen() {
  const [drivers, setDrivers] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const token = useStore(state => state.token);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiClient.get('/drivers/available');
        const initialDrivers = {};
        res.data.forEach(d => {
          if (d.lat && d.lng) initialDrivers[d.id] = d;
        });
        setDrivers(initialDrivers);
      } catch (e) {}
      setLoading(false);
    };

    init();

    socketRef.current = io(SOCKET_URL, { auth: { token } });
    const socket = socketRef.current;

    socket.on('driver:moved', (data) => {
      setDrivers(prev => ({
        ...prev,
        [data.driverId]: { ...prev[data.driverId], lat: data.lat, lng: data.lng }
      }));
    });

    socket.on('driver:connected', async (data) => {
      // Yeni sürücü bağlandığında bilgilerini çek
      try {
        const res = await apiClient.get(`/drivers/${data.driverId}`);
        setDrivers(prev => ({ ...prev, [data.driverId]: res.data }));
      } catch (e) {}
    });

    socket.on('driver:disconnected', (data) => {
      setDrivers(prev => {
        const newState = { ...prev };
        delete newState[data.driverId];
        return newState;
      });
    });

    return () => socket.disconnect();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 39.9208,
          longitude: 32.8541,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {Object.values(drivers).map(d => (
          <Marker 
            key={d.id} 
            coordinate={{ latitude: d.lat, longitude: d.lng }}
            title={d.name}
            description={d.carModel}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={24} color="#f59e0b" />
            </View>
          </Marker>
        ))}
      </MapView>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{Object.keys(drivers).length} Aktif Sürücü</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  driverMarker: { 
    backgroundColor: '#000', 
    padding: 5, 
    borderRadius: 15, 
    borderWidth: 2, 
    borderColor: '#f59e0b',
    elevation: 5
  },
  badge: { 
    position: 'absolute', 
    top: 50, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20 
  },
  badgeText: { color: '#f59e0b', fontWeight: 'bold' }
});
