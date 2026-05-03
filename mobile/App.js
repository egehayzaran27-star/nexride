import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import LiveMapScreen from './src/screens/LiveMapScreen';
import NotificationScreen from './src/screens/NotificationScreen';
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
      tabBarStyle: { 
        backgroundColor: '#000', 
        height: 70, 
        paddingBottom: 10,
        borderTopWidth: 0,
        elevation: 10
      },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }
    }}>
      <Tab.Screen name="Cüzdan" component={WalletScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="wallet" size={22} color={color} />,
        headerTitle: 'Cüzdanım'
      }} />
      <Tab.Screen name="Bildirimler" component={NotificationScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="notifications" size={22} color={color} />,
        headerTitle: 'Bildirimler'
      }} />
      <Tab.Screen name="Ana Sayfa" component={HomeScreen} options={{ 
        tabBarLabel: () => null,
        tabBarIcon: ({ color, focused }) => (
          <View style={{
            width: 60,
            height: 60,
            backgroundColor: '#f59e0b',
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 30,
            borderWidth: 4,
            borderColor: '#000',
            elevation: 5,
            shadowColor: '#f59e0b',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5
          }}>
            <Ionicons name="home" size={28} color="#000" />
          </View>
        ),
        headerShown: false
      }} />
      <Tab.Screen name="Canlı" component={LiveMapScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="map" size={22} color={color} />,
        headerTitle: 'Canlı Harita'
      }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ 
        tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        headerTitle: 'Profilim'
      }} />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            ) : (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="DriverMain" component={DriverTabs} />
                <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: true, title: 'Yönetim Paneli' }} />
              </>
            )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
