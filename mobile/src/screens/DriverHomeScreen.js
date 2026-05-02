import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, Switch, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useStore, BASE_URL, SOCKET_URL } from '../store/useStore';
import { Ionicons } from '@expo/vector-icons';

export default function DriverHomeScreen() {
  const [location, setLocation] = useState(null);
  const locationRef = useRef(null);
  const [isOnline, setIsOnline] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [stats, setStats] = useState({ dailyEarnings: 0, dailyTrips: 0, avgScore: 5.0, ratingCount: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [bookRes, statRes] = await Promise.all([
        axios.get(`${BASE_URL}/bookings/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/drivers/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setBookings(bookRes.data.filter(b => b.status === 'Bekliyor' || b.driverId === user.id));
      setStats(statRes.data);
    } catch (error) {
      console.error('Veri çekme hatası:', error.response?.status, error.message);
      if (error.response?.status === 401) Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
    }
  }, [token, user.id]);

  const isSimulatingRef = useRef(false);
  
  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token } });
    
    // Odaya katıl (Web ile Aynı Mantık)
    socket.emit('join', { userId: user.id, role: user.role, isDriver: true });

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000, // 1 saniyede bir güncelle (Takip için kritik)
        distanceInterval: 1 // 1 metre hareket bile önemli
      }, (loc) => {
        if (!isSimulatingRef.current) {
          setLocation(loc.coords);
          locationRef.current = loc.coords;
          if (isOnline) {
            socket.emit('driver:location-update', { 
              driverId: user.id, 
              lat: loc.coords.latitude, 
              lng: loc.coords.longitude 
            });
          }
        }
      });
    })();

    // Yeni istekleri dinle (Web ile Senkronize)
    socket.on('booking:new-request', (data) => {
      console.log('🔔 Yeni bir çağrı geldi:', data);
      Alert.alert('YENİ ÇAĞRI!', `Nereye: ${data.destination}\nÜcret: ₺${data.price}`, [
        { text: 'Yoksay', style: 'cancel' },
        { text: 'KABUL ET', onPress: () => updateStatus(data.id, 'Onaylandı') }
      ]);
    });

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [isOnline, fetchData, isSimulating]);

  const startSimulation = (targetLat, targetLng, bookingId) => {
    if (!locationRef.current) return;
    setIsSimulating(true);
    isSimulatingRef.current = true;
    let currentLat = locationRef.current.latitude;
    let currentLng = locationRef.current.longitude;
    const socket = io(SOCKET_URL, { auth: { token } });
    
    const steps = 30; // 30 adımda yolcuya var
    const dLat = (targetLat - currentLat) / steps;
    const dLng = (targetLng - currentLng) / steps;
    let step = 0;

    const simInterval = setInterval(() => {
      if (step >= steps) {
        clearInterval(simInterval);
        setIsSimulating(false);
        isSimulatingRef.current = false;
        updateStatus(bookingId, 'Tamamlandı');
        Alert.alert('Varıldı', 'Müşteriye ulaşıldı ve yolculuk tamamlandı.');
        return;
      }

      currentLat += dLat;
      currentLng += dLng;
      const newPos = { latitude: currentLat, longitude: currentLng };
      setLocation(newPos);
      locationRef.current = newPos;
      
      socket.emit('driver:location-update', { driverId: user.id, lat: currentLat, lng: currentLng });
      socket.emit('driver:moved', { driverId: user.id, lat: currentLat, lng: currentLng });
      
      step++;
    }, 1500);
  };

  const updateStatus = async (bookingId, newStatus) => {
    try {
      await axios.patch(`${BASE_URL}/bookings/${bookingId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      if (newStatus === 'Onaylandı') {
         // Simülasyonu başlat (Hedef olarak müşteri konumu - şimdilik Ankara merkezi bir nokta veya rastgele)
         startSimulation(locationRef.current.latitude + 0.01, locationRef.current.longitude + 0.01, bookingId);
      }
      fetchData();
    } catch (error) {
      Alert.alert('Hata', 'Güncellenemedi');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>₺{stats.dailyEarnings.toFixed(2)}</Text>
          <Text style={styles.statLab}>Bugün</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>★ {stats.avgScore.toFixed(1)}</Text>
          <Text style={styles.statLab}>Puan</Text>
        </View>
        <View style={styles.statItem}>
          <Switch value={isOnline} onValueChange={setIsOnline} />
          <Text style={styles.statLab}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        {location && (
          <MapView
            style={styles.map}
            region={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            showsUserLocation={!isSimulating}
          >
            {isSimulating && <Marker coordinate={location}><Ionicons name="car" size={30} color="#f59e0b" /></Marker>}
          </MapView>
        )}

        <View style={styles.list}>
          <Text style={styles.listTitle}>Yolculuklar {isSimulating && '(Simülasyon Aktif)'}</Text>
          {bookings.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.custName}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.priceTag}>₺{item.price}</Text>
              </View>
              <Text style={styles.destText}>📍 {item.destination}</Text>
              <View style={styles.mainActions}>
                {item.status === 'Bekliyor' && (
                  <TouchableOpacity style={[styles.actBtn, styles.accBtn]} onPress={() => updateStatus(item.id, 'Onaylandı')}>
                    <Text style={styles.actText}>Kabul Et</Text>
                  </TouchableOpacity>
                )}
                <Text style={{color:'#666', marginTop:10}}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  statsHeader: { flexDirection: 'row', backgroundColor: '#000', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#f59e0b' },
  statLab: { fontSize: 10, color: '#aaa', marginTop: 4 },
  scroll: { flex: 1 },
  map: { width: '100%', height: 250 },
  list: { padding: 20 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  custName: { fontSize: 16, fontWeight: 'bold' },
  priceTag: { fontSize: 18, fontWeight: 'bold', color: '#34C759' },
  destText: { fontSize: 14, color: '#444' },
  mainActions: { marginTop: 15 },
  actBtn: { padding: 15, borderRadius: 12, alignItems: 'center' },
  accBtn: { backgroundColor: '#34C759' },
  actText: { color: '#fff', fontWeight: 'bold' }
});
