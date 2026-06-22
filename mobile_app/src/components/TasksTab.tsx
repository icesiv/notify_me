import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  isCompleted: boolean;
}

export default function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    loadTasks();
    const subscription = DeviceEventEmitter.addListener('tasks_updated', loadTasks);
    return () => subscription.remove();
  }, []);

  const loadTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem('userTasks');
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  const saveTasks = async (updated: Task[]) => {
    try {
      await AsyncStorage.setItem('userTasks', JSON.stringify(updated));
      setTasks(updated);
    } catch (e) {
      console.error('Failed to save tasks:', e);
    }
  };

  const handleAddTask = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate.trim() || undefined,
      isCompleted: false,
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);

    // Reset Form
    setTitle('');
    setDescription('');
    setPriority('low');
    setDueDate('');
    setModalVisible(false);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
  };

  const getPriorityColor = (p: Task['priority']) => {
    switch (p) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#94A3B8';
    }
  };

  // Sort tasks: Active first, then completed. Inside those, order by ID desc.
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return b.id.localeCompare(a.id);
  });

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={[styles.taskCard, item.isCompleted && styles.completedCard]}>
      <View style={styles.cardHeader}>
        {/* Custom Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, item.isCompleted && styles.checkboxChecked]}
          onPress={() => toggleTask(item.id)}
          activeOpacity={0.8}
        >
          {item.isCompleted && <Text style={styles.checkboxCheckmark}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, item.isCompleted && styles.completedText]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.taskDescription, item.isCompleted && styles.completedSubtext]}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            {/* Priority Badge */}
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '1A', borderColor: getPriorityColor(item.priority) }]}>
              <Text style={[styles.priorityBadgeText, { color: getPriorityColor(item.priority) }]}>
                {item.priority.toUpperCase()}
              </Text>
            </View>

            {/* Due Date Badge */}
            {item.dueDate ? (
              <View style={styles.dueDateBadge}>
                <Text style={styles.dueDateText}>📅 {item.dueDate}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteTask(item.id)} activeOpacity={0.6}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Task Checklist</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>+ New Task</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedTasks}
        keyExtractor={item => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>All tasks completed</Text>
            <Text style={styles.emptySubtext}>Add a task to organize your check-offs.</Text>
          </View>
        }
      />

      {/* Add Task Modal */}
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
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollForm} keyboardShouldPersistTaps="handled">
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Task Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Task title..."
                  placeholderTextColor="#64748B"
                  value={title}
                  onChangeText={setTitle}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Enter details..."
                  placeholderTextColor="#64748B"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Priority Level</Text>
                <View style={styles.prioritySelector}>
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityBtn,
                        priority === p && {
                          backgroundColor: getPriorityColor(p) + '22',
                          borderColor: getPriorityColor(p),
                        },
                      ]}
                      onPress={() => setPriority(p)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(p) }]} />
                      <Text
                        style={[
                          styles.priorityBtnText,
                          priority === p && styles.priorityBtnTextActive,
                          priority === p && { color: getPriorityColor(p) },
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Due Date (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Tomorrow, or June 24"
                  placeholderTextColor="#64748B"
                  value={dueDate}
                  onChangeText={setDueDate}
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddTask}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Create Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
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
  taskCard: {
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2D2942',
  },
  completedCard: {
    opacity: 0.5,
    borderColor: '#1E1B2E',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 8,
  },
  completedSubtext: {
    color: '#64748B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dueDateBadge: {
    backgroundColor: 'rgba(30, 27, 46, 0.5)',
    borderWidth: 1,
    borderColor: '#2D2942',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dueDateText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  multilineInput: {
    height: 80,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0914',
    borderWidth: 1.5,
    borderColor: '#2D2942',
    borderRadius: 12,
    height: 48,
    marginHorizontal: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  priorityBtnTextActive: {
    fontWeight: '700',
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
});
