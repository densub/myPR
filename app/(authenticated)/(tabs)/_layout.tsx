import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { router } from 'expo-router';

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {/* Schedule Tab */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('schedule')}
        >
          <Ionicons 
            name="calendar-outline"
            size={24} 
            color={state.index === 0 ? '#1E1E1E' : '#666'} 
          />
          <Text style={[
            styles.tabLabel,
            state.index === 0 && styles.tabLabelFocused
          ]}>
            Schedule
          </Text>
        </TouchableOpacity>

        {/* Add PR Button */}
        <TouchableOpacity
          style={styles.addPRButton}
          onPress={() => router.push('/(authenticated)/(modals)/add-pr')}
        >
          <View style={styles.addPRButtonInner}>
            <Ionicons name="add" size={28} color="#FFF" />
          </View>
          <Text style={styles.addPRLabel}>Add PR</Text>
        </TouchableOpacity>

        {/* Account Tab */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('account')}
        >
          <Ionicons 
            name="person-outline"
            size={24} 
            color={state.index === 1 ? '#1E1E1E' : '#666'} 
          />
          <Text style={[
            styles.tabLabel,
            state.index === 1 && styles.tabLabelFocused
          ]}>
            Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="schedule"
      tabBar={props => <CustomTabBar {...props} />}
    >
      {/* Comment out home tab for now
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule'
        }}
      />
      
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account'
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 65,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  addPRButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    marginTop: -40,
  },
  addPRButtonInner: {
    backgroundColor: '#1E1E1E',
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  addPRLabel: {
    fontSize: 12,
    color: '#1E1E1E',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabLabelFocused: {
    color: '#1E1E1E',
    fontWeight: '500',
  }
}); 