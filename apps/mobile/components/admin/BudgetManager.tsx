/**
 * Budget Manager Component
 *
 * Manages AI budgets with CRUD operations and visual progress bars.
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Edit2,
  Trash2,
  Target,
  Bell,
  BellOff,
  X,
} from 'lucide-react-native';
import {
  AIBudget,
  BudgetFormData,
  BudgetType,
  formatCostDollars,
  getBudgetStatusColor,
  getPeriodLabel,
} from '../../types/costs';

interface BudgetManagerProps {
  budgets: AIBudget[];
  onCreateBudget: (data: BudgetFormData) => Promise<{ error: Error | null }>;
  onUpdateBudget: (id: string, data: Partial<BudgetFormData>) => Promise<{ error: Error | null }>;
  onDeleteBudget: (id: string) => Promise<{ error: Error | null }>;
  isSaving: boolean;
}

const BUDGET_TYPES: { label: string; value: BudgetType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Total', value: 'total' },
];

interface BudgetFormState {
  name: string;
  budget_type: BudgetType;
  limit_dollars: string;
  alert_threshold_percent: string;
  is_active: boolean;
  notify_on_threshold: boolean;
  notify_on_exceeded: boolean;
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: AIBudget;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percentUsed =
    budget.limit_cents > 0
      ? (budget.current_spend_cents / budget.limit_cents) * 100
      : 0;
  const statusColor = getBudgetStatusColor(percentUsed);
  const progressWidth = Math.min(100, percentUsed);

  return (
    <View
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: budget.is_active ? `${statusColor}40` : 'rgba(255,255,255,0.1)',
        opacity: budget.is_active ? 1 : 0.6,
      }}
    >
      <LinearGradient
        colors={[
          budget.is_active ? `${statusColor}15` : 'rgba(255,255,255,0.03)',
          budget.is_active ? `${statusColor}08` : 'rgba(255,255,255,0.01)',
        ]}
        style={{ padding: 16 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={16} color={statusColor} />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                {budget.name}
              </Text>
              {!budget.is_active && (
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    Inactive
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
              {getPeriodLabel(budget.budget_type)} budget
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={onEdit}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <Edit2 size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'rgba(239,68,68,0.1)',
              }}
            >
              <Trash2 size={16} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* Progress */}
        <View style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
              {formatCostDollars(budget.current_spend_cents)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              of {formatCostDollars(budget.limit_cents)}
            </Text>
          </View>

          <View
            style={{
              height: 8,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progressWidth}%`,
                backgroundColor: statusColor,
                borderRadius: 4,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {Math.round(percentUsed)}% used
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              Alert at {budget.alert_threshold_percent}%
            </Text>
          </View>
        </View>

        {/* Notification status */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {budget.notify_on_threshold ? (
              <Bell size={12} color="#f59e0b" />
            ) : (
              <BellOff size={12} color="rgba(255,255,255,0.3)" />
            )}
            <Text
              style={{
                color: budget.notify_on_threshold
                  ? 'rgba(255,255,255,0.6)'
                  : 'rgba(255,255,255,0.3)',
                fontSize: 11,
              }}
            >
              Threshold alert
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {budget.notify_on_exceeded ? (
              <Bell size={12} color="#ef4444" />
            ) : (
              <BellOff size={12} color="rgba(255,255,255,0.3)" />
            )}
            <Text
              style={{
                color: budget.notify_on_exceeded
                  ? 'rgba(255,255,255,0.6)'
                  : 'rgba(255,255,255,0.3)',
                fontSize: 11,
              }}
            >
              Exceeded alert
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export function BudgetManager({
  budgets,
  onCreateBudget,
  onUpdateBudget,
  onDeleteBudget,
  isSaving,
}: BudgetManagerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<AIBudget | null>(null);
  const [form, setForm] = useState<BudgetFormState>({
    name: '',
    budget_type: 'monthly',
    limit_dollars: '',
    alert_threshold_percent: '80',
    is_active: true,
    notify_on_threshold: true,
    notify_on_exceeded: true,
  });

  const resetForm = () => {
    setForm({
      name: '',
      budget_type: 'monthly',
      limit_dollars: '',
      alert_threshold_percent: '80',
      is_active: true,
      notify_on_threshold: true,
      notify_on_exceeded: true,
    });
    setEditingBudget(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const openEditModal = (budget: AIBudget) => {
    setEditingBudget(budget);
    setForm({
      name: budget.name,
      budget_type: budget.budget_type,
      limit_dollars: (budget.limit_cents / 100).toString(),
      alert_threshold_percent: budget.alert_threshold_percent.toString(),
      is_active: budget.is_active,
      notify_on_threshold: budget.notify_on_threshold,
      notify_on_exceeded: budget.notify_on_exceeded,
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    const data: BudgetFormData = {
      name: form.name.trim() || 'Budget',
      budget_type: form.budget_type,
      limit_cents: Math.round(parseFloat(form.limit_dollars || '0') * 100),
      alert_threshold_percent: parseInt(form.alert_threshold_percent || '80', 10),
      is_active: form.is_active,
      notify_on_threshold: form.notify_on_threshold,
      notify_on_exceeded: form.notify_on_exceeded,
    };

    const result = editingBudget
      ? await onUpdateBudget(editingBudget.id, data)
      : await onCreateBudget(data);

    if (!result.error) {
      setIsModalVisible(false);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    await onDeleteBudget(id);
  };

  return (
    <View>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
          }}
        >
          BUDGETS
        </Text>
        <Pressable
          onPress={openCreateModal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(16, 185, 129, 0.3)',
          }}
        >
          <Plus size={14} color="#10b981" />
          <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600' }}>
            Add Budget
          </Text>
        </Pressable>
      </View>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <View
          style={{
            padding: 32,
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            borderStyle: 'dashed',
          }}
        >
          <Target size={32} color="rgba(255,255,255,0.2)" />
          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
              marginTop: 12,
            }}
          >
            No budgets set
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12,
              marginTop: 4,
            }}
          >
            Create a budget to track spending limits
          </Text>
        </View>
      ) : (
        budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            onEdit={() => openEditModal(budget)}
            onDelete={() => handleDelete(budget.id)}
          />
        ))
      )}

      {/* Budget Form Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#1A1A1F',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
                {editingBudget ? 'Edit Budget' : 'Create Budget'}
              </Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <X size={24} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Name */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Budget Name
                </Text>
                <TextInput
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  placeholder="e.g., Monthly AI Budget"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    padding: 14,
                    color: '#fff',
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                />
              </View>

              {/* Budget Type */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Budget Period
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {BUDGET_TYPES.map((type) => (
                    <Pressable
                      key={type.value}
                      onPress={() => setForm({ ...form, budget_type: type.value })}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor:
                          form.budget_type === type.value
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        borderColor:
                          form.budget_type === type.value
                            ? 'rgba(16, 185, 129, 0.5)'
                            : 'rgba(255,255,255,0.1)',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color:
                            form.budget_type === type.value
                              ? '#10b981'
                              : 'rgba(255,255,255,0.6)',
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Limit */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Spending Limit ($)
                </Text>
                <TextInput
                  value={form.limit_dollars}
                  onChangeText={(text) => setForm({ ...form, limit_dollars: text })}
                  placeholder="500.00"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="decimal-pad"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    padding: 14,
                    color: '#fff',
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                />
              </View>

              {/* Alert Threshold */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Alert Threshold (%)
                </Text>
                <TextInput
                  value={form.alert_threshold_percent}
                  onChangeText={(text) =>
                    setForm({ ...form, alert_threshold_percent: text })
                  }
                  placeholder="80"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    padding: 14,
                    color: '#fff',
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                />
              </View>

              {/* Toggle Options */}
              <View style={{ marginBottom: 20 }}>
                <Pressable
                  onPress={() => setForm({ ...form, is_active: !form.is_active })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15 }}>Active</Text>
                  <View
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: form.is_active
                        ? '#10b981'
                        : 'rgba(255,255,255,0.1)',
                      justifyContent: 'center',
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#fff',
                        alignSelf: form.is_active ? 'flex-end' : 'flex-start',
                      }}
                    />
                  </View>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setForm({ ...form, notify_on_threshold: !form.notify_on_threshold })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15 }}>
                    Alert on Threshold
                  </Text>
                  <View
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: form.notify_on_threshold
                        ? '#f59e0b'
                        : 'rgba(255,255,255,0.1)',
                      justifyContent: 'center',
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#fff',
                        alignSelf: form.notify_on_threshold ? 'flex-end' : 'flex-start',
                      }}
                    />
                  </View>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setForm({ ...form, notify_on_exceeded: !form.notify_on_exceeded })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15 }}>
                    Alert on Exceeded
                  </Text>
                  <View
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: form.notify_on_exceeded
                        ? '#ef4444'
                        : 'rgba(255,255,255,0.1)',
                      justifyContent: 'center',
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#fff',
                        alignSelf: form.notify_on_exceeded ? 'flex-end' : 'flex-start',
                      }}
                    />
                  </View>
                </Pressable>
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                style={{
                  backgroundColor: '#10b981',
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                  marginBottom: 32,
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    {editingBudget ? 'Update Budget' : 'Create Budget'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
