import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { PersonalRecord } from '../types/database';
import { FirebaseService } from '../services/firebase';

type TimeRange = 'week' | 'month' | '6months' | 'year' | 'all';

type PRHistoryModalProps = {
  isVisible: boolean;
  onClose: () => void;
  userId: string;
  exerciseId: string;
  exerciseName: string;
};

export default function PRHistoryModal({ 
  isVisible, 
  onClose, 
  userId, 
  exerciseId,
  exerciseName 
}: PRHistoryModalProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [records, setRecords] = useState<PersonalRecord['records']>([]);
  const [selectedPoint, setSelectedPoint] = useState<{
    weight: number;
    date: string;
    index: number;
  } | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadHistory();
      setSelectedPoint(null); // Reset selection when modal becomes visible
    }
  }, [isVisible, timeRange]);

  const loadHistory = async () => {
    const history = await FirebaseService.getPRHistory(userId, exerciseId, timeRange);
    setRecords(history);
  };

  const chartData = {
    labels: records.map(() => ''), // Empty labels to hide x-axis text
    datasets: [{
      data: records.map(r => r.weight),
      color: (opacity = 1) => selectedPoint ? `rgba(76, 175, 80, ${opacity})` : `rgba(30, 30, 30, ${opacity})`
    }]
  };

  const handleDataPointClick = ({ index }: { index: number }) => {
    if (records[index]) {
      setSelectedPoint({
        weight: records[index].weight,
        date: new Date(records[index].timestamp).toLocaleDateString(),
        index
      });
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1E1E1E" />
            </TouchableOpacity>
            <Text style={styles.title}>{exerciseName} Progress</Text>
          </View>

          <View style={styles.timeRangeButtons}>
            {(['week', 'month', '6months', 'year', 'all'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.rangeButton,
                  timeRange === range && styles.activeRangeButton
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text style={[
                  styles.rangeButtonText,
                  timeRange === range && styles.activeRangeButtonText
                ]}>
                  {range === '6months' ? '6M' : range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {records.length > 0 ? (
            <View>
              <LineChart
                data={chartData}
                width={Dimensions.get('window').width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(30, 30, 30, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#1E1E1E"
                  }
                }}
                getDotColor={(dataPoint, index) => 
                  selectedPoint?.index === index ? '#4CAF50' : '#1E1E1E'
                }
                renderDotContent={({ x, y, index }) => 
                  selectedPoint?.index === index ? (
                    <View
                      key={index}
                      style={{
                        position: 'absolute',
                        left: x - 8,
                        top: y - 8,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: '#4CAF50',
                        borderWidth: 2,
                        borderColor: '#4CAF50'
                      }}
                    />
                  ) : null
                }
                bezier
                style={styles.chart}
                onDataPointClick={handleDataPointClick}
                withHorizontalLabels={true}
                withVerticalLabels={false}
              />
              {selectedPoint && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>
                    {selectedPoint.weight} lbs on {selectedPoint.date}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No records found for this time range</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rangeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
  },
  activeRangeButton: {
    backgroundColor: '#1E1E1E',
  },
  rangeButtonText: {
    color: '#1E1E1E',
  },
  activeRangeButtonText: {
    color: 'white',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
  },
  tooltip: {
    backgroundColor: '#1E1E1E',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  tooltipText: {
    color: 'white',
    fontSize: 14,
  },
}); 