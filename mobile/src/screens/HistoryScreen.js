import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { useFocusEffect } from '@react-navigation/native';

const BASE_URL = 'https://balmy-game-recount.ngrok-free.dev/api';

export default function HistoryScreen() {
  const user = useStore((state) => state.user);
  const token = useStore((state) => state.token);
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/bookings/my-bookings/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Geçmiş yüklenemedi:', error);
    }
  }, [user.id, token]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Yolculuk Geçmişim</Text>
      {Array.isArray(bookings) && bookings.length > 0 ? (
        bookings.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
              <Text style={[styles.status, { color: item.status === 'Tamamlandı' ? 'green' : 'orange' }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.destination}>📍 {item.destination}</Text>
            <Text style={styles.price}>₺{item.price?.toFixed(2) || '0.00'}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>Henüz bir yolculuğunuz bulunmuyor.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  date: { color: '#666', fontSize: 12 },
  status: { fontWeight: 'bold', fontSize: 12 },
  destination: { fontSize: 16, color: '#333', marginVertical: 5 },
  price: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});
