import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Dimensions, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Modal, 
  Linking 
} from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import apiClient from '../api/client';
import { useStore, BASE_URL, SOCKET_URL } from '../store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native-gesture-handler';

const TAXI_STATIONS = [
  { id: 1, name: "Kızılay Merkez Taksi", lat: 39.9208, lng: 32.8541 },
  { id: 2, name: "Tunalı Hilmi Taksi", lat: 39.9075, lng: 32.8625 },
  { id: 3, name: "Bahçelievler Taksi", lat: 39.9247, lng: 32.8228 },
  { id: 4, name: "Çankaya Atakule Taksi", lat: 39.8860, lng: 32.8548 },
  { id: 5, name: "Esat Dörtyol Taksi", lat: 39.9110, lng: 32.8690 },
];

export default function HomeScreen() {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const locationRef = useRef(null);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [price, setPrice] = useState(0);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [liveDriverPos, setLiveDriverPos] = useState(null);
  const animatedDriverPos = useRef(new AnimatedRegion({
    latitude: 39.9208,
    longitude: 32.8541,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  })).current;
  const [eta, setEta] = useState(null);
  const [distanceText, setDistanceText] = useState('');
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [rating, setRating] = useState(5);
  const [lastBookingId, setLastBookingId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const socketRef = useRef(null);
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);

  const loadDrivers = async () => {
    try {
      const res = await apiClient.get('/drivers/available');
      if (Array.isArray(res.data)) {
        // Kendini listeden çıkar
        setDrivers(res.data.filter(d => d.id !== user.id));
      }
    } catch (e) {
      console.error('Sürücüler yüklenemedi:', e);
    }
  };

  const handleMapPress = useCallback((e) => {
    const coords = e.nativeEvent.coordinate;
    setDestCoords(coords);
    setDestination(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    if (locationRef.current) {
      const dLat = (coords.latitude - locationRef.current.latitude) * Math.PI / 180;
      const dLon = (coords.longitude - locationRef.current.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(locationRef.current.latitude*Math.PI/180)*Math.cos(coords.latitude*Math.PI/180)*Math.sin(dLon/2)**2;
      const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setPrice(Math.round((d * 8 + 15) * 2) / 2);
    }
  }, []);

  const sendPaymentCode = async () => {
    try {
      await apiClient.post('/wallet/send-email', { email: user.email });
      setCodeSent(true);
      Alert.alert('Başarılı', 'Doğrulama kodu e-postanıza gönderildi.');
    } catch (e) {
      console.error('Kod gönderme hatası:', e);
      Alert.alert('Hata', 'Kod gönderilemedi.');
    }
  };

  const finalizeBooking = async (method) => {
    setPaymentMethod(method);
    if (method === 'Wallet' && !codeSent) {
      return sendPaymentCode();
    }
    if (method === 'Wallet' && !verificationCode) {
      return Alert.alert('Hata', 'Lütfen 6 haneli doğrulama kodunu girin.');
    }

    setBookingStatus('searching');
    setShowPaymentModal(false);
    
    try {
      const res = await apiClient.post('/bookings', {
        userId: user.id, 
        driverId: selectedDriverId, 
        destination, 
        price, 
        bookingDate: new Date().toISOString()
      });
      
      if (res.data.success) {
        const bId = res.data.id;
        setLastBookingId(bId);
        
        if (method === 'Wallet') {
          await apiClient.post('/wallet/pay', { 
            userId: user.id, 
            bookingId: bId, 
            method: 'Wallet', 
            code: verificationCode 
          });
        }
        
        setBookingStatus('confirmed');
        Alert.alert('Başarılı', 'Yolculuk onaylandı! Sürücü yola çıktı.');
        
        if (socketRef.current) socketRef.current.disconnect();
        socketRef.current = io(SOCKET_URL, { auth: { token } });
        const socket = socketRef.current;

        socket.on('driver:moved', (data) => {
          if (data.driverId === selectedDriverId && locationRef.current) {
            // Animasyonlu Güncelleme
            animatedDriverPos.timing({
              latitude: data.lat,
              longitude: data.lng,
              duration: 1000,
              useNativeDriver: false
            }).start();
            setLiveDriverPos({ latitude: data.lat, longitude: data.lng });
            
            // Mesafe & Süre
            const R = 6371;
            const dLat = (data.lat - locationRef.current.latitude) * Math.PI / 180;
            const dLon = (data.lng - locationRef.current.longitude) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(locationRef.current.latitude*Math.PI/180)*Math.cos(data.lat*Math.PI/180)*Math.sin(dLon/2)**2;
            const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            setDistanceText(d.toFixed(2) + ' km');
            setEta(Math.max(1, Math.ceil(d * 2)) + ' dk'); 

            mapRef.current?.animateToRegion({
              latitude: data.lat,
              longitude: data.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 1000);
          }
        });

        socket.on('booking:status-updated', (data) => {
          if (data.bookingId === bId && data.status === 'Tamamlandı') {
            setBookingStatus(null);
            setShowRatingModal(true);
            socket.disconnect();
          }
        });
      }
    } catch (e) {
      console.error('Rezervasyon hatası:', e);
      setBookingStatus(null);
      Alert.alert('Hata', e.response?.data?.error || 'İşlem sırasında bir hata oluştu.');
    }
  };

  const submitRating = async () => {
    try {
      await apiClient.post('/bookings/ratings', {
        bookingId: lastBookingId, driverId: selectedDriverId, userId: user.id, score: rating
      });
      Alert.alert('Teşekkürler', 'Puanınız iletildi.');
      setShowRatingModal(false);
      setDestCoords(null);
      setDestination('');
      setBookingStatus(null);
    } catch (e) {
      console.error('Puanlama hatası:', e);
      setShowRatingModal(false);
    }
  };

  const callDriver = () => Linking.openURL('tel:05000000000');

  useEffect(() => {
    const getInitialData = async () => {
      try {
        // Konum alma (Zaman aşımı kontrolüyle)
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Konum izni reddedildi');
          return;
        }
        
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        setLocation(loc.coords);
        locationRef.current = loc.coords;

        // Gerçek zamanlı konum takibi (User's own location)
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (newLoc) => {
            setLocation(newLoc.coords);
            locationRef.current = newLoc.coords;
          }
        );
      } catch (err) {
        console.error('Konum alınamadı:', err);
        // Varsayılan bir konum set et (Örn: Ankara)
        const defaultLoc = { latitude: 39.9208, longitude: 32.8541 };
        setLocation(defaultLoc);
        locationRef.current = defaultLoc;
      } finally {
        loadDrivers();
      }
    };

    getInitialData();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  if (!location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={{marginTop: 10, color: '#666'}}>Konumunuz Alınıyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider="google"
          mapType="standard"
          showsTraffic={true}
          showsBuildings={true}
          showsIndoors={true}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          showsUserLocation={true}
          onPress={handleMapPress}
        >
          {liveDriverPos && (
            <Marker.Animated 
              coordinate={animatedDriverPos} 
              anchor={{x:0.5, y:0.5}}
              flat={true}
            >
              <View style={styles.driverMarkerContainer}>
                  <Ionicons name="car" size={36} color="#f59e0b" />
                  <View style={styles.markerPulse} />
              </View>
            </Marker.Animated>
          )}

          {destCoords && <Marker coordinate={destCoords} pinColor="red" title="Hedef" />}
          
          {Array.isArray(TAXI_STATIONS) && TAXI_STATIONS.map(s => (
            <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }}>
              <View style={styles.stationIcon}><Ionicons name="business" size={18} color="#000" /></View>
            </Marker>
          ))}
        </MapView>
      )}

      <View style={styles.osrmBadge}>
         <View style={styles.osrmDot} />
         <Text style={styles.osrmText}>OSRM Local</Text>
      </View>

      <View style={styles.overlay}>
        {bookingStatus === 'confirmed' ? (
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
               <View style={styles.driverInfo}>
                  <Text style={styles.goldText}>CANLI TAKİP</Text>
                  <Text style={styles.boldWhite}>Sürücü Size Geliyor</Text>
               </View>
               <View style={styles.etaBadge}>
                  <Text style={styles.etaText}>{eta || '-- dk'}</Text>
               </View>
            </View>
            <View style={styles.trackStats}>
               <View style={styles.trackItem}><Text style={styles.grayText}>Mesafe</Text><Text style={styles.whiteText}>{distanceText || '-- km'}</Text></View>
               <View style={styles.trackDivider} />
               <View style={styles.trackItem}><Text style={styles.grayText}>Ücret</Text><Text style={styles.whiteText}>₺{price.toFixed(2)}</Text></View>
            </View>
            <TouchableOpacity onPress={callDriver} style={styles.callBtn}>
               <Ionicons name="call" size={20} color="#000" />
               <Text style={styles.callBtnText}>Sürücüyü Ara</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.panel}>
            <TouchableOpacity 
              style={styles.handleContainer} 
              onPress={() => setIsExpanded(!isExpanded)}
            >
              <View style={styles.handle} />
            </TouchableOpacity>

            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>Nereye?</Text>
                <TouchableOpacity onPress={() => setIsExpanded(true)}>
                  <Text style={styles.destText}>{destination || 'Haritadan bir yer seçin'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.priceBadge}><Text style={styles.priceVal}>₺{price.toFixed(2)}</Text></View>
            </View>

            {isExpanded && (
              <>
                <Text style={styles.subLabel}>Müsait Sürücüler</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={drivers}
                  keyExtractor={(item) => item.id.toString()}
                  style={{ marginVertical: 15 }}
                  renderItem={({ item: d }) => (
                    <TouchableOpacity 
                      onPress={() => setSelectedDriverId(d.id)} 
                      style={[styles.driverCard, selectedDriverId === d.id && styles.selected]}
                    >
                      <View style={styles.avatar}><Text style={styles.avatarText}>{d.name?.[0]}</Text></View>
                      <Text style={styles.driverName}>{d.name?.split(' ')[0]}</Text>
                      <Text style={styles.rating}>★ {d.avgScore?.toFixed(1) || '5.0'}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity 
                  onPress={() => setShowPaymentModal(true)} 
                  style={[styles.mainBtn, (!destCoords || !selectedDriverId) && styles.disabled]}
                  disabled={!destCoords || !selectedDriverId}
                >
                    <Text style={styles.mainBtnText}>Yolculuğu Başlat</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalCenter}>
          <View style={styles.modalCard}>
            <Ionicons name="card" size={50} color="#f59e0b" style={{ alignSelf: 'center' }} />
            <Text style={styles.modalTitle}>Ödeme Yöntemi</Text>
            <Text style={styles.modalSub}>Toplam Ücret: ₺{price.toFixed(2)}</Text>

            {!codeSent ? (
              <View style={{ gap: 10, marginTop: 20 }}>
                <TouchableOpacity style={styles.payBtnLarge} onPress={() => { try { apiClient.post('/wallet/send-email', { email: user.email }); setCodeSent(true); } catch(e){} }}>
                   <Ionicons name="wallet" size={24} color="#f59e0b" />
                   <Text style={styles.payBtnTextLarge}>Cüzdan (₺)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.payBtnLarge, { backgroundColor: '#444' }]} onPress={() => finalizeBooking('Cash')}>
                   <Ionicons name="cash" size={24} color="#fff" />
                   <Text style={[styles.payBtnTextLarge, {color:'#fff'}]}>Nakit (💵)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.label}>Doğrulama Kodu</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="6 Haneli Kod" 
                  value={verificationCode} 
                  onChangeText={setVerificationCode}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.payBtnLarge} onPress={() => finalizeBooking('Wallet')}>
                  <Text style={styles.payBtnTextLarge}>Doğrula ve Yolculuğu Başlat</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={{ marginTop: 20 }}>
              <Text style={{ textAlign: 'center', color: '#999', fontWeight:'bold' }}>VAZGEÇ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalCenter}>
          <View style={styles.modalCard}>
            <Ionicons name="star" size={50} color="#f59e0b" style={{alignSelf:'center'}} />
            <Text style={styles.modalTitle}>Yolculuk Tamamlandı!</Text>
            <Text style={styles.modalSub}>Sürücüyü puanlayın:</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(i => (
                <TouchableOpacity key={i} onPress={() => setRating(i)}>
                  <Ionicons name={i <= rating ? "star" : "star-outline"} size={40} color="#f59e0b" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={submitRating} style={styles.modalBtn}><Text style={styles.modalBtnText}>Gönder</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', bottom: 0, width: '100%' },
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, elevation: 10 },
  panelTitle: { fontSize: 22, fontWeight: 'bold' },
  destText: { color: '#666', marginTop: 5 },
  driverCard: { width: 90, padding: 15, backgroundColor: '#f5f5f5', borderRadius: 20, alignItems: 'center', marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#007AFF', backgroundColor: '#eef6ff' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  driverName: { fontSize: 12, fontWeight: 'bold' },
  rating: { fontSize: 10, color: '#f59e0b', fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  price: { fontSize: 24, fontWeight: 'bold' },
  small: { fontSize: 12, color: '#999' },
  btn: { backgroundColor: '#000', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  disabled: { opacity: 0.3 },
  stationIcon: { backgroundColor: '#007AFF', padding: 5, borderRadius: 10, borderWidth: 2, borderColor: '#fff' },
  driverMarkerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  modalCenter: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalCard: { backgroundColor: '#fff', padding: 30, borderRadius: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 15 },
  modalSub: { textAlign: 'center', color: '#666', marginVertical: 10 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 20 },
  modalBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 15, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold' },
  goldText: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  boldWhite: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  grayText: { color: '#aaa', fontSize: 12 },
  whiteText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  trackingCard: { backgroundColor: '#111', margin: 20, borderRadius: 25, padding: 25, elevation: 15 },
  trackingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  etaBadge: { backgroundColor: '#f59e0b', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  etaText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  trackStats: { flexDirection: 'row', backgroundColor: '#222', borderRadius: 20, padding: 15, marginBottom: 20 },
  trackItem: { flex: 1, alignItems: 'center' },
  trackDivider: { width: 1, height: '100%', backgroundColor: '#444' },
  callBtn: { backgroundColor: '#f59e0b', flexDirection: 'row', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 10 },
  callBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 20, paddingTop: 10, elevation: 10 },
  handleContainer: { width: '100%', alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  priceBadge: { backgroundColor: '#000', padding: 10, borderRadius: 12 },
  priceVal: { color: '#f59e0b', fontWeight: 'bold', fontSize: 18 },
  subLabel: { fontSize: 14, color: '#999', fontWeight: 'bold', textTransform: 'uppercase' },
  mainBtn: { backgroundColor: '#000', padding: 20, borderRadius: 18, alignItems: 'center' },
  mainBtnText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 18 },
  payRow: { flexDirection: 'row', gap: 10, marginVertical: 20 },
  payBtn: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#f5f5f5', alignItems: 'center', gap: 5 },
  payActive: { backgroundColor: '#000' },
  verifyBox: { marginBottom: 20 },
  codeBtn: { padding: 15, backgroundColor: '#f9f9f9', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  codeBtnText: { color: '#000', fontWeight: 'bold' },
  codeInput: { borderBottomWidth: 2, borderBottomColor: '#f59e0b', fontSize: 24, textAlign: 'center', padding: 10, letterSpacing: 5 },
  finalBtn: { backgroundColor: '#f59e0b', padding: 18, borderRadius: 15, alignItems: 'center' },
  finalBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  osrmBadge: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  osrmDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
  osrmText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
