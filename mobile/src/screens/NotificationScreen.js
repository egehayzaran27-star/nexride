import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Bildirimler alınamadı:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      fetchNotifications();
    } catch (e) {}
  };

  const renderItem = ({ item }) => (
    <View style={[styles.item, !item.is_read && styles.unreadItem]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={item.is_read ? "notifications-outline" : "notifications"} 
          size={24} 
          color={item.is_read ? "#666" : "#f59e0b"} 
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.message, !item.is_read && styles.unreadText]}>{item.message}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleString('tr-TR')}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bildirimler</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markRead}>Hepsini Okundu Yap</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Henüz bildiriminiz yok.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  markRead: { color: '#007AFF', fontWeight: '600', fontSize: 12 },
  item: { 
    flexDirection: 'row', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    alignItems: 'center'
  },
  unreadItem: { backgroundColor: '#fff9eb' },
  iconContainer: { width: 40, alignItems: 'center' },
  content: { flex: 1, marginLeft: 15 },
  message: { fontSize: 15, color: '#333', lineHeight: 20 },
  unreadText: { fontWeight: 'bold', color: '#000' },
  date: { fontSize: 11, color: '#999', marginTop: 5 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});
