
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Check, ChevronDown, Timer, Target, Trophy, Flame, Zap, RotateCcw, Share2, Heart, Info, XCircle, Loader2 } from 'lucide-react';
import { WorkoutSection as WorkoutSectionType, CurrentSetRecord, Exercise } from './types';
import { WORKOUT_DATA, TOTAL_EXERCISES_COUNT } from './constants';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert basic Markdown to HTML for prose styling
function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md;

  // Headings (###, ##, #)
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-slate-700 font-semibold mb-2 mt-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-slate-700 font-semibold mb-2 mt-3">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-slate-700 font-semibold mb-2 mt-3">$1</h1>');
  
  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
  
  // Italics (*text* or _text_)
  // To avoid conflict with list items, ensure it's not a list item start
  html = html.replace(/(^|\s)\*(?!\s|[*])(.*?)(?!\s|\*)\*(?=[\spunctuation]|$)/gim, '$1<em>$2</em>');
  html = html.replace(/(^|\s)_(?!\s|[_])(.*?)(?!\s|_)_(?=[\spunctuation]|$)/gim, '$1<em>$2</em>');

  // Lists (*, -, +) - basic, doesn't handle nested
  // Process lists line by line, then wrap
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    if (/^\s*[\*\-\+] /.test(line)) {
      const itemContent = line.replace(/^\s*[\*\-\+] /, '');
      if (!inList) {
        inList = true;
        return `<ul><li>${itemContent}</li>`;
      }
      return `<li>${itemContent}</li>`;
    } else {
      if (inList) {
        inList = false;
        return `</ul>${line}`;
      }
      return line;
    }
  });
  if (inList) {
    processedLines.push('</ul>');
  }
  html = processedLines.join('\n');
  
  // Paragraphs (convert sequences of non-list, non-heading lines ending in double newline to <p>)
  // For simplicity, we'll rely on <br> for line breaks within prose and Gemini's formatting.
  // Replacing single newlines with <br> for general text.
  html = html.replace(/\n/g, '<br />');
  // Clean up <br> tags within <ul> or around <li>
  html = html.replace(/<ul><br \s*\/?>/gi, '<ul>');
  html = html.replace(/<br \s*\/?>\s*<\/ul>/gi, '</ul>');
  html = html.replace(/<li><br \s*\/?>/gi, '<li>');
  html = html.replace(/<br \s*\/?>\s*<\/li>/gi, '</li>');
  // Remove <br /> if it's the last thing in an <h3> or <h4> etc.
  html = html.replace(/(<\/?h[1-4]>)\s*<br \s*\/?>/gi, '$1');
  html = html.replace(/<br \s*\/?>\s*(<\/?h[1-4]>)/gi, '$1');


  return html;
}


const WorkoutApp: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [workoutTimer, setWorkoutTimer] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [currentSet, setCurrentSet] = useState<CurrentSetRecord>({});
  const [restTimer, setRestTimer] = useState<number>(0);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [workoutStarted, setWorkoutStarted] = useState<boolean>(false);

  // State for Gemini Exercise Tips
  const [isLoadingTip, setIsLoadingTip] = useState<boolean>(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [exerciseForTip, setExerciseForTip] = useState<string | null>(null); // Exercise name

  const workoutData: WorkoutSectionType[] = WORKOUT_DATA;
  const totalExercises = TOTAL_EXERCISES_COUNT;
  
  let ai: GoogleGenAI | null = null;
  try {
    if (process.env.API_KEY) {
      ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
      console.warn("API_KEY environment variable not set. Exercise tips feature will be disabled.");
    }
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
  }


  useEffect(() => {
    let interval: number | undefined;
    if (isTimerRunning && workoutStarted) {
      interval = window.setInterval(() => {
        setWorkoutTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, workoutStarted]);

  useEffect(() => {
    let interval: number | undefined;
    if (isResting && restTimer > 0) {
      interval = window.setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false);
            clearInterval(interval);
            // Optionally auto-start timer or give a sound cue
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isResting, restTimer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startWorkout = (): void => {
    setWorkoutStarted(true);
    setIsTimerRunning(true);
  };

  const toggleTimer = (): void => {
    if (!workoutStarted) {
      startWorkout();
    } else {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const toggleSection = (sectionId: string): void => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const startRest = (duration: number = 60): void => {
    setRestTimer(duration);
    setIsResting(true);
  };

  const toggleExerciseComplete = (sectionId: string, exerciseIndex: number): void => {
    const exerciseKey = `${sectionId}-${exerciseIndex}`;
    const newCompleted = new Set(completedExercises);
    
    if (newCompleted.has(exerciseKey)) {
      newCompleted.delete(exerciseKey);
    } else {
      newCompleted.add(exerciseKey);
      startRest(90); 
      
      // If a tip was shown for this exercise, hide it as it's now completed
      const exercise = workoutData.find(s => s.id === sectionId)?.exercises[exerciseIndex];
      if (exercise && exerciseForTip === exercise.name) {
        setCurrentTip(null);
        setExerciseForTip(null);
        setTipError(null);
        setIsLoadingTip(false);
      }

      if (newCompleted.size === totalExercises && totalExercises > 0) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 4500);
      }
    }
    setCompletedExercises(newCompleted);
  };

  const updateCurrentSet = (exerciseKey: string, setNumber: number): void => {
    setCurrentSet(prev => ({
      ...prev,
      [exerciseKey]: setNumber
    }));
  };

  const resetWorkout = (): void => {
    setCompletedExercises(new Set());
    setWorkoutTimer(0);
    setIsTimerRunning(false);
    setCurrentSet({});
    setRestTimer(0);
    setIsResting(false);
    setWorkoutStarted(false);
    setExpandedSection(null);
    setCurrentTip(null);
    setExerciseForTip(null);
    setTipError(null);
    setIsLoadingTip(false);
  };

  const getCompletionPercentage = useCallback((): number => {
    if (totalExercises === 0) return 0;
    return Math.round((completedExercises.size / totalExercises) * 100);
  }, [completedExercises.size, totalExercises]);

  const getDifficultyColor = (difficulty: 'Easy' | 'Medium' | 'Hard'): string => {
    switch (difficulty) {
      case 'Easy': return 'text-green-700 bg-green-100 border-green-200';
      case 'Medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'Hard': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const fetchExerciseTip = async (exerciseName: string) => {
    if (!ai) {
      setTipError("API key not configured. Cannot fetch tips.");
      setIsLoadingTip(false);
      setExerciseForTip(exerciseName); // Still set this to show the error under the right exercise
      setCurrentTip(null);
      return;
    }

    if (exerciseForTip === exerciseName && currentTip) {
      setCurrentTip(null);
      setExerciseForTip(null);
      setTipError(null);
      return;
    }

    setCurrentTip(null);
    setTipError(null);
    setIsLoadingTip(true);
    setExerciseForTip(exerciseName);

    try {
      const prompt = `Provide helpful information for the exercise: "${exerciseName}".
Please include:
1.  Key benefits.
2.  Step-by-step execution tips (if applicable).
3.  Common mistakes to avoid.

Use Markdown for formatting: use headings (e.g., "### Key Benefits"), bullet points (* or -), and bold text where appropriate. Keep the response concise and easy to read.`;
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
      });

      setCurrentTip(response.text);
    } catch (error) {
      console.error("Error fetching exercise tip:", error);
      let errorMessage = "Sorry, couldn't fetch tips for this exercise. Please try again.";
      if (error instanceof Error && error.message.toLowerCase().includes('api key not valid')) {
        errorMessage = "API Key is not valid. Please check your configuration.";
      } else if (error instanceof Error && error.message.toLowerCase().includes('quota')) {
        errorMessage = "API quota exceeded. Please check your Gemini project quotas.";
      }
      setTipError(errorMessage);
      setCurrentTip(null);
    } finally {
      setIsLoadingTip(false);
    }
  };


  const completedCount = completedExercises.size;
  const isWorkoutComplete = completedCount === totalExercises && totalExercises > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 relative overflow-x-hidden pb-24 selection:bg-blue-500/10">
      {showCelebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-sm p-4">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl text-center space-y-5 transform transition-all duration-500 scale-100 opacity-100">
            <div className="text-7xl sm:text-8xl animate-bounce">🎉</div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500">
              Workout Complete!
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">Incredible session! You're a true champion! 💪</p>
          </div>
        </div>
      )}

      {isResting && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-[90] bg-white/90 backdrop-blur-md rounded-2xl px-6 py-4 border border-slate-200 shadow-lg">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-orange-600">{formatTime(restTimer)}</div>
            <div className="text-sm text-slate-500">Resting...</div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-[80] bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-300 via-indigo-300 to-purple-300 rounded-2xl flex items-center justify-center shadow-md">
                <Flame size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">
                  Pale Grind
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">Light & Pale Workout UI</p>
              </div>
            </div>
            <div className="flex items-center space-x-2.5">
              {[
                { action: resetWorkout, label: "Reset workout", icon: RotateCcw },
                { action: () => alert('Share feature coming soon!'), label: "Share workout", icon: Share2 }
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  aria-label={btn.label}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50"
                >
                  <btn.icon size={18} />
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 sm:space-x-5">
                <button
                  onClick={toggleTimer}
                  aria-label={isTimerRunning ? "Pause workout" : "Start workout"}
                  className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full shadow-md transition-all duration-300 active:scale-95 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white flex items-center justify-center relative overflow-hidden
                    ${ workoutStarted 
                        ? isTimerRunning 
                          ? 'bg-gradient-to-br from-red-300 to-pink-300 text-white focus:ring-red-300' 
                          : 'bg-gradient-to-br from-yellow-300 to-amber-300 text-slate-700 focus:ring-yellow-300'
                        : 'bg-gradient-to-br from-blue-300 to-indigo-300 text-white focus:ring-blue-300'
                    }`}
                >
                  <span className="relative z-10">{isTimerRunning ? <Pause size={28} /> : <Play size={28} />}</span>
                </button>
                <div>
                  <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-800">{formatTime(workoutTimer)}</div>
                  <div className="text-xs sm:text-sm text-slate-500">
                    {workoutStarted ? (isTimerRunning ? 'Session Active' : 'Session Paused') : 'Tap to Begin'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-500">{getCompletionPercentage()}%</div>
                <div className="text-xs sm:text-sm text-slate-500">Progress</div>
              </div>
            </div>
          </div>

          <div className="relative mb-3"> {/* Adjusted margin bottom */}
            <div className="h-3 sm:h-3.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 to-blue-400 transition-all duration-700 ease-out rounded-full"
                style={{ width: `${getCompletionPercentage()}%` }}
              >
              </div>
            </div>
          </div>
          
          {/* Developed by Rahul Chirra Pill */}
          <div className="flex justify-center my-3">
            <div className="inline-block px-4 py-1.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full shadow-sm border border-sky-200">
              Developed by Rahul Chirra
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 mt-3"> {/* Adjusted margin top */}
            {[
              { icon: Heart, value: completedCount, label: 'Done', color: 'text-red-500', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
              { icon: Target, value: totalExercises, label: 'Total', color: 'text-blue-500', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
              { icon: Timer, value: Math.floor(workoutTimer / 60), label: 'Minutes', color: 'text-purple-500', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
              { icon: Zap, value: workoutData.length, label: 'Categories', color: 'text-orange-500', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bgColor} rounded-2xl p-3.5 sm:p-4 ${stat.borderColor} border shadow-md`}>
                 <div className="flex flex-col sm:flex-row items-center sm:space-x-2.5">
                    <stat.icon className={`${stat.color} mb-1 sm:mb-0 flex-shrink-0`} size={22} />
                    <div className="text-center sm:text-left">
                        <div className="text-lg sm:text-xl font-semibold text-slate-700">{stat.value}</div>
                        <div className="text-xs text-slate-500">{stat.label}</div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-8 space-y-4 sm:space-y-5 relative z-10 pt-6">
        {workoutData.map((section) => {
          const sectionCompletedCount = section.exercises.filter((_, i) => completedExercises.has(`${section.id}-${i}`)).length;
          const isExpanded = expandedSection === section.id;
          
          return (
            <div
              key={section.id}
              className={`rounded-3xl border ${section.borderColor} bg-white shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl`}
            >
              <button
                onClick={() => toggleSection(section.id)}
                aria-expanded={isExpanded}
                aria-controls={`section-content-${section.id}`}
                className="w-full p-4 sm:p-5 flex items-center justify-between transition-colors duration-300 focus:outline-none focus-visible:bg-slate-50"
              >
                <div className="flex items-center space-x-4 sm:space-x-5">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center text-2xl sm:text-3xl text-white shadow-md relative overflow-hidden`}>
                     <span className="relative z-10 text-slate-700">{section.icon}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800">{section.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500">{section.exercises.length} exercises</p>
                    {isExpanded && (
                      <div className="flex items-center space-x-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${sectionCompletedCount === section.exercises.length ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                        <span className="text-xs text-slate-500">
                          {sectionCompletedCount}/{section.exercises.length} completed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {!isExpanded && (
                    <div className="text-right hidden md:block">
                        <span className="text-xs text-slate-400">{sectionCompletedCount}/{section.exercises.length}</span>
                    </div>
                  )}
                  <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={26} className="text-slate-400" />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div id={`section-content-${section.id}`} className={`border-t ${section.borderColor} ${section.bgColor} divide-y ${section.borderColor}`}>
                  {section.exercises.map((exercise, exerciseIndex) => {
                    const exerciseKey = `${section.id}-${exerciseIndex}`;
                    const isCompleted = completedExercises.has(exerciseKey);
                    const currentSetNumber = currentSet[exerciseKey] || 1;
                    
                    return (
                      <div
                        key={exerciseKey}
                        className={`p-4 sm:p-5 transition-all duration-300 ease-in-out ${
                          isCompleted ? 'bg-green-500/10 opacity-70' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3.5">
                          <div className="flex items-start space-x-3.5 sm:space-x-4 flex-1">
                            <button
                              onClick={() => toggleExerciseComplete(section.id, exerciseIndex)}
                              aria-label={isCompleted ? `Mark ${exercise.name} as incomplete` : `Mark ${exercise.name} as complete`}
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white mt-0.5 sm:mt-1 ${
                                isCompleted
                                  ? 'bg-gradient-to-br from-sky-400 to-blue-400 border-sky-300/50 text-white focus:ring-blue-300'
                                  : `border-slate-400 hover:border-sky-400 text-transparent focus:ring-sky-300 bg-slate-100 hover:bg-slate-200`
                              }`}
                            >
                              {isCompleted && <Check size={20} />}
                            </button>
                            <div className="flex-1">
                               <div className="flex items-center justify-between">
                                <h4 className={`text-base sm:text-lg font-medium ${isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {exercise.name}
                                </h4>
                                {!isCompleted && ai && ( // Only show if not completed and AI is available
                                  <button
                                    onClick={() => fetchExerciseTip(exercise.name)}
                                    aria-label={`Get tips for ${exercise.name}`}
                                    className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-100 rounded-full transition-colors duration-200 ml-2 flex-shrink-0"
                                    title="Get exercise tips"
                                  >
                                    <Info size={18} />
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-2">
                                <span className="text-xs sm:text-sm text-slate-500">
                                  {exercise.sets} sets &times; {exercise.reps} reps
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-sky-600">
                                  {exercise.weight}
                                </span>
                                <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getDifficultyColor(exercise.difficulty)}`}>
                                  {exercise.difficulty}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Exercise Tip Display Area */}
                        {exerciseForTip === exercise.name && (
                          <div className="mt-3.5 pl-11 sm:pl-[52px] pr-2 sm:pr-4 pb-2">
                            <div className="bg-slate-100 p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                              {isLoadingTip && (
                                <div className="flex items-center text-slate-600">
                                  <Loader2 size={20} className="animate-spin mr-2.5 text-sky-600" />
                                  Fetching tips for {exercise.name}...
                                </div>
                              )}
                              {tipError && !isLoadingTip && (
                                <div className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                                  <div className="flex items-start">
                                    <XCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm">{tipError}</p>
                                  </div>
                                  <button
                                      onClick={() => fetchExerciseTip(exercise.name)}
                                      className="mt-2.5 text-xs text-sky-700 hover:text-sky-800 font-medium bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md border border-sky-200"
                                    >
                                      Try again
                                  </button>
                                  <button
                                    onClick={() => { setCurrentTip(null); setExerciseForTip(null); setTipError(null);}}
                                    className="mt-2.5 ml-2 text-xs text-slate-500 hover:text-slate-700 font-medium bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md border border-slate-200"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}
                              {currentTip && !isLoadingTip && !tipError && (
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-sm font-semibold text-sky-700">
                                      {exercise.name} - Info
                                    </h5>
                                    <button
                                      onClick={() => { setCurrentTip(null); setExerciseForTip(null); }}
                                      className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200"
                                      aria-label="Close tips"
                                      title="Close tips"
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                  <div
                                    className="prose prose-sm prose-slate max-w-none text-slate-600"
                                    dangerouslySetInnerHTML={{ __html: markdownToHtml(currentTip) }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {!isCompleted && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 mt-4 pl-11 sm:pl-[52px]">
                            <div className="flex items-center space-x-2.5">
                              <button
                                onClick={() => updateCurrentSet(exerciseKey, Math.max(1, currentSetNumber - 1))}
                                aria-label={`Decrease set for ${exercise.name}`}
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300"
                                disabled={currentSetNumber <= 1}
                              >
                                &ndash;
                              </button>
                              <div className="bg-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-300 min-w-[5rem] text-center">
                                <span className="text-base sm:text-lg font-semibold text-slate-700">{currentSetNumber}</span>
                                <span className="text-xs sm:text-sm text-slate-500">/{exercise.sets}</span>
                              </div>
                              <button
                                onClick={() => updateCurrentSet(exerciseKey, Math.min(exercise.sets, currentSetNumber + 1))}
                                aria-label={`Increase set for ${exercise.name}`}
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300"
                                disabled={currentSetNumber >= exercise.sets}
                              >
                                +
                              </button>
                            </div>
                            
                            <div className="flex items-center space-x-2.5 justify-start sm:justify-end">
                              {[60, 90].map(time => (
                                <button
                                  key={time}
                                  onClick={() => startRest(time)}
                                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-sky-100/70 text-sky-700 rounded-xl hover:bg-sky-200/70 transition-colors duration-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-sky-300 border border-sky-300"
                                >
                                  Rest {time === 60 ? '1m' : '1.5m'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isWorkoutComplete && !showCelebration && (
        <div className="fixed bottom-8 right-6 sm:right-8 z-[90]">
           <div className="bg-gradient-to-r from-green-300 via-emerald-300 to-teal-300 rounded-full p-1 shadow-lg shadow-green-500/20 transform transition-all hover:scale-105 animate-pulse">
            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white/80 backdrop-blur-sm rounded-full flex flex-col items-center justify-center text-center border border-green-300/50">
              <Trophy size={32} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700 mt-1">Done!</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutApp;
