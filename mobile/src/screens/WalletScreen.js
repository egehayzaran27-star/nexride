import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import apiClient from '../api/client';
import { useStore } from '../store/useStore';
import { useFocusEffect } from '@react-navigation/native';

export default function WalletScreen() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  
  const [balance, setBalance] = useState(user?.balance || 0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Card States
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [balRes, transRes] = await Promise.all([
        apiClient.get(`/wallet/balance/${user.id}`),
        apiClient.get(`/wallet/transactions/${user.id}`)
      ]);
      setBalance(balRes.data.balance);
      setHistory(transRes.data.transactions || []);
      setUser({ ...user, balance: balRes.data.balance });
    } catch (e) {
      console.error('Bakiye yükleme hatası:', e);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleTopUp = async () => {
    if (!amount || !cardNumber || !expiry || !cvv) return Alert.alert('Hata', 'Tüm alanları doldurun.');
    if (cardNumber.length < 16) return Alert.alert('Hata', 'Geçersiz kart numarası.');

    setLoading(true);
    try {
      const res = await apiClient.post('/wallet/add-balance', {
        userId: user.id, amount: parseFloat(amount), cardNumber, expiry, cvv
      });
      
      if (res.data.success) {
        Alert.alert('Başarılı', 'Bakiye yüklendi.');
        setShowModal(false);
        setAmount(''); setCardNumber(''); setExpiry(''); setCvv('');
        fetchData();
      }
    } catch (e) {
      console.error('Ödeme hatası:', e);
      Alert.alert('Hata', 'Ödeme işlemi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Cüzdanım</Text>
        
        <View style={styles.balanceCard}>
          <Text style={styles.label}>Mevcut Bakiyeniz</Text>
          <Text style={styles.balance}>₺{parseFloat(balance).toFixed(2)}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ Bakiye Yükle</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Son İşlemler</Text>
        {Array.isArray(history) && history.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View>
              <Text style={styles.historyType}>{item.type}</Text>
              <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
            </View>
            <Text style={[styles.historyAmount, { color: item.amount > 0 ? '#34C759' : '#FF3B30' }]}>
              {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)} ₺
            </Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kredi Kartı ile Yükle</Text>
            
            <TextInput style={styles.input} placeholder="Kart Numarası (16 Hane)" value={cardNumber} onChangeText={setCardNumber} keyboardType="numeric" maxLength={16} />
            <View style={{flexDirection:'row', gap:10}}>
              <TextInput style={[styles.input, {flex:1}]} placeholder="AA/YY" value={expiry} onChangeText={setExpiry} maxLength={5} />
              <TextInput style={[styles.input, {flex:1}]} placeholder="CVV" value={cvv} onChangeText={setCvv} keyboardType="numeric" maxLength={3} />
            </View>
            <TextInput style={styles.input} placeholder="Yüklenecek Miktar (₺)" value={amount} onChangeText={setAmount} keyboardType="numeric" />

            <TouchableOpacity style={styles.payBtn} onPress={handleTopUp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Şimdi Yükle</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModal(false)} style={{marginTop:15, alignItems:'center'}}><Text style={{color:'red'}}>Vazgeç</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  balanceCard: {
    backgroundColor: '#000',
    padding: 30,
    borderRadius: 20,
    marginBottom: 30,
    elevation: 5,
  },
  label: { color: '#aaa', fontSize: 16, marginBottom: 5 },
  balance: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#34C759', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  payBtn: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  payBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyType: { fontSize: 16, fontWeight: '500' },
  historyDate: { fontSize: 12, color: '#999', marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#999', marginTop: 10 },
});
