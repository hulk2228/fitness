import { WorkoutData } from './types';

export const WORKOUT_DATA: WorkoutData = [
  {
    id: 'chest',
    title: 'Chest',
    icon: '🔥',
    color: 'from-red-200 to-pink-200', // Pale gradient for icon
    bgColor: 'bg-red-50', // Very light pale red for expanded background
    borderColor: 'border-slate-200', // Soft light border
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: 10, weight: '135lbs', difficulty: 'Hard' },
      { name: 'Incline Bench Press', sets: 4, reps: 10, weight: '115lbs', difficulty: 'Hard' },
      { name: 'Dumbbell Bench Press', sets: 4, reps: 10, weight: '80lbs', difficulty: 'Medium' },
      { name: 'Pec Deck Fly', sets: 4, reps: 10, weight: '100lbs', difficulty: 'Easy' },
      { name: 'Dumbbell Incline Fly', sets: 4, reps: 10, weight: '60lbs', difficulty: 'Medium' }
    ]
  },
  {
    id: 'back',
    title: 'Back',
    icon: '💎',
    color: 'from-sky-200 to-cyan-200',
    bgColor: 'bg-sky-50',
    borderColor: 'border-slate-200',
    exercises: [
      { name: 'Extension Row', sets: 3, reps: '12-15', weight: '120lbs', difficulty: 'Medium' },
      { name: 'Barbell Row', sets: 3, reps: 8, weight: '155lbs', difficulty: 'Hard' },
      { name: 'Lat Pulldowns', sets: 3, reps: 10, weight: '140lbs', difficulty: 'Medium' },
      { name: 'Dumbbell Rows', sets: 3, reps: 8, weight: '85lbs', difficulty: 'Medium' },
      { name: 'Row V-Rod', sets: 4, reps: '8-15', weight: '110lbs', difficulty: 'Easy' }
    ]
  },
  {
    id: 'shoulders',
    title: 'Shoulders',
    icon: '⚡',
    color: 'from-purple-200 to-indigo-200',
    bgColor: 'bg-purple-50',
    borderColor: 'border-slate-200',
    exercises: [
      { name: 'Shoulder Press', sets: 4, reps: '8-15', weight: '95lbs', difficulty: 'Hard' },
      { name: 'Shrugs', sets: 4, reps: '8-15', weight: '135lbs', difficulty: 'Medium' },
      { name: 'Face Pulls', sets: 4, reps: '8-15', weight: '70lbs', difficulty: 'Easy' },
      { name: 'Front Raises', sets: 4, reps: '8-15', weight: '25lbs', difficulty: 'Easy' },
      { name: 'Lateral Raises', sets: 4, reps: '8-15', weight: '20lbs', difficulty: 'Medium' }
    ]
  },
  {
    id: 'biceps',
    title: 'Biceps',
    icon: '💪',
    color: 'from-green-200 to-teal-200',
    bgColor: 'bg-green-50',
    borderColor: 'border-slate-200',
    exercises: [
      { name: 'Hammer Curls', sets: 3, reps: '10-12', weight: '40lbs', difficulty: 'Medium' },
      { name: 'Barbell Curls', sets: 3, reps: '8-10', weight: '65lbs', difficulty: 'Hard' },
      { name: 'Concentration Curls', sets: 3, reps: '10-12', weight: '30lbs', difficulty: 'Medium' },
      { name: 'Preacher Curls', sets: 3, reps: '8-10', weight: '55lbs', difficulty: 'Hard' },
      { name: 'Cable Curls', sets: 3, reps: '12-15', weight: '50lbs', difficulty: 'Easy' }
    ]
  },
  {
    id: 'triceps',
    title: 'Triceps',
    icon: '🚀',
    color: 'from-amber-200 to-yellow-200',
    bgColor: 'bg-amber-50',
    borderColor: 'border-slate-200',
    exercises: [
      { name: 'Close-Grip Bench Press', sets: 4, reps: '8-15', weight: '115lbs', difficulty: 'Hard' },
      { name: 'Bench Dips', sets: 4, reps: '8-15', weight: 'Bodyweight', difficulty: 'Medium' },
      { name: 'DB Overhead Extension', sets: 4, reps: '8-15', weight: '60lbs', difficulty: 'Medium' },
      { name: 'Bar Pushdown', sets: 4, reps: '8-15', weight: '80lbs', difficulty: 'Easy' },
      { name: 'Skull Crushers', sets: 4, reps: '8-15', weight: '70lbs', difficulty: 'Hard' }
    ]
  },
  {
    id: 'legs',
    title: 'Legs',
    icon: '🦵',
    color: 'from-fuchsia-200 to-pink-200',
    bgColor: 'bg-fuchsia-50',
    borderColor: 'border-slate-200',
    exercises: [
      { name: 'Back Squat', sets: 2, reps: 8, weight: '185lbs', difficulty: 'Hard' },
      { name: 'Leg Press', sets: 2, reps: 15, weight: '270lbs', difficulty: 'Medium' },
      { name: 'Leg Extensions', sets: 2, reps: 15, weight: '120lbs', difficulty: 'Easy' },
      { name: 'Leg Curls', sets: 2, reps: 12, weight: '100lbs', difficulty: 'Medium' },
      { name: 'Dumbbell Hamstrings', sets: 2, reps: 10, weight: '50lbs', difficulty: 'Medium' }
    ]
  }
];

export const TOTAL_EXERCISES_COUNT = WORKOUT_DATA.reduce((sum, section) => sum + section.exercises.length, 0);