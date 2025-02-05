import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type WeekDaysProps = {
  selectedDay?: number;
  onDayPress?: (dayNumber: number) => void;
  isSelectable?: boolean;
};

export default function WeekDays({ selectedDay, onDayPress, isSelectable = true }: WeekDaysProps) {
  const today = new Date().getDay();

  return (
    <View style={styles.weekDays}>
      {DAYS.map((day, index) => {
        const dayNumber = (index + 1) % 7;
        const isToday = dayNumber === today;
        const isSelected = dayNumber === selectedDay;
        const isClickable = isSelectable || isToday;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayCircle,
              isSelected && styles.selectedDayCircle,
              isToday && !isSelectable && styles.activeDayCircle,
              !isClickable && styles.disabledDayCircle
            ]}
            onPress={() => isClickable && onDayPress?.(dayNumber)}
            disabled={!isClickable}
          >
            <Text style={[
              styles.dayText,
              isSelected && styles.selectedDayText,
              isToday && !isSelectable && styles.activeDayText,
              !isClickable && styles.disabledDayText
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  selectedDayCircle: {
    backgroundColor: '#1E1E1E',
    borderColor: '#1E1E1E',
  },
  activeDayCircle: {
    backgroundColor: '#1E1E1E',
    borderColor: '#1E1E1E',
  },
  disabledDayCircle: {
    backgroundColor: '#E8E8E8',
    borderColor: '#D0D0D0',
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  selectedDayText: {
    color: 'white',
  },
  activeDayText: {
    color: 'white',
  },
  disabledDayText: {
    color: '#1E1E1E',
    opacity: 0.3,
  },
}); 