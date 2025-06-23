
export interface Exercise {
  name: string;
  sets: number;
  reps: string | number;
  weight: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface WorkoutSection {
  id: string;
  title: string;
  icon: string; // Emoji or character
  color: string; // Tailwind gradient classes
  bgColor: string; // Tailwind background class
  borderColor: string; // Tailwind border class
  exercises: Exercise[];
}

export type WorkoutData = WorkoutSection[];

export type CurrentSetRecord = Record<string, number>;
