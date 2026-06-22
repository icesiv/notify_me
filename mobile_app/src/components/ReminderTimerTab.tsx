import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Vibration,
  Animated,
  ScrollView,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  isEnabled: boolean;
}

export default function ReminderTimerTab() {
  const [activeSegment, setActiveSegment] = useState<'reminders' | 'timer'>('reminders');

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentControlContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === 'reminders' && styles.activeSegmentButton,
          ]}
          onPress={() => setActiveSegment('reminders')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === 'reminders' && styles.activeSegmentText,
            ]}
          >
            ⏰ Reminders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === 'timer' && styles.activeSegmentButton,
          ]}
          onPress={() => setActiveSegment('timer')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === 'timer' && styles.activeSegmentText,
            ]}
          >
            ⏳ Timer
          </Text>
        </TouchableOpacity>
      </View>

      {activeSegment === 'reminders' ? <RemindersView /> : <TimerView />}
    </View>
  );
}

/* ==========================================================================
   Reminders Sub-View
   ========================================================================== */
function RemindersView() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  useEffect(() => {
    loadReminders();
    const subscription = DeviceEventEmitter.addListener('reminders_updated', loadReminders);
    return () => subscription.remove();
  }, []);

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem('userReminders');
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load reminders:', e);
    }
  };

  const saveReminders = async (updated: Reminder[]) => {
    try {
      await AsyncStorage.setItem('userReminders', JSON.stringify(updated));
      setReminders(updated);
    } catch (e) {
      console.error('Failed to save reminders:', e);
    }
  };

  const handleAddReminder = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a reminder title.');
      return;
    }
    if (!date.trim() || !time.trim()) {
      Alert.alert('Error', 'Please set a valid date and time.');
      return;
    }

    const newReminder: Reminder = {
      id: Date.now().toString(),
      title: title.trim(),
      date: date.trim(),
      time: time.trim(),
      isEnabled: true,
    };

    const updated = [newReminder, ...reminders];
    saveReminders(updated);

    // Reset form
    setTitle('');
    setDate('');
    setTime('');
    setModalVisible(false);
  };

  const toggleReminder = (id: string) => {
    const updated = reminders.map(r => 
      r.id === id ? { ...r, isEnabled: !r.isEnabled } : r
    );
    saveReminders(updated);
  };

  const deleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    saveReminders(updated);
  };

  // Helper presets
  const applyPreset = (minutesToAdd: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutesToAdd);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
  };

  const applyTomorrowPreset = (hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(hour).padStart(2, '0');

    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:00`);
  };

  const openForm = () => {
    // Preset to +1 hour
    applyPreset(60);
    setTitle('');
    setModalVisible(true);
  };

  const renderReminderItem = ({ item }: { item: Reminder }) => (
    <View style={[styles.card, !item.isEnabled && styles.disabledCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, !item.isEnabled && styles.disabledText]}>
            {item.title}
          </Text>
          <Text style={styles.cardSubtitle}>
            📅 {item.date}  •  ⏰ {item.time}
          </Text>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.toggleBtn, item.isEnabled ? styles.toggleActive : styles.toggleInactive]}
            onPress={() => toggleReminder(item.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleKnob, item.isEnabled ? styles.knobActive : styles.knobInactive]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deleteReminder(item.id)}
            activeOpacity={0.6}
          >
            <Text style={styles.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.subViewContainer}>
      <View style={styles.subViewHeader}>
        <Text style={styles.sectionTitle}>My Reminders</Text>
        <TouchableOpacity style={styles.addButton} onPress={openForm} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reminders}
        keyExtractor={item => item.id}
        renderItem={renderReminderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No reminders set</Text>
            <Text style={styles.emptySubtext}>Add a reminder to stay notified on time.</Text>
          </View>
        }
      />

      {/* Add Reminder Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Reminder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollForm} keyboardShouldPersistTaps="handled">
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Reminder Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="What should we notify you about?"
                  placeholderTextColor="#64748B"
                  value={title}
                  onChangeText={setTitle}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2026-06-25"
                  placeholderTextColor="#64748B"
                  value={date}
                  onChangeText={setDate}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 14:30"
                  placeholderTextColor="#64748B"
                  value={time}
                  onChangeText={setTime}
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.presetsTitle}>Quick Time Presets</Text>
              <View style={styles.presetsGrid}>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset(15)}>
                  <Text style={styles.presetChipText}>+15 Min</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset(60)}>
                  <Text style={styles.presetChipText}>+1 Hour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset(180)}>
                  <Text style={styles.presetChipText}>+3 Hours</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyTomorrowPreset(9)}>
                  <Text style={styles.presetChipText}>Tmrw 9 AM</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => applyTomorrowPreset(18)}>
                  <Text style={styles.presetChipText}>Tmrw 6 PM</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddReminder}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Create Reminder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ==========================================================================
   Timer Sub-View
   ========================================================================== */
function TimerView() {
  // Timer settings
  const [setHours, setSetHours] = useState(0);
  const [setMinutes, setSetMinutes] = useState(5);
  const [setSeconds, setSetSeconds] = useState(0);

  // Active Timer state
  const [timeLeft, setTimeLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isSetup, setIsSetup] = useState(true);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadActiveTimer = async () => {
    try {
      const storedEndTime = await AsyncStorage.getItem('activeTimerEndTime');
      const storedDuration = await AsyncStorage.getItem('activeTimerDuration');

      if (storedDuration) {
        const duration = Number(storedDuration);
        const h = Math.floor(duration / 3600);
        const m = Math.floor((duration % 3600) / 60);
        const s = duration % 60;
        setSetHours(h);
        setSetMinutes(m);
        setSetSeconds(s);

        if (storedEndTime === '0') {
          // Paused state
          setTimeLeft(duration);
          setIsSetup(false);
          setIsRunning(false);
        } else if (storedEndTime) {
          const endTime = Number(storedEndTime);
          const now = Date.now();
          if (endTime > now) {
            const remaining = Math.round((endTime - now) / 1000);
            setTimeLeft(remaining);
            setIsSetup(false);
            setIsRunning(true);
          } else {
            // Already ended in background
            setTimeLeft(0);
            setIsSetup(true);
            setIsRunning(false);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load active timer:', e);
    }
  };

  useEffect(() => {
    loadActiveTimer();

    const subscription = DeviceEventEmitter.addListener('timer_updated', loadActiveTimer);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isRunning) {
      // Pulse animation loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, pulseAnim]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    setIsSetup(true);
    try {
      await AsyncStorage.removeItem('activeTimerEndTime');
      await AsyncStorage.removeItem('activeTimerDuration');
    } catch (e) {
      console.error(e);
    }
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    Alert.alert('Time Up! 🔔', 'Your countdown timer has finished.', [
      { text: 'Stop Vibration', onPress: () => Vibration.cancel() }
    ]);
  };

  const startTimer = async () => {
    const totalSecs = setHours * 3600 + setMinutes * 60 + setSeconds;
    if (totalSecs <= 0) {
      Alert.alert('Error', 'Please set a timer duration greater than 0.');
      return;
    }

    const endTime = Date.now() + totalSecs * 1000;
    try {
      await AsyncStorage.setItem('activeTimerEndTime', String(endTime));
      await AsyncStorage.setItem('activeTimerDuration', String(totalSecs));
    } catch (e) {
      console.error(e);
    }

    setTimeLeft(totalSecs);
    setIsSetup(false);
    setIsRunning(true);
  };

  const togglePause = async () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);

    try {
      if (nextRunning) {
        const endTime = Date.now() + timeLeft * 1000;
        await AsyncStorage.setItem('activeTimerEndTime', String(endTime));
      } else {
        await AsyncStorage.setItem('activeTimerEndTime', '0');
        await AsyncStorage.setItem('activeTimerDuration', String(timeLeft));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setIsSetup(true);
    try {
      await AsyncStorage.removeItem('activeTimerEndTime');
      await AsyncStorage.removeItem('activeTimerDuration');
    } catch (e) {
      console.error(e);
    }
    setTimeLeft(setHours * 3600 + setMinutes * 60 + setSeconds);
  };

  // Adjusters
  const adjustValue = (type: 'h' | 'm' | 's', direction: 'up' | 'down') => {
    if (type === 'h') {
      setSetHours(prev => {
        const val = direction === 'up' ? prev + 1 : prev - 1;
        return val < 0 ? 23 : val > 23 ? 0 : val;
      });
    } else if (type === 'm') {
      setSetMinutes(prev => {
        const val = direction === 'up' ? prev + 1 : prev - 1;
        return val < 0 ? 59 : val > 59 ? 0 : val;
      });
    } else {
      setSetSeconds(prev => {
        const val = direction === 'up' ? prev + 1 : prev - 1;
        return val < 0 ? 59 : val > 59 ? 0 : val;
      });
    }
  };

  // Formatting helper
  const formatTimeDisplay = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={styles.timerSubContainer}>
      {isSetup ? (
        <View style={styles.timerConfigWrapper}>
          <Text style={styles.configHeaderTitle}>Set Timer Duration</Text>
          <View style={styles.pickerContainer}>
            {/* Hours */}
            <View style={styles.pickerColumn}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustValue('h', 'up')} activeOpacity={0.6}>
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.pickerValue}>{String(setHours).padStart(2, '0')}</Text>
              <Text style={styles.pickerLabel}>Hours</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustValue('h', 'down')} activeOpacity={0.6}>
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.pickerDivider}>:</Text>

            {/* Minutes */}
            <View style={styles.pickerColumn}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustValue('m', 'up')} activeOpacity={0.6}>
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.pickerValue}>{String(setMinutes).padStart(2, '0')}</Text>
              <Text style={styles.pickerLabel}>Mins</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustValue('m', 'down')} activeOpacity={0.6}>
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.pickerDivider}>:</Text>

            {/* Seconds */}
            <View style={styles.pickerColumn}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustValue('s', 'up')} activeOpacity={0.6}>
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.pickerValue}>{String(setSeconds).padStart(2, '0')}</Text>
              <Text style={styles.pickerLabel}>Secs</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustValue('s', 'down')} activeOpacity={0.6}>
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.timerStartBtn} onPress={startTimer} activeOpacity={0.8}>
            <Text style={styles.timerStartBtnText}>Start Timer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeTimerWrapper}>
          <Animated.View
            style={[
              styles.timerRing,
              isRunning && { transform: [{ scale: pulseAnim }] },
              isRunning ? styles.timerRingRunning : styles.timerRingPaused,
            ]}
          >
            <Text style={styles.timerDisplay}>{formatTimeDisplay(timeLeft)}</Text>
            <Text style={styles.timerStatusText}>{isRunning ? 'RUNNING' : 'PAUSED'}</Text>
          </Animated.View>

          <View style={styles.timerControlsGrid}>
            <TouchableOpacity
              style={[styles.timerControlBtn, isRunning ? styles.pauseBtn : styles.playBtn]}
              onPress={togglePause}
              activeOpacity={0.8}
            >
              <Text style={styles.controlText}>{isRunning ? '⏸ Pause' : '▶ Resume'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.timerControlBtn, styles.resetBtn]}
              onPress={resetTimer}
              activeOpacity={0.8}
            >
              <Text style={styles.controlText}>⏹ Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ==========================================================================
   Styles
   ========================================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentControlContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1B2E',
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2D2942',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeSegmentButton: {
    backgroundColor: '#7C3AED',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeSegmentText: {
    color: '#FFFFFF',
  },
  subViewContainer: {
    flex: 1,
  },
  subViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2D2942',
  },
  disabledCard: {
    opacity: 0.5,
    borderColor: '#1E1B2E',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  disabledText: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleBtn: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleActive: {
    backgroundColor: '#7C3AED',
  },
  toggleInactive: {
    backgroundColor: '#334155',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  knobActive: {
    alignSelf: 'flex-end',
  },
  knobInactive: {
    alignSelf: 'flex-start',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 9, 20, 0.7)',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#1E1B2E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#2D2942',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeModalText: {
    fontSize: 20,
    color: '#64748B',
    padding: 8,
  },
  scrollForm: {
    paddingBottom: 40,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0B0914',
    borderWidth: 1.5,
    borderColor: '#2D2942',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    color: '#FFFFFF',
    fontSize: 16,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  presetChip: {
    backgroundColor: '#2D2942',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  presetChipText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Timer Specific Styles
  timerSubContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  timerConfigWrapper: {
    alignItems: 'center',
    backgroundColor: '#1E1B2E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#2D2942',
  },
  configHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pickerColumn: {
    alignItems: 'center',
    width: 60,
  },
  arrowBtn: {
    padding: 8,
  },
  arrowText: {
    color: '#A78BFA',
    fontSize: 18,
  },
  pickerValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  pickerLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  pickerDivider: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D2942',
    marginHorizontal: 12,
    paddingBottom: 24,
  },
  timerStartBtn: {
    backgroundColor: '#7C3AED',
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerStartBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeTimerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    backgroundColor: '#1E1B2E',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  timerRingRunning: {
    borderColor: '#7C3AED',
  },
  timerRingPaused: {
    borderColor: '#334155',
  },
  timerDisplay: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  timerStatusText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 2,
  },
  timerControlsGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  timerControlBtn: {
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
  },
  playBtn: {
    backgroundColor: '#059669',
  },
  pauseBtn: {
    backgroundColor: '#D97706',
  },
  resetBtn: {
    backgroundColor: '#334155',
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
