import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Switch, Dimensions } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

const API_URL = 'http://10.0.2.2:3000'; // Socket URL

export default function DriverHomeScreen() {
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [socket, setSocket] = useState(null);
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  useEffect(() => {
    if (isOnline) {
      const newSocket = io(API_URL, { auth: { token } });
      
      newSocket.on('connect', () => {
        newSocket.emit('driver:join', { driverId: user?.id || 1 });
      });

      // Konum güncellemelerini düzenli gönder (Örnek: Her 5 sn)
      const interval = setInterval(async () => {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        newSocket.emit('driver:location-update', {
          driverId: user?.id || 1,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude
        });
      }, 5000);

      setSocket(newSocket);

      return () => {
        clearInterval(interval);
        newSocket.disconnect();
      };
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [isOnline, token]);

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
        />
      ) : (
        <View style={styles.loading}>
          <Text>Konum aranıyor...</Text>
        </View>
      )}

      <View style={styles.topPanel}>
        <Text style={styles.statusText}>{isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</Text>
        <Switch
          value={isOnline}
          onValueChange={setIsOnline}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isOnline ? "#007AFF" : "#f4f3f4"}
        />
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topPanel: {
    position: 'absolute',
    top: 50,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  }
});
