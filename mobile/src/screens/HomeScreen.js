import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

const API_URL = 'http://10.0.2.2:3000'; // Socket URL

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [drivers, setDrivers] = useState({});
  const token = useStore((state) => state.token);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Harita için konum izni gerekli!');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    })();
  }, []);

  useEffect(() => {
    // Socket.IO bağlantısı (Örnek)
    const socket = io(API_URL, {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Socket bağlandı');
    });

    // Sürücü konumlarını dinle
    socket.on('driver:moved', (data) => {
      setDrivers(prev => ({
        ...prev,
        [data.driverId]: { lat: data.lat, lng: data.lng }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Konum alınıyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
      >
        {/* Canlı Sürücüleri Göster */}
        {Object.keys(drivers).map((driverId) => (
          <Marker
            key={driverId}
            coordinate={{
              latitude: drivers[driverId].lat,
              longitude: drivers[driverId].lng
            }}
            title="Sürücü"
            pinColor="blue"
          />
        ))}
      </MapView>
      
      {/* Alt panel veya adres arama eklenebilir */}
      <View style={styles.bottomPanel}>
        <Text style={styles.panelTitle}>Nereye gitmek istersiniz?</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  }
});
