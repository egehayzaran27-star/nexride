import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import WalletScreen from './src/screens/WalletScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AdminScreen from './src/screens/AdminScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import { useStore } from './src/store/useStore';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const user = useStore((state) => state.user);

  return (
    <Tab.Navigator screenOptions={{ 
      tabBarActiveTintColor: '#f59e0b', 
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: { backgroundColor: '#000', height: 60, paddingBottom: 10 }
    }}>
      <Tab.Screen name="Ana Sayfa" component={HomeScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        headerShown: false
      }} />
      <Tab.Screen name="Cüzdan" component={WalletScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="wallet" size={24} color={color} />,
        headerTitle: 'Cüzdanım'
      }} />
      <Tab.Screen name="Kartlarım" component={PaymentMethodsScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="card" size={24} color={color} />,
        headerTitle: 'Ödeme Yöntemleri'
      }} />
      <Tab.Screen name="Geçmiş" component={HistoryScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
        headerTitle: 'Yolculuk Geçmişi'
      }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        headerTitle: 'Profilim'
      }} />
      {(user?.role === 'driver' || user?.isDriver) && (
        <Tab.Screen name="Sürücü" component={DriverHomeScreen} options={{ 
          tabBarIcon: ({ color }) => <Ionicons name="speedometer" size={24} color={color} />,
          headerTitle: 'Sürücü Paneli'
        }} />
      )}
      {user?.role === 'admin' && (
        <Tab.Screen name="Admin" component={AdminScreen} options={{ 
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={24} color={color} />,
          headerTitle: 'Yönetim Paneli'
        }} />
      )}
    </Tab.Navigator>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'speedometer' : 'speedometer-outline';
          else if (route.name === 'Wallet') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DriverHomeScreen} options={{ title: 'Panel' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Kazançlar' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f0f0' }}> 
        <NavigationContainer>
          <StatusBar style="dark" translucent={false} backgroundColor="#f0f0f0" />
          <Stack.Navigator screenOptions={{ 
            headerShown: false, 
            contentStyle: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' } 
          }}>
            {token == null ? (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            ) : user?.role === 'driver' ? (
              <Stack.Screen name="DriverMain" component={DriverTabs} />
            ) : (
              <Stack.Screen name="Main" component={MainTabs} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
