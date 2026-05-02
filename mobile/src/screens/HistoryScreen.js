import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import apiClient from '../api/client';
import { useStore } from '../store/useStore';
import { useFocusEffect } from '@react-navigation/native';

export default function HistoryScreen() {
  const user = useStore((state) => state.user);
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await apiClient.get(`/bookings/my-bookings/${user.id}`);
      setBookings(response.data);
    } catch (error) {
      console.error('Geçmiş yüklenemedi:', error);
    }
  }, [user.id]);

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
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={<Text style={styles.title}>Yolculuk Geçmişim</Text>}
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
              <Text style={[styles.status, { color: item.status === 'Tamamlandı' ? 'green' : 'orange' }]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.destination}>📍 {item.destination}</Text>
            <Text style={styles.price}>₺{item.price?.toFixed(2) || '0.00'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz bir yolculuğunuz bulunmuyor.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
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
