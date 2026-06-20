import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  Flame, Dumbbell, Apple, Activity, BarChart3, Plus, Check, X,
  ChevronLeft, ChevronRight, Settings, Timer, Trophy, Trash2,
  TrendingUp, Play, Search, Pencil, ArrowLeft, Clock,
  Scale, Barcode, Camera, Loader, Calendar, Star, BookMarked, ChevronDown, Layers, Bookmark, Volume2, VolumeX, Copy, RotateCw, RotateCcw,
} from "lucide-react";

/* ============================================================
   FitRings — workouts (JeFit-style) + nutrition (MyFitnessPal-style)
   in an Apple Fitness shell. Data persists via window.storage.
   ============================================================ */

const C = {
  bg: "#000000",
  card: "#1C1C1E",
  card2: "#2C2C2E",
  card3: "#3A3A3C",
  line: "#38383A",
  text: "#FFFFFF",
  sub: "#98989F",
  faint: "#636366",
  energy0: "#F31260", energy1: "#FF375F",   // pink-red (calories)
  protein0: "#6FE000", protein1: "#B6FF3B", // lime-green (protein)
  train0: "#00C7D4", train1: "#00F0C8",     // cyan-teal (training)
  carb: "#FF9F0A",                           // orange
  fat: "#FFD60A",                            // yellow
};

const RING = {
  energy: { a: C.energy0, b: C.energy1 },
  protein: { a: C.protein0, b: C.protein1 },
  train: { a: C.train0, b: C.train1 },
};

/* ---------- storage helpers ---------- */
const store = {
  async get(key, def) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : def; }
    catch { return def; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val)); } catch (e) { console.error("save", key, e); }
  },
};
// data keys (stored as fitly:{name})
const K = {
  settings: "settings", workouts: "workouts", routines: "routines", food: "food",
  body: "body", customFoods: "customfoods", meals: "meals", programs: "programs", activeProgram: "activeprogram",
  customExercises: "customexercises",
};
const NK = (name) => "fitly:" + name;
// legacy keys for one-time migration into the single fitly namespace
const OLD = {
  settings: "fittrack:settings", workouts: "fittrack:workouts", routines: "fittrack:routines", food: "fittrack:food",
  body: "fittrack:body", customFoods: "fittrack:customfoods", meals: "fittrack:meals", programs: "fittrack:programs", activeProgram: "fittrack:activeprogram",
  customExercises: "fittrack:customexercises",
};

/* ---------- date utils ---------- */
const iso = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const today = () => iso(new Date());
const addDays = (isoStr, n) => { const d = new Date(isoStr + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const fmtDay = (isoStr) => {
  const d = new Date(isoStr + "T00:00:00");
  const t = today();
  if (isoStr === t) return "Today";
  if (isoStr === addDays(t, -1)) return "Yesterday";
  if (isoStr === addDays(t, 1)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
const shortDate = (isoStr) =>
  new Date(isoStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
const mondayOf = (isoStr) => { const d = new Date(isoStr + "T00:00:00"); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return iso(d); };
const monthFirst = (isoStr) => isoStr.slice(0, 7) + "-01";
const addMonths = (isoStr, n) => { const d = new Date(isoStr + "T00:00:00"); d.setMonth(d.getMonth() + n); return iso(d); };
const lastOfMonth = (isoStr) => { const d = new Date(isoStr + "T00:00:00"); return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

/* ---------- defaults / seed data ---------- */
const DEFAULT_SETTINGS = {
  units: "lb",
  goalCalories: 2400, goalProtein: 180, goalCarbs: 250, goalFat: 70,
  goalSets: 18, goalWeight: 175, goalBodyfat: 12, name: "Athlete",
  goalTrainMin: 45, goalBurn: 500, goalVolume: 12000, goalDistance: 3, goalWorkouts: 1,
  todayMetrics: ["energy", "protein", "sets"],
  keepAwake: true,
};

const EXERCISES = [
  // Chest
  ["Bench Press", "Chest"], ["Incline Bench Press", "Chest"], ["Decline Bench Press", "Chest"],
  ["Close-Grip Bench Press", "Chest"], ["Dumbbell Chest Press", "Chest"], ["Incline Dumbbell Press", "Chest"],
  ["Dumbbell Decline Chest Press", "Chest"], ["Dumbbell Floor Press", "Chest"], ["Floor Press", "Chest"],
  ["Dumbbell Chest Fly", "Chest"], ["Machine Chest Fly", "Chest"], ["Pec Deck", "Chest"],
  ["Cable Chest Press", "Chest"], ["Standing Cable Chest Fly", "Chest"], ["Seated Cable Chest Fly", "Chest"],
  ["Machine Chest Press", "Chest"], ["Smith Machine Bench Press", "Chest"], ["Smith Machine Incline Bench Press", "Chest"],
  ["Bar Dip", "Chest"], ["Assisted Dip", "Chest"], ["Ring Dip", "Chest"], ["Push-Up", "Chest"],
  ["Incline Push-Up", "Chest"], ["Decline Push-Up", "Chest"], ["Dumbbell Pullover", "Chest"], ["Board Press", "Chest"],
  // Shoulders
  ["Overhead Press", "Shoulders"], ["Seated Barbell Overhead Press", "Shoulders"], ["Dumbbell Shoulder Press", "Shoulders"],
  ["Seated Dumbbell Shoulder Press", "Shoulders"], ["Machine Shoulder Press", "Shoulders"], ["Arnold Press", "Shoulders"],
  ["Push Press", "Shoulders"], ["Behind the Neck Press", "Shoulders"], ["Z Press", "Shoulders"], ["Landmine Press", "Shoulders"],
  ["Dumbbell Lateral Raise", "Shoulders"], ["Cable Lateral Raise", "Shoulders"], ["Machine Lateral Raise", "Shoulders"],
  ["Dumbbell Front Raise", "Shoulders"], ["Cable Front Raise", "Shoulders"], ["Plate Front Raise", "Shoulders"],
  ["Face Pull", "Shoulders"], ["Band Pull-Apart", "Shoulders"], ["Reverse Dumbbell Fly", "Shoulders"],
  ["Reverse Cable Fly", "Shoulders"], ["Reverse Machine Fly", "Shoulders"], ["Barbell Upright Row", "Shoulders"],
  ["Barbell Rear Delt Row", "Shoulders"], ["Dumbbell Rear Delt Row", "Shoulders"], ["Cuban Press", "Shoulders"],
  // Biceps
  ["Barbell Curl", "Biceps"], ["EZ Curl", "Biceps"], ["Dumbbell Curl", "Biceps"], ["Hammer Curl", "Biceps"],
  ["Incline Dumbbell Curl", "Biceps"], ["Concentration Curl", "Biceps"], ["Barbell Preacher Curl", "Biceps"],
  ["Dumbbell Preacher Curl", "Biceps"], ["Cable Curl With Bar", "Biceps"], ["Cable Curl With Rope", "Biceps"],
  ["Machine Bicep Curl", "Biceps"], ["Spider Curl", "Biceps"], ["Drag Curl", "Biceps"], ["Zottman Curl", "Biceps"],
  ["Reverse Barbell Curl", "Biceps"], ["Bayesian Curl", "Biceps"],
  // Triceps
  ["Tricep Pushdown With Bar", "Triceps"], ["Tricep Pushdown With Rope", "Triceps"], ["Skull Crusher", "Triceps"],
  ["Barbell Lying Triceps Extension", "Triceps"], ["Dumbbell Lying Triceps Extension", "Triceps"],
  ["Barbell Standing Triceps Extension", "Triceps"], ["Dumbbell Standing Triceps Extension", "Triceps"],
  ["Overhead Cable Triceps Extension", "Triceps"], ["Crossbody Cable Triceps Extension", "Triceps"],
  ["Machine Overhead Triceps Extension", "Triceps"], ["Bench Dip", "Triceps"], ["Close-Grip Push-Up", "Triceps"],
  ["Tate Press", "Triceps"],
  // Back
  ["Deadlift", "Back"], ["Sumo Deadlift", "Back"], ["Deficit Deadlift", "Back"], ["Rack Pull", "Back"],
  ["Snatch Grip Deadlift", "Back"], ["Stiff-Legged Deadlift", "Back"], ["Barbell Row", "Back"], ["Pendlay Row", "Back"],
  ["Dumbbell Row", "Back"], ["Chest-Supported Dumbbell Row", "Back"], ["T-Bar Row", "Back"], ["Seal Row", "Back"],
  ["Seated Machine Row", "Back"], ["Cable Close Grip Seated Row", "Back"], ["Cable Wide Grip Seated Row", "Back"],
  ["One-Handed Cable Row", "Back"], ["Inverted Row", "Back"], ["Pull-Up", "Back"], ["Chin-Up", "Back"],
  ["Close-Grip Chin-Up", "Back"], ["Assisted Pull-Up", "Back"], ["Neutral Grip Pull-Up", "Back"],
  ["Lat Pulldown", "Back"], ["Close-Grip Lat Pulldown", "Back"], ["Straight Arm Lat Pulldown", "Back"],
  ["Machine Lat Pulldown", "Back"], ["Barbell Shrug", "Back"], ["Dumbbell Shrug", "Back"], ["Back Extension", "Back"],
  ["Good Morning", "Back"], ["Kettlebell Swing", "Back"], ["Power Clean", "Back"], ["Hang Clean", "Back"], ["Clean and Jerk", "Back"],
  // Legs (quads / hamstrings / general)
  ["Squat", "Legs"], ["Front Squat", "Legs"], ["Goblet Squat", "Legs"], ["Box Squat", "Legs"], ["Pause Squat", "Legs"],
  ["Zercher Squat", "Legs"], ["Safety Bar Squat", "Legs"], ["Hack Squat Machine", "Legs"], ["Barbell Hack Squat", "Legs"],
  ["Smith Machine Squat", "Legs"], ["Bulgarian Split Squat", "Legs"], ["Pistol Squat", "Legs"], ["Sumo Squat", "Legs"],
  ["Belt Squat", "Legs"], ["Pendulum Squat", "Legs"], ["Leg Press", "Legs"], ["Vertical Leg Press", "Legs"],
  ["Leg Extension", "Legs"], ["Lying Leg Curl", "Legs"], ["Seated Leg Curl", "Legs"], ["Standing Leg Curl", "Legs"],
  ["Romanian Deadlift", "Legs"], ["Dumbbell Romanian Deadlift", "Legs"], ["Nordic Hamstring Eccentric", "Legs"],
  ["Glute Ham Raise", "Legs"], ["Barbell Lunge", "Legs"], ["Dumbbell Lunge", "Legs"], ["Walking Lunge", "Legs"],
  ["Reverse Lunge", "Legs"], ["Curtsy Lunge", "Legs"], ["Step Up", "Legs"], ["Jump Squat", "Legs"], ["Box Jump", "Legs"],
  // Glutes
  ["Hip Thrust", "Glutes"], ["Hip Thrust Machine", "Glutes"], ["Smith Machine Hip Thrust", "Glutes"],
  ["One-Legged Hip Thrust", "Glutes"], ["Glute Bridge", "Glutes"], ["One-Legged Glute Bridge", "Glutes"],
  ["Cable Pull Through", "Glutes"], ["Cable Glute Kickback", "Glutes"], ["Machine Glute Kickback", "Glutes"],
  ["Hip Abduction Machine", "Glutes"], ["Hip Abduction Against Band", "Glutes"], ["Cable Hip Abduction", "Glutes"],
  ["Clamshells", "Glutes"], ["Donkey Kicks", "Glutes"], ["Fire Hydrants", "Glutes"], ["Frog Pumps", "Glutes"],
  ["Lateral Walk With Band", "Glutes"], ["Reverse Hyperextension", "Glutes"], ["Single Leg Romanian Deadlift", "Glutes"],
  ["Cossack Squat", "Glutes"],
  // Abs
  ["Crunch", "Abs"], ["Bicycle Crunch", "Abs"], ["Cable Crunch", "Abs"], ["Machine Crunch", "Abs"],
  ["Hollow Body Crunch", "Abs"], ["Oblique Crunch", "Abs"], ["Sit-Up", "Abs"], ["Hanging Sit-Up", "Abs"],
  ["Jackknife Sit-Up", "Abs"], ["Hanging Knee Raise", "Abs"], ["Hanging Leg Raise", "Abs"], ["Lying Leg Raise", "Abs"],
  ["Captain's Chair Leg Raise", "Abs"], ["Plank", "Abs"], ["Side Plank", "Abs"], ["Weighted Plank", "Abs"],
  ["Copenhagen Plank", "Abs"], ["Dead Bug", "Abs"], ["Hollow Hold", "Abs"], ["L-Sit", "Abs"], ["Dragon Flag", "Abs"],
  ["Ab Wheel Roll-Out", "Abs"], ["Pallof Press", "Abs"], ["Cable Wood Chop", "Abs"], ["Mountain Climbers", "Abs"],
  ["Russian Twist", "Abs"], ["Hanging Windshield Wiper", "Abs"],
  // Calves
  ["Standing Calf Raise", "Calves"], ["Seated Calf Raise", "Calves"], ["Barbell Standing Calf Raise", "Calves"],
  ["Barbell Seated Calf Raise", "Calves"], ["Calf Raise in Leg Press", "Calves"], ["Donkey Calf Raise", "Calves"],
  ["Heel Raise", "Calves"], ["Eccentric Heel Drop", "Calves"], ["Tibialis Raise", "Calves"],
  // Forearms (flexors / grip / extensors)
  ["Barbell Wrist Curl", "Forearms"], ["Dumbbell Wrist Curl", "Forearms"], ["Barbell Wrist Curl Behind the Back", "Forearms"],
  ["Plate Wrist Curl", "Forearms"], ["Barbell Wrist Extension", "Forearms"], ["Dumbbell Wrist Extension", "Forearms"],
  ["Wrist Roller", "Forearms"], ["Farmers Walk", "Forearms"], ["Bar Hang", "Forearms"], ["Plate Pinch", "Forearms"],
  ["Gripper", "Forearms"], ["Towel Pull-Up", "Forearms"],
  // Neck
  ["Lying Neck Curl", "Neck"], ["Lying Neck Extension", "Neck"], ["Prone Neck Bridge", "Neck"], ["Supine Neck Bridge", "Neck"],
  // Cardio
  ["Rowing Machine", "Cardio"], ["Stationary Bike", "Cardio"], ["Assault Bike", "Cardio"], ["Treadmill Run", "Cardio"],
  ["Treadmill Walk", "Cardio"], ["Incline Walk", "Cardio"], ["Elliptical", "Cardio"], ["Stair Climber", "Cardio"],
  ["Jump Rope", "Cardio"],
].map(([name, muscle]) => ({ name, muscle }));

const MUSCLES = ["Chest", "Shoulders", "Biceps", "Triceps", "Back", "Legs", "Glutes", "Abs", "Calves", "Forearms", "Neck", "Cardio"];
// map each (fine) muscle to an analytics group used by Muscle Focus + 3D body. Cardio has no muscle group.
const MUSCLE_GROUP = {
  Chest: "Chest", Shoulders: "Shoulders", Biceps: "Arms", Triceps: "Arms", Forearms: "Arms",
  Back: "Back", Neck: "Back", Legs: "Legs", Glutes: "Legs", Calves: "Legs", Abs: "Abs", Core: "Abs", Cardio: null,
};
const GROUPS = ["Chest", "Back", "Arms", "Shoulders", "Abs", "Legs"];
const GROUP_REGION = { Chest: "Upper Body", Back: "Upper Body", Arms: "Upper Body", Shoulders: "Upper Body", Abs: "Upper Body", Legs: "Lower Body" };
const GROUP_COLOR = { Chest: "#FF375F", Back: "#00F0C8", Arms: "#FF9F0A", Shoulders: "#FFD60A", Abs: "#B6FF3B", Legs: "#5E5CE6" };

const DEFAULT_ROUTINES = [
  { id: "r-push", name: "Push Day", color: C.energy1, exercises: [
    "Bench Press", "Incline Dumbbell Press", "Overhead Press", "Dumbbell Lateral Raise", "Tricep Pushdown With Bar", "Barbell Lying Triceps Extension",
  ].map((n) => ({ name: n, muscle: EXERCISES.find((e) => e.name === n).muscle, targetSets: 4, targetReps: 8 })) },
  { id: "r-pull", name: "Pull Day", color: C.train1, exercises: [
    "Deadlift", "Pull-Up", "Barbell Row", "Lat Pulldown", "Barbell Curl", "Hammer Curl",
  ].map((n) => ({ name: n, muscle: EXERCISES.find((e) => e.name === n).muscle, targetSets: 4, targetReps: 8 })) },
  { id: "r-legs", name: "Leg Day", color: C.protein1, exercises: [
    "Squat", "Romanian Deadlift", "Leg Press", "Seated Leg Curl", "Standing Calf Raise",
  ].map((n) => ({ name: n, muscle: EXERCISES.find((e) => e.name === n).muscle, targetSets: 4, targetReps: 10 })) },
];

const FOODS = [
  ["Chicken Breast", "100 g", 165, 31, 0, 3.6], ["White Rice", "1 cup", 205, 4, 45, 0.4],
  ["Egg", "1 large", 72, 6, 0.4, 5], ["Banana", "1 medium", 105, 1.3, 27, 0.4],
  ["Greek Yogurt", "1 cup", 150, 20, 9, 4], ["Oatmeal", "1 cup", 154, 6, 27, 3],
  ["Almonds", "1 oz", 164, 6, 6, 14], ["Salmon", "100 g", 208, 20, 0, 13],
  ["Broccoli", "1 cup", 55, 3.7, 11, 0.6], ["Whey Protein", "1 scoop", 120, 24, 3, 1.5],
  ["Peanut Butter", "2 tbsp", 188, 8, 6, 16], ["Avocado", "1/2", 120, 1.5, 6, 11],
  ["Sweet Potato", "1 medium", 103, 2, 24, 0.2], ["Ground Beef 90/10", "100 g", 176, 20, 0, 10],
  ["Whole Wheat Bread", "1 slice", 80, 4, 14, 1], ["Apple", "1 medium", 95, 0.5, 25, 0.3],
  ["2% Milk", "1 cup", 122, 8, 12, 5], ["Cheddar Cheese", "1 oz", 113, 7, 0.4, 9],
  ["Pasta", "1 cup", 220, 8, 43, 1.3], ["Olive Oil", "1 tbsp", 119, 0, 0, 14],
  ["Black Beans", "1 cup", 227, 15, 41, 0.9], ["Protein Bar", "1 bar", 200, 20, 22, 7],
  ["Tuna", "1 can", 142, 32, 0, 1], ["Cottage Cheese", "1 cup", 206, 28, 8, 9],
  ["Orange", "1 medium", 62, 1.2, 15, 0.2],
].map(([name, serving, cal, p, c, f]) => ({ name, serving, cal, p, c, f }));

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const WDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WDAY_LONG = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
const todayWday = () => WDAYS[(new Date().getDay() + 6) % 7];
const emptySchedule = () => WDAYS.reduce((o, d) => ((o[d] = null), o), {});
const mealTotals = (items) => items.reduce((t, it) => ({
  cal: t.cal + it.cal * it.qty, p: t.p + it.p * it.qty, c: t.c + it.c * it.qty, f: t.f + it.f * it.qty,
}), { cal: 0, p: 0, c: 0, f: 0 });
function sessionFromRoutine(rt) {
  return {
    id: "w-" + Date.now(), name: rt.name, startTime: Date.now(),
    exercises: rt.exercises.map((e) => ({
      id: "e-" + Math.random().toString(36).slice(2), name: e.name, muscle: e.muscle,
      sets: Array.from({ length: e.targetSets || 3 }, () => ({ weight: "", reps: "", done: false })),
    })),
  };
}

/* ---------- small math helpers ---------- */
const round = (n, d = 0) => { const m = 10 ** d; return Math.round((n + Number.EPSILON) * m) / m; };
const epley1RM = (w, r) => (r > 0 ? w * (1 + r / 30) : w);
const loggedSets = (sets) => (sets || []).filter((s) => Number(s.reps) > 0 && s.weight !== "");
const clock = (sec) => { sec = Math.max(0, Math.round(sec || 0)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
const sessionVolume = (w) =>
  w.exercises.reduce((t, ex) => t + loggedSets(ex.sets).reduce((s, st) => s + Number(st.weight) * Number(st.reps), 0), 0);
const sessionSets = (w) => w.exercises.reduce((t, ex) => t + loggedSets(ex.sets).length, 0);

// ---- estimated calories burned (MET method: kcal = MET × kg × hours) ----
const STRENGTH_MET = 5.0; // general resistance training
const DEFAULT_CARDIO_MET = 7.0;
const CARDIO_MET = {
  "Rowing Machine": 7, "Stationary Bike": 7, "Assault Bike": 8, "Treadmill Run": 9.8,
  "Treadmill Walk": 3.8, "Incline Walk": 5.5, "Elliptical": 5, "Stair Climber": 9, "Jump Rope": 12,
};
// convert a logged bodyweight (in the user's units) to kilograms
const toKg = (weight, units) => (weight == null ? null : units === "kg" ? weight : weight / 2.2046);
// latest bodyweight in kg, or null if none logged
const bodyKgOf = (body, units) => (body && body.length ? toKg(body[body.length - 1].weight, units) : null);
// average speed (mph) from a cardio entry, or null
function cardioSpeedMph(c) {
  if (!c) return null;
  const dist = Number(c.dist) || 0;
  const mins = (Number(c.min) || 0) + (Number(c.sec) || 0) / 60;
  if (dist <= 0 || mins <= 0) return null;
  const mi = c.unit === "km" ? dist / 1.609344 : dist;
  return mi / (mins / 60);
}
// MET for a cardio exercise, refined by speed + incline when available
function cardioMET(ex) {
  const c = ex.cardio;
  const v = cardioSpeedMph(c);
  const incl = c ? Number(c.incline || 0) : 0;
  if (/walk/i.test(ex.name)) return (v ? Math.max(2.5, 2.0 + v * 0.9) : 3.8) + incl * 0.3;
  if (/run|jog/i.test(ex.name)) return (v ? Math.max(6, 1.65 * v) : 9.8) + incl * 0.4;
  return CARDIO_MET[ex.name] || DEFAULT_CARDIO_MET;
}
// total cardio distance for a workout, in miles
const cardioDistanceMi = (w) => (w.exercises || []).reduce((t, ex) => {
  if (ex.muscle !== "Cardio" || !ex.cardio) return t;
  const d = Number(ex.cardio.dist) || 0;
  if (!d) return t;
  return t + (ex.cardio.unit === "km" ? d / 1.609344 : d);
}, 0);
// estimate kcal for one workout. totalSec optional (live); else uses w.duration (minutes).
function workoutCalories(w, kg, totalSecOverride) {
  let cardioSec = 0, cardioKcal = 0;
  (w.exercises || []).forEach((ex) => {
    if (ex.muscle !== "Cardio") return;
    const manualCal = ex.cardio ? Number(ex.cardio.cal) : 0;
    const manual = ex.cardio ? (Number(ex.cardio.min || 0) * 60 + Number(ex.cardio.sec || 0)) : 0;
    const sec = manual || ex.seconds || ex.liveSeconds || 0;
    if (manualCal > 0) { cardioKcal += manualCal; cardioSec += sec; }
    else if (sec > 0 && kg) { cardioKcal += cardioMET(ex) * kg * (sec / 3600); cardioSec += sec; }
  });
  if (!kg) return Math.round(cardioKcal); // without bodyweight, only manually-entered cardio calories count
  const totalSec = totalSecOverride != null ? totalSecOverride : (w.duration || 0) * 60;
  let strengthSec = Math.max(0, totalSec - cardioSec);
  if (totalSec <= 0 && cardioSec === 0) strengthSec = sessionSets(w) * 48; // no timing at all
  return Math.round(cardioKcal + STRENGTH_MET * kg * (strengthSec / 3600));
}


/* ============================================================
   Progress meters — modern vertical gradient towers
   ============================================================ */
function ProgressTowers({ items, height = 156 }) {
  return (
    <div className="flex items-end justify-between gap-3">
      {items.map((it) => {
        const ratio = it.goal > 0 ? it.value / it.goal : 0;
        const pct = Math.max(0, Math.min(ratio, 1));
        const over = ratio >= 1;
        return (
          <div key={it.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="font-bold" style={{ fontSize: 22, lineHeight: 1, color: it.c1 }}>{it.vdisp ?? it.value}</span>
            <span className="text-xs font-semibold" style={{ color: C.faint }}>/ {it.gdisp ?? it.goal} {it.unit}</span>
            <div className="relative w-full overflow-hidden rounded-2xl" style={{ height, background: C.card2 }}>
              <div className="absolute inset-x-0" style={{ top: "25%", height: 1, background: "rgba(255,255,255,0.06)" }} />
              <div className="absolute inset-x-0" style={{ top: "50%", height: 1, background: "rgba(255,255,255,0.06)" }} />
              <div className="absolute inset-x-0" style={{ top: "75%", height: 1, background: "rgba(255,255,255,0.06)" }} />
              <div className="absolute bottom-0 left-0 right-0" style={{ height: `${pct * 100}%`, background: `linear-gradient(180deg, ${it.c1}, ${it.c0})`, borderRadius: 16, boxShadow: over ? `0 0 18px ${it.c1}` : "none", transition: "height .8s cubic-bezier(.4,0,.2,1)" }} />
              <span className="absolute left-0 right-0 text-center font-bold" style={{ bottom: 6, fontSize: 11, color: over ? "#06210A" : C.sub }}>{Math.round(ratio * 100)}%</span>
            </div>
            <div className="flex items-center gap-1">{it.icon}<span className="text-xs font-semibold" style={{ color: C.sub }}>{it.label}</span></div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Today hero — customizable metrics
   ============================================================ */
const TODAY_METRICS = [
  { id: "energy", label: "Energy", goalKey: "goalCalories", unit: "cal", c0: C.energy0, c1: C.energy1, icon: <Flame size={13} color={C.energy1} /> },
  { id: "protein", label: "Protein", goalKey: "goalProtein", unit: "g", c0: C.protein0, c1: C.protein1, icon: <Apple size={13} color={C.protein1} /> },
  { id: "carbs", label: "Carbs", goalKey: "goalCarbs", unit: "g", c0: "#C77400", c1: C.carb, icon: <Activity size={13} color={C.carb} /> },
  { id: "fat", label: "Fat", goalKey: "goalFat", unit: "g", c0: "#C7A800", c1: C.fat, icon: <Activity size={13} color={C.fat} /> },
  { id: "sets", label: "Training", goalKey: "goalSets", unit: "sets", c0: C.train0, c1: C.train1, icon: <Dumbbell size={13} color={C.train1} /> },
  { id: "volume", label: "Volume", goalKey: "goalVolume", unit: "vol", c0: C.train0, c1: C.train1, icon: <BarChart3 size={13} color={C.train1} /> },
  { id: "burned", label: "Burned", goalKey: "goalBurn", unit: "cal", c0: C.energy0, c1: C.energy1, icon: <Flame size={13} color={C.energy1} /> },
  { id: "time", label: "Time", goalKey: "goalTrainMin", unit: "min", c0: C.train0, c1: C.train1, icon: <Clock size={13} color={C.train1} /> },
  { id: "distance", label: "Distance", goalKey: "goalDistance", unit: "mi", c0: C.train0, c1: C.train1, icon: <TrendingUp size={13} color={C.train1} /> },
  { id: "workouts", label: "Workouts", goalKey: "goalWorkouts", unit: "", c0: C.train0, c1: C.train1, icon: <Trophy size={13} color={C.train1} /> },
];
const metricDef = (id) => TODAY_METRICS.find((m) => m.id === id);
function buildTodayItems(ids, ctx, settings, u) {
  return (ids || []).map((id) => {
    const d = metricDef(id);
    if (!d) return null;
    const value = ctx[id] || 0;
    const goal = Number(settings[d.goalKey]) || 0;
    const unit = id === "volume" ? u : d.unit;
    let vdisp, gdisp;
    if (id === "distance") { vdisp = value.toFixed(1); gdisp = goal; }
    else if (id === "volume") { vdisp = Math.round(value).toLocaleString(); gdisp = goal.toLocaleString(); }
    else { vdisp = Math.round(value).toLocaleString(); gdisp = goal; }
    return { id, label: d.label, value, goal, unit, c0: d.c0, c1: d.c1, icon: d.icon, vdisp, gdisp };
  }).filter(Boolean);
}

function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="lg-e" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={C.energy0} /><stop offset="100%" stopColor={C.energy1} /></linearGradient>
        <linearGradient id="lg-p" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={C.protein0} /><stop offset="100%" stopColor={C.protein1} /></linearGradient>
        <linearGradient id="lg-t" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={C.train0} /><stop offset="100%" stopColor={C.train1} /></linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="26" fill="#141416" />
      <rect x="28" y="24" width="13" height="52" rx="6.5" fill="url(#lg-t)" />
      <rect x="45" y="24" width="27" height="13" rx="6.5" fill="url(#lg-e)" />
      <rect x="45" y="43" width="20" height="13" rx="6.5" fill="url(#lg-p)" />
    </svg>
  );
}

function Logo({ markSize = 32, fontSize = 26, mono = false }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={markSize} />
      <span style={{ fontWeight: 800, fontSize, letterSpacing: "-1.5px", lineHeight: 1 }}>
        <span style={{ color: mono ? C.text : C.text }}>FIT</span>
        <span style={{ color: mono ? C.text : C.train1 }}>LY</span>
      </span>
    </div>
  );
}

/* ============================================================
   Reusable bits
   ============================================================ */
const Card = ({ children, style, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={`rounded-3xl ${className}`}
    style={{ background: C.card, ...style }}
  >{children}</div>
);

// Swipe a row left to reveal Delete, right to reveal Duplicate (tap the action to confirm). Touch gesture.
function SwipeRow({ children, onDelete, onDuplicate, radius = 24, surface = C.card, className = "", contentClassName = "", ring = null }) {
  const OPEN = 84;
  const [tx, setTx] = useState(0);
  const start = useRef(0), startTx = useRef(0), dragging = useRef(false), moved = useRef(false);
  const hasL = !!onDuplicate, hasR = !!onDelete;
  const begin = (x) => { dragging.current = true; moved.current = false; start.current = x; startTx.current = tx; };
  const moveTo = (x) => {
    if (!dragging.current) return;
    if (Math.abs(x - start.current) > 6) moved.current = true;
    let d = startTx.current + (x - start.current);
    d = Math.max(hasR ? -OPEN : 0, Math.min(hasL ? OPEN : 0, d));
    setTx(d);
  };
  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setTx((cur) => (cur <= -OPEN / 2 ? -OPEN : cur >= OPEN / 2 ? OPEN : 0));
  };
  const close = () => setTx(0);
  const act = (fn) => { close(); fn && fn(); };
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: radius, boxShadow: ring ? `0 0 0 1.5px ${ring}` : undefined }}>
      {hasL && (
        <button onClick={() => act(onDuplicate)} aria-label="Duplicate"
          className="absolute inset-y-0 left-0 flex items-center justify-center" style={{ width: OPEN, background: C.train1 }}>
          <Copy size={18} color="#001012" />
        </button>
      )}
      {hasR && (
        <button onClick={() => act(onDelete)} aria-label="Delete"
          className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: OPEN, background: C.energy1 }}>
          <Trash2 size={18} color="#fff" />
        </button>
      )}
      <div
        className={contentClassName}
        onTouchStart={(e) => begin(e.touches[0].clientX)}
        onTouchMove={(e) => moveTo(e.touches[0].clientX)}
        onTouchEnd={end}
        onClickCapture={(e) => { if (moved.current || tx !== 0) { e.preventDefault(); e.stopPropagation(); if (tx !== 0) close(); moved.current = false; } }}
        style={{ transform: `translateX(${tx}px)`, transition: dragging.current ? "none" : "transform .22s ease", position: "relative", zIndex: 1, background: surface, borderRadius: radius }}
      >
        {children}
      </div>
    </div>
  );
}

const Stat = ({ label, value, unit, color }) => (
  <div className="flex flex-col">
    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>{label}</span>
    <span className="font-bold" style={{ color: color || C.text, fontSize: 22, lineHeight: 1.1 }}>
      {value}<span className="text-sm font-semibold" style={{ color: C.sub }}>{unit ? ` ${unit}` : ""}</span>
    </span>
  </div>
);

function NumField({ value, onChange, placeholder, suffix }) {
  return (
    <div className="flex items-center rounded-xl px-3" style={{ background: C.card2 }}>
      <input
        inputMode="decimal" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="w-full bg-transparent py-2 text-base font-semibold outline-none"
        style={{ color: C.text }}
      />
      {suffix && <span className="text-sm font-semibold pl-1" style={{ color: C.faint }}>{suffix}</span>}
    </div>
  );
}

function Sheet({ title, onClose, children, accent = C.energy1 }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl pb-8"
        style={{ background: C.card, maxHeight: "88%", overflowY: "auto", maxWidth: 448 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3" style={{ background: C.card }}>
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full" style={{ background: C.card3 }} />
          <h3 className="text-lg font-bold mt-1" style={{ color: C.text }}>{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ background: C.card2 }}>
            <X size={18} color={C.sub} />
          </button>
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>
  );
}

function WorkoutDetailSheet({ workout, u, bodyKg, onClose, onSave, onDelete, onOpenExercise }) {
  const [draft, setDraft] = useState(() => structuredClone(workout));
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const mut = (fn) => setDraft((d) => { const n = structuredClone(d); fn(n); return n; });
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setSet = (ei, si, f, v) => mut((d) => { d.exercises[ei].sets[si][f] = v; });
  const addSet = (ei) => mut((d) => { const s = d.exercises[ei].sets; const last = s[s.length - 1]; s.push({ weight: last ? last.weight : "", reps: last ? last.reps : "", done: true }); });
  const delSet = (ei, si) => mut((d) => { d.exercises[ei].sets.splice(si, 1); });
  const delEx = (ei) => mut((d) => { d.exercises.splice(ei, 1); });
  const setCardio = (ei, f, v) => mut((d) => { d.exercises[ei].cardio = { dist: "", unit: "mi", min: "", sec: "", incline: "", ...(d.exercises[ei].cardio || {}), [f]: v }; });

  const dur = Number(draft.duration) || 0;
  const restS = draft.restSeconds || 0;
  const workS = Math.max(0, dur * 60 - restS);
  const density = dur * 60 > 0 && restS > 0 ? Math.round((workS / (dur * 60)) * 100) : null;
  const ratio = restS > 0 ? (workS / restS).toFixed(1) : null;
  const dist = cardioDistanceMi(draft);
  const cal = bodyKg ? workoutCalories(draft, bodyKg) : null;

  const save = () => { onSave({ ...draft, duration: Number(draft.duration) || 0 }); setEditing(false); };

  return (
    <Sheet title={editing ? "Edit workout" : "Workout"} onClose={onClose} accent={C.train1}>
      {/* name + date */}
      {editing ? (
        <div className="flex flex-col gap-2">
          <input value={draft.name} onChange={(e) => setField("name", e.target.value)}
            className="rounded-xl px-3 py-2 text-lg font-bold outline-none" style={{ background: C.card2, color: C.text }} />
          <div className="flex items-center gap-2">
            <input type="date" value={draft.date} max={today()} onChange={(e) => setField("date", e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
            <div className="w-28"><NumField value={String(draft.duration ?? "")} onChange={(v) => setField("duration", v)} suffix="min" /></div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: "-0.5px" }}>{draft.name}</h2>
          <p className="text-sm font-semibold" style={{ color: C.sub }}>{fmtDay(draft.date)}</p>
        </div>
      )}

      {/* stat grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-3"><Stat label="Duration" value={dur} unit="min" color={C.train1} /></Card>
        <Card className="p-3"><Stat label="Volume" value={round(sessionVolume(draft)).toLocaleString()} unit={u} color={C.protein1} /></Card>
        <Card className="p-3"><Stat label="Sets" value={sessionSets(draft)} color={C.protein1} /></Card>
        {dist > 0 && <Card className="p-3"><Stat label="Distance" value={dist.toFixed(2)} unit="mi" color={C.train1} /></Card>}
        {cal != null && <Card className="p-3"><Stat label="Est. cal" value={cal.toLocaleString()} color={C.energy1} /></Card>}
        {restS > 0 && <Card className="p-3"><Stat label="Work time" value={clock(workS)} color={C.protein1} /></Card>}
        {restS > 0 && <Card className="p-3"><Stat label="Rest time" value={clock(restS)} color={C.carb} /></Card>}
        {density != null && <Card className="p-3"><Stat label="Effort" value={`${density}%`} color={C.energy1} /></Card>}
      </div>
      {ratio && <p className="mt-2 text-xs" style={{ color: C.faint }}>Work-to-rest ratio {ratio} : 1 — share of the session spent working vs. resting.</p>}

      {/* exercises */}
      <div className="mt-4 flex flex-col gap-3">
        {draft.exercises.map((ex, ei) => {
          const isCardio = ex.muscle === "Cardio";
          const c = ex.cardio || {};
          const ls = loggedSets(ex.sets);
          const spd = isCardio ? cardioSpeedMph(c) : null;
          const totMin = (Number(c.min) || 0) + (Number(c.sec) || 0) / 60;
          const distEx = Number(c.dist) || 0;
          const paceMin = distEx > 0 && totMin > 0 ? totMin / distEx : null;
          const pace = paceMin ? `${Math.floor(paceMin)}:${String(Math.round((paceMin % 1) * 60)).padStart(2, "0")}` : null;
          return (
            <Card key={ex.id || ei} className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <button onClick={() => !editing && onOpenExercise(ex.name)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-bold">{ex.name}</p>
                  <p className="truncate text-xs" style={{ color: C.sub }}>{ex.muscle}{ex.seconds ? ` · ${clock(ex.seconds)}` : ""}</p>
                </button>
                {editing && <button onClick={() => delEx(ei)} className="p-1"><Trash2 size={15} color={C.faint} /></button>}
              </div>

              {isCardio ? (
                editing ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1"><p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>DISTANCE</p><NumField value={c.dist ?? ""} onChange={(v) => setCardio(ei, "dist", v)} placeholder="0" /></div>
                      <div className="mb-0.5 flex rounded-xl p-1" style={{ background: C.card2 }}>
                        {["mi", "km"].map((un) => (<button key={un} onClick={() => setCardio(ei, "unit", un)} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: (c.unit || "mi") === un ? C.train1 : "transparent", color: (c.unit || "mi") === un ? "#001012" : C.sub }}>{un}</button>))}
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1"><p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>TIME (MIN : SEC)</p><div className="flex items-center gap-1"><NumField value={c.min ?? ""} onChange={(v) => setCardio(ei, "min", v)} placeholder="0" /><span style={{ color: C.faint }}>:</span><NumField value={c.sec ?? ""} onChange={(v) => setCardio(ei, "sec", v)} placeholder="00" /></div></div>
                      <div className="w-20"><p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>INCLINE %</p><NumField value={c.incline ?? ""} onChange={(v) => setCardio(ei, "incline", v)} placeholder="0" /></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold" style={{ color: C.sub }}>
                    {distEx > 0 ? `${distEx} ${c.unit || "mi"}` : "—"}{totMin > 0 ? ` · ${clock(totMin * 60)}` : ""}{pace ? ` · ${pace}/${c.unit || "mi"}` : ""}{Number(c.incline) > 0 ? ` · ${c.incline}% incline` : ""}
                  </p>
                )
              ) : editing ? (
                <div className="flex flex-col gap-1.5">
                  {ex.sets.map((st, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <span className="w-6 text-center text-sm font-bold" style={{ color: C.sub }}>{si + 1}</span>
                      <div className="flex-1"><NumField value={st.weight} onChange={(v) => setSet(ei, si, "weight", v)} placeholder="0" suffix={u} /></div>
                      <div className="flex-1"><NumField value={st.reps} onChange={(v) => setSet(ei, si, "reps", v)} placeholder="0" suffix="reps" /></div>
                      <button onClick={() => delSet(ei, si)} className="w-5"><X size={14} color={C.faint} /></button>
                    </div>
                  ))}
                  <button onClick={() => addSet(ei)} className="mt-1 w-full rounded-xl py-2 text-sm font-semibold" style={{ background: C.card2, color: C.train1 }}>+ Add Set</button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {ls.length === 0 && <p className="text-sm" style={{ color: C.faint }}>No sets logged.</p>}
                  {ls.map((st, si) => (
                    <div key={si} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-center font-bold" style={{ color: C.faint }}>{si + 1}</span>
                      <span className="font-semibold" style={{ color: C.text }}>{st.weight} {u}</span>
                      <span style={{ color: C.faint }}>×</span>
                      <span className="font-semibold" style={{ color: C.text }}>{st.reps} reps</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* actions */}
      <div className="mt-5 flex items-center gap-2">
        {editing ? (
          <>
            <button onClick={() => { setDraft(structuredClone(workout)); setEditing(false); }} className="flex-1 rounded-2xl py-3 font-bold" style={{ background: C.card2, color: C.sub }}>Cancel</button>
            <button onClick={save} className="flex-1 rounded-2xl py-3 font-bold" style={{ background: C.protein1, color: "#06210A" }}>Save changes</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 font-bold" style={{ background: C.train1, color: "#001012" }}><Pencil size={16} /> Edit</button>
            <button onClick={() => { if (confirmDel) onDelete(); else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 2500); } }}
              className="rounded-2xl px-4 py-3 font-bold" style={{ background: C.card2, color: C.energy1 }}>{confirmDel ? "Tap to confirm" : <Trash2 size={16} />}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ============================================================
   APP
   ============================================================ */
function CustomizeTodaySheet({ settings, setSettings, u, onClose }) {
  const initial = settings.todayMetrics && settings.todayMetrics.length ? settings.todayMetrics.slice(0, 3) : ["energy", "protein", "sets"];
  const [sel, setSel] = useState(initial);
  const [goals, setGoals] = useState(() => { const g = {}; TODAY_METRICS.forEach((m) => (g[m.goalKey] = settings[m.goalKey])); return g; });
  const toggle = (id) => setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));
  const move = (id, dir) => setSel((cur) => {
    const i = cur.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= cur.length) return cur;
    const n = [...cur]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const setGoal = (key, v) => setGoals((g) => ({ ...g, [key]: v === "" ? "" : Number(v) }));
  const save = () => {
    const cleaned = {}; Object.keys(goals).forEach((k) => (cleaned[k] = goals[k] === "" ? 0 : goals[k]));
    setSettings((p) => ({ ...p, ...cleaned, todayMetrics: sel.length ? sel : ["energy", "protein", "sets"] }));
    onClose();
  };
  return (
    <Sheet title="Customize progress" onClose={onClose} accent={C.train1}>
      <p className="mb-3 text-sm" style={{ color: C.sub }}>Choose up to 3 metrics for your Today hero and set each goal. {sel.length}/3 selected.</p>
      <div className="flex flex-col gap-2">
        {TODAY_METRICS.map((m) => {
          const on = sel.includes(m.id);
          const idx = sel.indexOf(m.id);
          const unit = m.id === "volume" ? u : m.unit;
          return (
            <div key={m.id} className="rounded-2xl p-3" style={{ background: on ? "rgba(0,240,200,0.10)" : C.card2 }}>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(m.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: C.card }}>{m.icon}</span>
                  <span className="font-bold">{m.label}</span>
                  {on && <span className="rounded-full px-1.5 text-xs font-bold" style={{ background: C.train1, color: "#001012" }}>#{idx + 1}</span>}
                </button>
                {on && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => move(m.id, -1)} disabled={idx === 0} className="p-1" style={{ opacity: idx === 0 ? 0.3 : 1 }}><ChevronLeft size={16} color={C.sub} /></button>
                    <button onClick={() => move(m.id, 1)} disabled={idx === sel.length - 1} className="p-1" style={{ opacity: idx === sel.length - 1 ? 0.3 : 1 }}><ChevronRight size={16} color={C.sub} /></button>
                  </div>
                )}
                <button onClick={() => toggle(m.id)} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: on ? C.train1 : C.card3 }}>
                  {on ? <Check size={15} color="#001012" strokeWidth={3} /> : <Plus size={15} color={C.sub} />}
                </button>
              </div>
              {on && (
                <div className="mt-2 flex items-center gap-2 pl-9">
                  <span className="text-xs font-semibold" style={{ color: C.faint }}>Daily goal</span>
                  <div className="w-32"><NumField value={String(goals[m.goalKey] ?? "")} onChange={(v) => setGoal(m.goalKey, v)} suffix={unit} /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={save} className="mt-4 w-full rounded-2xl py-3.5 font-bold" style={{ background: C.protein1, color: "#06210A" }}>Save</button>
    </Sheet>
  );
}


export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState("today");
  const [date, setDate] = useState(today());

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [workouts, setWorkouts] = useState([]);   // saved sessions
  const [routines, setRoutines] = useState(DEFAULT_ROUTINES);
  const [food, setFood] = useState({});           // { date: { Breakfast:[], ... } }
  const [body, setBody] = useState([]);           // [{date, weight, bodyfat}]
  const [customFoods, setCustomFoods] = useState([]); // saved scanned/custom foods
  const [customExercises, setCustomExercises] = useState([]); // user-added exercises
  const [meals, setMeals] = useState([]);             // reusable food combos
  const [programs, setPrograms] = useState([]);       // weekly routine bundles
  const [activeProgram, setActiveProgram] = useState(null); // program id

  const [active, setActive] = useState(null);     // live workout session
  const [modal, setModal] = useState(null);       // {type, payload}
  const [exDetail, setExDetail] = useState(null); // exercise name for progress view

  /* ---- hydrate (with one-time migration from any older key scheme) ---- */
  useEffect(() => {
    (async () => {
      const migrated = await store.get("fitly:migrated", false);
      if (!migrated) {
        const legacyActive = await store.get("fitly:active", null); // from a previous profile build, if any
        for (const name of Object.keys(K)) {
          const target = NK(K[name]);
          if ((await store.get(target, undefined)) !== undefined) continue;
          let src;
          if (legacyActive) src = await store.get(`fitly:${legacyActive}:${K[name]}`, undefined);
          if (src === undefined) src = await store.get(OLD[name], undefined);
          if (src !== undefined) await store.set(target, src);
        }
        await store.set("fitly:migrated", true);
      }
      const [s, w, r, f, b, cf, ml, pg, ap, cx] = await Promise.all([
        store.get(NK(K.settings), DEFAULT_SETTINGS),
        store.get(NK(K.workouts), []),
        store.get(NK(K.routines), DEFAULT_ROUTINES),
        store.get(NK(K.food), {}),
        store.get(NK(K.body), []),
        store.get(NK(K.customFoods), []),
        store.get(NK(K.meals), []),
        store.get(NK(K.programs), []),
        store.get(NK(K.activeProgram), null),
        store.get(NK(K.customExercises), []),
      ]);
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setWorkouts(w || []); setRoutines(r && r.length ? r : DEFAULT_ROUTINES);
      setFood(f || {}); setBody(b || []); setCustomFoods(cf || []);
      setMeals(ml || []); setPrograms(pg || []); setActiveProgram(ap || null);
      setCustomExercises(cx || []);
      setHydrated(true);
    })();
  }, []);

  /* ---- persist ---- */
  useEffect(() => { if (hydrated) store.set(NK(K.settings), settings); }, [settings, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.workouts), workouts); }, [workouts, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.routines), routines); }, [routines, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.food), food); }, [food, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.body), body); }, [body, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.customFoods), customFoods); }, [customFoods, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.customExercises), customExercises); }, [customExercises, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.meals), meals); }, [meals, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.programs), programs); }, [programs, hydrated]);
  useEffect(() => { if (hydrated) store.set(NK(K.activeProgram), activeProgram); }, [activeProgram, hydrated]);

  const u = settings.units;

  const activeProg = programs.find((p) => p.id === activeProgram) || null;
  const plannedRoutine = activeProg && activeProg.schedule[todayWday()]
    ? routines.find((r) => r.id === activeProg.schedule[todayWday()]) || null
    : null;

  /* ---- derived: nutrition totals for selected date ---- */
  const dayFood = food[date] || {};
  const nutri = useMemo(() => {
    let cal = 0, p = 0, c = 0, f = 0;
    MEALS.forEach((m) => (dayFood[m] || []).forEach((it) => {
      cal += it.cal * it.qty; p += it.p * it.qty; c += it.c * it.qty; f += it.f * it.qty;
    }));
    return { cal: round(cal), p: round(p), c: round(c), f: round(f) };
  }, [dayFood]);

  /* ---- derived: training for selected date ---- */
  const dayWorkouts = workouts.filter((w) => w.date === date);
  const daySetCount = dayWorkouts.reduce((t, w) => t + sessionSets(w), 0)
    + (active ? sessionSets(active) : 0);
  const dayVolume = dayWorkouts.reduce((t, w) => t + sessionVolume(w), 0);

  const ringEnergy = nutri.cal / settings.goalCalories;
  const ringProtein = nutri.p / settings.goalProtein;
  const ringTrain = daySetCount / settings.goalSets;

  /* ---- exercise history index (for PRs / progress / "last time") ---- */
  const exHistory = useMemo(() => {
    const map = {};
    [...workouts].sort((a, b) => a.date.localeCompare(b.date)).forEach((w) => {
      w.exercises.forEach((ex) => {
        const ls = loggedSets(ex.sets);
        if (!ls.length) return;
        if (!map[ex.name]) map[ex.name] = [];
        const top = ls.reduce((m, s) => (Number(s.weight) > Number(m.weight) ? s : m), ls[0]);
        const vol = ls.reduce((s, st) => s + Number(st.weight) * Number(st.reps), 0);
        const best1rm = ls.reduce((m, s) => Math.max(m, epley1RM(Number(s.weight), Number(s.reps))), 0);
        map[ex.name].push({ date: w.date, top, vol, sets: ls, est1rm: best1rm });
      });
    });
    return map;
  }, [workouts]);

  if (!hydrated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5" style={{ background: C.bg }}>
        <div className="animate-pulse"><LogoMark size={96} /></div>
        <span style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-1.5px", color: C.text }}>FIT<span style={{ color: C.train1 }}>LY</span></span>
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="mx-auto flex flex-col" style={{ background: C.bg, color: C.text, maxWidth: 448, minHeight: "100vh", fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, sans-serif' }}>
      <div className="flex-1 overflow-y-auto px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)", paddingBottom: active ? 168 : 96 }}>
        {tab === "today" && (
          <TodayView
            date={date} setDate={setDate} settings={settings} nutri={nutri}
            ringEnergy={ringEnergy} ringProtein={ringProtein} ringTrain={ringTrain}
            daySetCount={daySetCount} dayVolume={dayVolume} dayWorkouts={dayWorkouts}
            body={body} active={active} onOpenSettings={() => setModal({ type: "settings" })}
            onCustomize={() => setModal({ type: "customizeToday" })}
            goTrain={() => setTab("workout")} goFood={() => setTab("food")}
            onLogWeight={() => setModal({ type: "addBody" })}
            plannedRoutine={plannedRoutine} activeProg={activeProg}
            onStartPlanned={() => plannedRoutine && startRoutineById(plannedRoutine.id)}
          />
        )}
        {tab === "workout" && (
          exDetail
            ? <ExerciseProgress name={exDetail} history={exHistory[exDetail] || []} u={u} onBack={() => setExDetail(null)} />
            : <WorkoutView
                active={active} setActive={setActive} routines={routines} workouts={workouts}
                u={u} exHistory={exHistory} bodyKg={bodyKgOf(body, settings.units)} settings={settings}
                programs={programs} activeProgram={activeProgram}
                startRoutineById={startRoutineById}
                onPickExercise={(cb) => setModal({ type: "pickExercise", cb })}
                onNewRoutine={() => setModal({ type: "routineBuilder" })}
                onEditRoutine={(rt) => setModal({ type: "routineBuilder", initial: rt })}
                onDuplicateRoutine={(rt) => setRoutines((p) => {
                  const i = p.findIndex((r) => r.id === rt.id);
                  const copy = { ...rt, id: "r-" + Date.now(), name: `${rt.name} copy`, exercises: rt.exercises.map((e) => ({ ...e })) };
                  const next = [...p]; next.splice(i + 1, 0, copy); return next;
                })}
                onDeleteRoutine={(id) => setRoutines((p) => p.filter((r) => r.id !== id))}
                onNewProgram={() => setModal({ type: "programBuilder" })}
                onEditProgram={(p) => setModal({ type: "programBuilder", initial: p })}
                onDeleteProgram={deleteProgram}
                onSetActiveProgram={(id) => setActiveProgram((cur) => (cur === id ? null : id))}
                onSaveWorkout={saveActive} onOpenExercise={(n) => setExDetail(n)}
                onOpenWorkout={(id) => setModal({ type: "workoutDetail", id })}
                onDeleteWorkout={(id) => setWorkouts((p) => p.filter((w) => w.id !== id))}
              />
        )}
        {tab === "food" && (
          <FoodView
            date={date} setDate={setDate} dayFood={dayFood} nutri={nutri} settings={settings}
            onAdd={(meal) => setModal({ type: "addFood", meal })}
            onRemove={removeFood}
            onDuplicate={(meal, item) => addFood(meal, { ...item })}
            onOpenLibrary={() => setModal({ type: "library" })}
            onSaveAsMeal={(name, items) => setModal({ type: "mealBuilder", initial: { name, items: items.map((it) => ({ ...it })) } })}
          />
        )}
        {tab === "body" && (
          <BodyView body={body} settings={settings} u={u}
            onAdd={() => setModal({ type: "addBody" })}
            onRemove={(d) => setBody((p) => p.filter((x) => x.date !== d))}
          />
        )}
        {tab === "stats" && (
          <StatsView workouts={workouts} body={body} food={food} settings={settings} exHistory={exHistory} u={u}
            onOpenExercise={(n) => { setExDetail(n); setTab("workout"); }} />
        )}
      </div>

      {/* live workout dock */}
      {active && tab !== "workout" && (
        <button
          onClick={() => setTab("workout")}
          className="fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-2.5 shadow-lg"
          style={{ background: C.train1, color: "#001012", maxWidth: 420, width: "92%" }}
        >
          <Activity size={18} /><span className="font-bold flex-1 text-left">Workout in progress</span>
          <span className="font-semibold text-sm">{sessionSets(active)} sets · resume</span>
        </button>
      )}

      <TabBar tab={tab} setTab={(t) => { setTab(t); if (t !== "workout") setExDetail(null); }} />

      {/* ---------------- MODALS ---------------- */}
      {modal?.type === "settings" && (
        <SettingsSheet settings={settings} setSettings={setSettings} onClose={() => setModal(null)} />
      )}
      {modal?.type === "customizeToday" && (
        <CustomizeTodaySheet settings={settings} setSettings={setSettings} u={u} onClose={() => setModal(null)} />
      )}
      {modal?.type === "addFood" && (
        <AddFoodSheet meal={modal.meal} customFoods={customFoods} meals={meals}
          onClose={() => setModal(null)}
          onAdd={(item) => { addFood(modal.meal, item); cacheFood(item); setModal(null); }}
          onAddMeal={(items) => { items.forEach((it) => addFood(modal.meal, it)); setModal(null); }}
          onNewMeal={() => setModal({ type: "mealBuilder", back: { type: "addFood", meal: modal.meal } })}
          onRemoveCached={removeCachedFood} />
      )}
      {modal?.type === "library" && (
        <LibrarySheet customFoods={customFoods} meals={meals} onClose={() => setModal(null)}
          onEditFood={(f) => setModal({ type: "foodEditor", food: f, back: { type: "library" } })}
          onDeleteFood={removeCachedFood}
          onNewMeal={() => setModal({ type: "mealBuilder", back: { type: "library" } })}
          onEditMeal={(m) => setModal({ type: "mealBuilder", initial: m, back: { type: "library" } })}
          onDeleteMeal={deleteMeal} />
      )}
      {modal?.type === "mealBuilder" && (
        <MealBuilderSheet initial={modal.initial} customFoods={customFoods}
          onClose={() => setModal(modal.back || null)}
          onSave={(m) => { if (modal.initial?.id) updateMeal(modal.initial.id, m); else addMeal(m); setModal(modal.back || null); }} />
      )}
      {modal?.type === "foodEditor" && (
        <FoodEditorSheet food={modal.food}
          onClose={() => setModal(modal.back || null)}
          onSave={(data) => { updateCachedFood(modal.food, data); setModal(modal.back || null); }} />
      )}
      {modal?.type === "programBuilder" && (
        <ProgramBuilderSheet initial={modal.initial} routines={routines}
          onClose={() => setModal(null)}
          onSave={(prog) => { if (modal.initial?.id) updateProgram(modal.initial.id, prog); else addProgram(prog); setModal(null); }} />
      )}
      {modal?.type === "addBody" && (
        <AddBodySheet u={u} last={body[body.length - 1]} onClose={() => setModal(null)}
          onSave={(entry) => { upsertBody(entry); setModal(null); }} />
      )}
      {modal?.type === "workoutDetail" && (() => {
        const w = workouts.find((x) => x.id === modal.id);
        if (!w) return null;
        return (
          <WorkoutDetailSheet workout={w} u={u} bodyKg={bodyKgOf(body, settings.units)} onClose={() => setModal(null)}
            onSave={(updated) => { setWorkouts((p) => p.map((x) => (x.id === updated.id ? updated : x))); }}
            onDelete={() => { setWorkouts((p) => p.filter((x) => x.id !== modal.id)); setModal(null); }}
            onOpenExercise={(n) => { setModal(null); setExDetail(n); }} />
        );
      })()}
      {modal?.type === "pickExercise" && (
        <ExercisePickerSheet exercises={[...EXERCISES, ...customExercises]}
          onClose={() => setModal(null)} onPick={(ex) => { modal.cb(ex); setModal(null); }}
          onCreate={addCustomExercise} onDelete={deleteCustomExercise} />
      )}
      {modal?.type === "routineBuilder" && (
        <RoutineBuilderSheet initial={modal.initial} exercises={[...EXERCISES, ...customExercises]}
          onCreate={addCustomExercise} onClose={() => setModal(null)}
          onSave={(rt) => {
            if (modal.initial?.id) setRoutines((p) => p.map((r) => (r.id === modal.initial.id ? { ...r, ...rt, id: r.id } : r)));
            else setRoutines((p) => [...p, rt]);
            setModal(null);
          }} />
      )}
    </div>
  );

  /* ---------- mutations ---------- */
  function addFood(meal, item) {
    setFood((prev) => {
      const day = { ...(prev[date] || {}) };
      day[meal] = [...(day[meal] || []), item];
      return { ...prev, [date]: day };
    });
  }
  function removeFood(meal, idx) {
    setFood((prev) => {
      const day = { ...(prev[date] || {}) };
      day[meal] = (day[meal] || []).filter((_, i) => i !== idx);
      return { ...prev, [date]: day };
    });
  }
  function addCustomExercise(ex) {
    const name = (ex.name || "").trim();
    if (!name) return null;
    const entry = { name, muscle: MUSCLES.includes(ex.muscle) ? ex.muscle : "Chest", custom: true };
    const exists = [...EXERCISES, ...customExercises].some((e) => e.name.toLowerCase() === name.toLowerCase());
    if (!exists) setCustomExercises((p) => [...p, entry]);
    return entry;
  }
  function deleteCustomExercise(name) {
    setCustomExercises((p) => p.filter((e) => e.name !== name));
  }
  function cacheFood(item) {
    // only remember scanned (barcode) or custom foods, not built-in suggestions
    if (!item.barcode && item.source !== "custom") return;
    const { qty, ...base } = item; // store the base serving, not the chosen multiple
    setCustomFoods((prev) => {
      const match = (f) => (base.barcode ? f.barcode === base.barcode
        : f.source === "custom" && f.name === base.name && f.serving === base.serving);
      if (prev.some(match)) return prev.map((f) => (match(f) ? base : f));
      return [base, ...prev].slice(0, 300);
    });
  }
  function removeCachedFood(food) {
    setCustomFoods((prev) => prev.filter((f) => f !== food));
  }
  function updateCachedFood(orig, data) {
    setCustomFoods((prev) => prev.map((f) => (f === orig ? { ...orig, ...data } : f)));
  }
  function addMeal(meal) { setMeals((p) => [{ ...meal, id: meal.id || "m-" + Date.now() }, ...p]); }
  function updateMeal(id, data) { setMeals((p) => p.map((m) => (m.id === id ? { ...m, ...data, id } : m))); }
  function deleteMeal(id) { setMeals((p) => p.filter((m) => m.id !== id)); }
  function addProgram(prog) { setPrograms((p) => [{ ...prog, id: prog.id || "p-" + Date.now() }, ...p]); }
  function updateProgram(id, data) { setPrograms((p) => p.map((x) => (x.id === id ? { ...x, ...data, id } : x))); }
  function deleteProgram(id) { setPrograms((p) => p.filter((x) => x.id !== id)); setActiveProgram((cur) => (cur === id ? null : cur)); }
  function startRoutineById(id) {
    const rt = routines.find((r) => r.id === id);
    if (!rt) return;
    setActive(sessionFromRoutine(rt));
    setTab("workout");
  }
  function upsertBody(entry) {
    setBody((prev) => {
      const rest = prev.filter((x) => x.date !== entry.date);
      return [...rest, entry].sort((a, b) => a.date.localeCompare(b.date));
    });
  }
  function saveActive(session) {
    // Duration = tracked active time (sum of per-exercise seconds), so a workout left
    // open in the background doesn't inflate duration or calories. Fall back to wall clock.
    const tracked = (session.exercises || []).reduce((s, e) => s + (Number(e.seconds) || 0), 0);
    const minutes = tracked > 0 ? Math.round(tracked / 60) : Math.round((Date.now() - session.startTime) / 60000);
    const finished = { ...session, date: today(), id: session.id, duration: minutes };
    setWorkouts((p) => [...p, finished]);
    setActive(null);
    setDate(today());
  }
}

/* ============================================================
   TAB BAR
   ============================================================ */
function TabBar({ tab, setTab }) {
  const items = [
    ["today", "Today", Flame],
    ["workout", "Workout", Dumbbell],
    ["food", "Food", Apple],
    ["body", "Body", Activity],
    ["stats", "Stats", BarChart3],
  ];
  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 border-t"
      style={{ background: "rgba(20,20,22,0.92)", backdropFilter: "blur(20px)", borderColor: C.line, maxWidth: 448 }}>
      <div className="flex justify-around px-2 pt-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}>
        {items.map(([id, label, Icon]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className="flex flex-1 flex-col items-center gap-1 py-1">
              <Icon size={22} color={on ? C.energy1 : C.faint} strokeWidth={on ? 2.6 : 2} />
              <span className="text-xs font-semibold" style={{ color: on ? C.energy1 : C.faint }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   TODAY
   ============================================================ */
function DateNav({ date, setDate }) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={() => setDate(addDays(date, -1))} className="rounded-full p-2" style={{ background: C.card }}>
        <ChevronLeft size={20} color={C.sub} />
      </button>
      <span className="text-base font-bold">{fmtDay(date)}</span>
      <button
        onClick={() => setDate(addDays(date, 1))}
        disabled={date >= today()}
        className="rounded-full p-2" style={{ background: C.card, opacity: date >= today() ? 0.35 : 1 }}>
        <ChevronRight size={20} color={C.sub} />
      </button>
    </div>
  );
}

function TodayView({ date, setDate, settings, nutri, ringEnergy, ringProtein, ringTrain, daySetCount, dayVolume, dayWorkouts, body, active, onOpenSettings, onCustomize, goTrain, goFood, onLogWeight, plannedRoutine, activeProg, onStartPlanned }) {
  const last = body[body.length - 1];
  const bodyKg = bodyKgOf(body, settings.units);
  const u = settings.units;
  const dayBurned = dayWorkouts.reduce((t, w) => t + workoutCalories(w, bodyKg), 0);
  const dayTime = dayWorkouts.reduce((t, w) => t + (Number(w.duration) || 0), 0);
  const dayDist = dayWorkouts.reduce((t, w) => t + cardioDistanceMi(w), 0);
  const metricCtx = {
    energy: nutri.cal, protein: nutri.p, carbs: nutri.c, fat: nutri.f,
    sets: daySetCount, volume: dayVolume, burned: dayBurned, time: dayTime, distance: dayDist,
    workouts: dayWorkouts.length,
  };
  const heroItems = buildTodayItems(
    settings.todayMetrics && settings.todayMetrics.length ? settings.todayMetrics : ["energy", "protein", "sets"],
    metricCtx, settings, u
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pt-1">
        <Logo markSize={30} fontSize={24} />
        <button onClick={onOpenSettings} className="rounded-full p-2.5" style={{ background: C.card }}>
          <Settings size={20} color={C.sub} />
        </button>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: C.sub }}>{new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" })}</p>
        <h1 className="text-3xl font-bold" style={{ letterSpacing: "-0.5px" }}>Activity</h1>
      </div>

      <DateNav date={date} setDate={setDate} />

      {/* Hero — daily progress (customizable) */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.sub }}>Today's progress</p>
          <button onClick={onCustomize} className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: C.card2 }}>
            <Pencil size={12} color={C.train1} /><span className="text-xs font-bold" style={{ color: C.train1 }}>Edit</span>
          </button>
        </div>
        <ProgressTowers items={heroItems} />
      </Card>

      {/* Macro mini cards */}
      <div className="grid grid-cols-3 gap-3">
        <MacroMini label="Carbs" val={nutri.c} goal={settings.goalCarbs} color={C.carb} />
        <MacroMini label="Fat" val={nutri.f} goal={settings.goalFat} color={C.fat} />
        <MacroMini label="Protein" val={nutri.p} goal={settings.goalProtein} color={C.protein1} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction onClick={goTrain} tint="rgba(0,240,200,0.15)"
          icon={<Dumbbell size={22} color={C.train1} />} title={active ? "Resume" : "Start"} sub="Workout" />
        <QuickAction onClick={goFood} tint="rgba(255,159,10,0.15)"
          icon={<Apple size={22} color={C.carb} />} title="Log" sub="Food" />
        <QuickAction onClick={onLogWeight} tint="rgba(255,55,95,0.15)"
          icon={<Scale size={22} color={C.energy1} />} title="Log" sub="Weight" />
      </div>

      {/* Today's plan from active program */}
      {plannedRoutine && date === today() && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-2.5" style={{ background: "rgba(0,240,200,0.15)" }}><Calendar size={20} color={C.train1} /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>{activeProg.name} · {WDAY_LONG[todayWday()]}</p>
                <p className="font-bold">{plannedRoutine.name}</p>
              </div>
            </div>
            <button onClick={onStartPlanned} className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold" style={{ background: C.train1, color: "#001012" }}>
              <Play size={15} /> Start
            </button>
          </div>
        </Card>
      )}

      {/* Today's training */}
      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold">Training</h3>
          <span className="text-sm font-semibold" style={{ color: C.train1 }}>{round(dayVolume).toLocaleString()} {settings.units} volume</span>
        </div>
        {dayWorkouts.length === 0
          ? <p className="text-sm" style={{ color: C.sub }}>No workout logged. Tap Start to begin.</p>
          : dayWorkouts.map((w) => (
            <div key={w.id} className="flex items-center justify-between border-t py-2" style={{ borderColor: C.line }}>
              <div><p className="font-semibold">{w.name}</p>
                <p className="text-xs" style={{ color: C.sub }}>{w.exercises.length} exercises · {sessionSets(w)} sets · {w.duration || 0} min{cardioDistanceMi(w) > 0 ? ` · ${cardioDistanceMi(w).toFixed(2)} mi` : ""}{bodyKg ? ` · ~${workoutCalories(w, bodyKg)} cal` : ""}</p></div>
              <Trophy size={18} color={C.protein1} />
            </div>
          ))}
      </Card>

      {/* Body snapshot */}
      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">Body</h3>
          {last && <span className="text-xs" style={{ color: C.sub }}>{shortDate(last.date)}</span>}
        </div>
        {last ? (
          <div className="flex gap-6 pt-1">
            <Stat label="Weight" value={last.weight} unit={settings.units} />
            {last.bodyfat != null && <Stat label="Body Fat" value={last.bodyfat} unit="%" color={C.carb} />}
          </div>
        ) : <p className="text-sm" style={{ color: C.sub }}>No measurements yet. Add one from the Body tab.</p>}
      </Card>
    </div>
  );
}

const RingLegend = ({ label, value, unit, color }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
    <p className="font-bold" style={{ fontSize: 18 }}>{value}<span className="text-xs font-semibold" style={{ color: C.sub }}> {unit}</span></p>
  </div>
);

function QuickAction({ icon, tint, title, sub, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 rounded-3xl p-4" style={{ background: C.card }}>
      <div className="rounded-2xl p-3" style={{ background: tint }}>{icon}</div>
      <div className="text-center leading-tight">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs" style={{ color: C.sub }}>{sub}</p>
      </div>
    </button>
  );
}

function MacroMini({ label, val, goal, color }) {
  const pct = Math.min(val / goal, 1) * 100;
  return (
    <Card className="p-3">
      <p className="text-xs font-semibold" style={{ color: C.sub }}>{label}</p>
      <p className="font-bold" style={{ fontSize: 19 }}>{val}<span className="text-xs" style={{ color: C.faint }}>/{goal}g</span></p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.card3 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width .5s" }} />
      </div>
    </Card>
  );
}

/* ============================================================
   WORKOUT  (routines + active session)
   ============================================================ */
function WorkoutView({ active, setActive, routines, workouts, u, exHistory, bodyKg, settings, programs, activeProgram, startRoutineById, onPickExercise, onNewRoutine, onEditRoutine, onDuplicateRoutine, onDeleteRoutine, onNewProgram, onEditProgram, onDeleteProgram, onSetActiveProgram, onSaveWorkout, onOpenExercise, onOpenWorkout, onDeleteWorkout }) {
  if (active) {
    return <ActiveWorkout active={active} setActive={setActive} u={u} exHistory={exHistory} bodyKg={bodyKg}
      settings={settings} onPickExercise={onPickExercise} onSave={onSaveWorkout} />;
  }
  const startEmpty = () => setActive({ id: "w-" + Date.now(), name: "Quick Workout", startTime: Date.now(), exercises: [] });
  const [histQuery, setHistQuery] = useState("");
  const [histRange, setHistRange] = useState("all"); // all | 30 | 7
  const ql = histQuery.trim().toLowerCase();
  const histCutoff = histRange === "all" ? null : addDays(today(), -Number(histRange));
  const histMatches = [...workouts].reverse().filter((w) => {
    if (histCutoff && w.date < histCutoff) return false;
    if (!ql) return true;
    return w.name.toLowerCase().includes(ql) || w.exercises.some((ex) => ex.name.toLowerCase().includes(ql));
  });
  const histFiltering = ql !== "" || histRange !== "all";
  const recent = histFiltering ? histMatches : histMatches.slice(0, 8);
  const activeProg = programs.find((p) => p.id === activeProgram) || null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="pt-1 text-3xl font-bold" style={{ letterSpacing: "-0.5px" }}>Workout</h1>

      <button onClick={startEmpty} className="flex items-center justify-center gap-2 rounded-3xl py-4 font-bold"
        style={{ background: C.train1, color: "#001012" }}>
        <Play size={18} /> Start Workout
      </button>

      {activeProg && <ThisWeekCard program={activeProg} routines={routines} workouts={workouts} startRoutineById={startRoutineById} />}

      {/* Programs */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Programs</h3>
        <button onClick={onNewProgram} className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.train1 }}>
          <Plus size={15} /> New
        </button>
      </div>
      {programs.length === 0 && <p className="text-sm" style={{ color: C.sub }}>Bundle routines into a weekly schedule — e.g. Mon: Push, Tue: Pull, Wed: Legs. Set one active and today's workout shows on your Today screen.</p>}
      <div className="flex flex-col gap-3">
        {programs.map((pg) => (
          <ProgramCard key={pg.id} program={pg} routines={routines} isActive={pg.id === activeProgram}
            onStartRoutine={startRoutineById} onSetActive={() => onSetActiveProgram(pg.id)}
            onEdit={() => onEditProgram(pg)} onDelete={() => onDeleteProgram(pg.id)} />
        ))}
      </div>

      {/* Routines */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Routines</h3>
        <button onClick={onNewRoutine} className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.train1 }}>
          <Plus size={15} /> New
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {routines.map((rt) => (
          <SwipeRow key={rt.id} onDelete={() => onDeleteRoutine(rt.id)}>
            <div className="flex items-center justify-between gap-2 p-4">
              <button onClick={() => onEditRoutine(rt)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="h-10 w-1.5 rounded-full" style={{ background: rt.color || C.train1 }} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{rt.name}</p>
                  <p className="truncate text-xs" style={{ color: C.sub }}>{rt.exercises.length} exercises · {rt.exercises.map((e) => e.muscle).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</p>
                </div>
              </button>
              <button onClick={() => startRoutineById(rt.id)} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: C.card2, color: C.train1 }}>
                Start
              </button>
            </div>
          </SwipeRow>
        ))}
      </div>

      <h3 className="mt-1 font-bold">History</h3>
      {workouts.length === 0 ? (
        <p className="text-sm" style={{ color: C.sub }}>Your completed workouts will show up here.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-2xl px-3" style={{ background: C.card }}>
            <Search size={16} color={C.faint} />
            <input value={histQuery} onChange={(e) => setHistQuery(e.target.value)} placeholder="Search workout or exercise"
              className="w-full bg-transparent py-2.5 text-sm font-semibold outline-none" style={{ color: C.text }} />
            {histQuery && <button onClick={() => setHistQuery("")} className="p-0.5"><X size={15} color={C.faint} /></button>}
          </div>
          <div className="flex items-center gap-2">
            {[["all", "All time"], ["30", "30 days"], ["7", "7 days"]].map(([v, lbl]) => (
              <button key={v} onClick={() => setHistRange(v)} className="flex-1 rounded-full py-1.5 text-xs font-bold"
                style={{ background: histRange === v ? C.train1 : C.card2, color: histRange === v ? "#001012" : C.sub }}>{lbl}</button>
            ))}
          </div>
          {histFiltering && (
            <p className="text-xs font-semibold" style={{ color: C.faint }}>
              {recent.length === 0 ? "No matching workouts" : `${recent.length} workout${recent.length === 1 ? "" : "s"}`}
            </p>
          )}
        </>
      )}
      <div className="flex flex-col gap-3">
        {recent.map((w) => {
          const dur = w.duration || 0;
          const restS = w.restSeconds || 0;
          const workS = Math.max(0, dur * 60 - restS);
          const density = dur * 60 > 0 && restS > 0 ? Math.round((workS / (dur * 60)) * 100) : null;
          return (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onOpenWorkout(w.id)} className="min-w-0 flex-1 text-left">
                  <p className="font-bold">{w.name}</p>
                  <p className="text-xs" style={{ color: C.sub }}>{fmtDay(w.date)} · {sessionSets(w)} sets · {round(sessionVolume(w)).toLocaleString()} {u}{cardioDistanceMi(w) > 0 ? ` · ${cardioDistanceMi(w).toFixed(2)} mi` : ""}{bodyKg ? ` · ~${workoutCalories(w, bodyKg)} cal` : ""}</p>
                  <p className="mt-0.5 text-xs" style={{ color: C.faint }}>{dur} min{restS > 0 ? ` · rest ${clock(restS)} · ${density}% effort` : ""}</p>
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => onOpenWorkout(w.id)} className="p-1"><ChevronRight size={18} color={C.faint} /></button>
                  <button onClick={() => onDeleteWorkout(w.id)} className="p-1"><Trash2 size={16} color={C.faint} /></button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {w.exercises.map((ex) => (
                  <button key={ex.id} onClick={() => onOpenExercise(ex.name)}
                    className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: C.card2, color: C.sub }}>
                    {ex.name}
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {!histFiltering && workouts.length > recent.length && (
        <p className="text-center text-xs" style={{ color: C.faint }}>Showing 8 most recent · search or filter to see all {workouts.length}</p>
      )}
    </div>
  );
}

function ActiveWorkout({ active, setActive, u, exHistory, bodyKg, settings, onPickExercise, onSave }) {
  const [rest, setRest] = useState(null); // {remaining, total}
  const timerRef = useRef(null);
  const restActiveRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lastTickRef = useRef(Date.now());

  // keep the screen awake during the workout so the rest timer stays visible
  useEffect(() => {
    if (settings && settings.keepAwake === false) return;
    let lock = null;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible" && navigator.wakeLock && !lock) {
          lock = await navigator.wakeLock.request("screen");
          lock.addEventListener && lock.addEventListener("release", () => { lock = null; });
        }
      } catch { /* not supported / denied */ }
    };
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      try { lock && lock.release && lock.release(); } catch { /* ignore */ }
      lock = null;
    };
  }, [settings && settings.keepAwake]);

  const restLen = active.restLen ?? 60;
  const exSeconds = active.exSeconds || {};
  const activeExId = active.activeExId || null;

  // master tick: total elapsed + accrue real time to the focused exercise + timed rest
  useEffect(() => {
    lastTickRef.current = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setElapsed(Math.round((now - active.startTime) / 1000));
      // A big delta means the app was backgrounded / the phone was locked and timers paused.
      // The exercise timer should still count that real time (it's a stopwatch), but a rest
      // countdown that froze mid-way shouldn't dump the whole gap into rest — drop it instead.
      const gap = delta > 3;
      if (gap && restActiveRef.current) { restActiveRef.current = false; setRest(null); }
      if (delta > 0) setActive((prev) => {
        if (!prev) return prev;
        let next = prev;
        if (prev.activeExId) {
          const fe = prev.exercises.find((e) => e.id === prev.activeExId);
          const feDone = fe && (fe.muscle === "Cardio" ? (fe.cardio && fe.cardio.done) : fe.done);
          if (fe && !feDone) {
            const es = { ...(prev.exSeconds || {}) };
            es[prev.activeExId] = (es[prev.activeExId] || 0) + delta; // real time, includes locked screen
            next = { ...next, exSeconds: es };
          }
        }
        if (restActiveRef.current && !gap) next = { ...next, restSeconds: (next.restSeconds || 0) + delta };
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [active.startTime]);

  // focus the first exercise on mount so time starts accruing
  useEffect(() => {
    if (!active.activeExId && active.exercises[0]) setActive((p) => ({ ...p, activeExId: active.exercises[0].id }));
  }, []); // eslint-disable-line

  // rest countdown between sets (visual; silent haptic on completion)
  useEffect(() => {
    restActiveRef.current = rest != null && rest.remaining > 0;
    if (rest == null) return;
    if (rest.remaining <= 0) {
      restActiveRef.current = false;
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(180);
      setRest(null);
      return;
    }
    timerRef.current = setTimeout(() => setRest((r) => (r ? { ...r, remaining: r.remaining - 1 } : null)), 1000);
    return () => clearTimeout(timerRef.current);
  }, [rest]);

  const setActiveEx = (id) => setActive((p) => (p && p.activeExId === id ? p : { ...p, activeExId: id }));
  const focus = (ei) => { const id = active.exercises[ei]?.id; if (id) setActiveEx(id); };
  const setRestLen = (s) => setActive((p) => ({ ...p, restLen: s }));

  const upd = (fn) => setActive((prev) => fn(structuredClone(prev)));
  const setSet = (ei, si, field, val) => { focus(ei); upd((d) => { d.exercises[ei].sets[si][field] = val; return d; }); };
  const toggleDone = (ei, si) => upd((d) => { d.exercises[ei].sets[si].done = !d.exercises[ei].sets[si].done; return d; });
  const onCheck = (ei, si) => {
    const wasDone = active.exercises[ei].sets[si].done;
    focus(ei);
    toggleDone(ei, si);
    if (!wasDone) { setRest({ remaining: restLen, total: restLen }); }
  };
  const addSet = (ei) => { focus(ei); upd((d) => {
    d.exercises[ei].done = false; // adding a set re-opens a completed exercise and resumes its timer
    const sets = d.exercises[ei].sets; const lastS = sets[sets.length - 1];
    sets.push({ weight: lastS ? lastS.weight : "", reps: "", done: false }); return d;
  }); };
  const delSet = (ei, si) => upd((d) => { d.exercises[ei].sets.splice(si, 1); return d; });
  const delExercise = (ei) => upd((d) => { d.exercises.splice(ei, 1); return d; });
  // mark an exercise complete/incomplete; completing stops its timer by handing focus to the next unfinished one
  const setExDone = (ei, val) => upd((d) => {
    const ex = d.exercises[ei];
    if (ex.muscle === "Cardio") ex.cardio = { ...(ex.cardio || {}), done: val };
    else ex.done = val;
    if (val && d.activeExId === ex.id) {
      const isDone = (e) => e.muscle === "Cardio" ? !!(e.cardio && e.cardio.done) : !!e.done;
      const nxt = d.exercises.find((e, i) => i !== ei && !isDone(e));
      d.activeExId = nxt ? nxt.id : null;
    }
    return d;
  });
  const setCardio = (ei, field, val) => { focus(ei); upd((d) => {
    const ex = d.exercises[ei];
    ex.cardio = { dist: "", unit: "mi", min: "", sec: "", incline: "", hr: "", elev: "", cal: "", ...(ex.cardio || {}), [field]: val };
    return d;
  }); };
  const addExercise = () => onPickExercise((ex) => upd((d) => {
    const base = { id: "e-" + Math.random().toString(36).slice(2), name: ex.name, muscle: ex.muscle };
    d.exercises.push(ex.muscle === "Cardio"
      ? { ...base, sets: [], cardio: { dist: "", unit: "mi", min: "", sec: "", incline: "", hr: "", elev: "", cal: "" } }
      : { ...base, sets: [{ weight: "", reps: "", done: false }] });
    return d;
  }));

  const finish = () => {
    const { exSeconds: _es, activeExId: _ax, restLen: _rl, ...base } = active;
    onSave({ ...base, restSeconds: Math.round(active.restSeconds || 0), exercises: base.exercises.map((ex) => ({ ...ex, seconds: Math.round((exSeconds[ex.id] || 0)) })) });
  };

  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`;
  const totalVol = round(sessionVolume(active));
  const totalSets = sessionSets(active);
  // live calorie estimate (uses manual cardio calories when entered, even without bodyweight)
  const liveCal = workoutCalories(
    { exercises: active.exercises.map((ex) => ({ ...ex, liveSeconds: exSeconds[ex.id] || 0 })) },
    bodyKg || 0, elapsed
  );
  // completion is explicit (a button) for both strength and cardio — checking sets never auto-completes
  const exComplete = (ex) => ex.muscle === "Cardio" ? !!(ex.cardio && ex.cardio.done) : !!ex.done;
  const rankOf = (ex) => (exComplete(ex) ? 2 : (activeExId === ex.id ? 0 : 1));
  const order = active.exercises.map((ex, ei) => ({ ex, ei })).sort((a, b) => rankOf(a.ex) - rankOf(b.ex));
  const toggleCardioDone = (ei) => setExDone(ei, !exComplete(active.exercises[ei]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between pt-1">
        <button onClick={() => { if (confirmDiscard) setActive(null); else { setConfirmDiscard(true); setTimeout(() => setConfirmDiscard(false), 2500); } }}
          className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.energy1 }}>
          <X size={16} /> {confirmDiscard ? "Tap to confirm" : "Discard"}
        </button>
      </div>

      <input
        value={active.name}
        onChange={(e) => setActive((p) => ({ ...p, name: e.target.value }))}
        className="bg-transparent text-2xl font-bold outline-none" style={{ color: C.text }}
      />

      {/* Elapsed time — wide bubble */}
      <Card className="p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Elapsed</span>
          <div className="flex items-center gap-2">
            <Clock size={20} color={C.train1} />
            <span className="font-mono font-bold" style={{ fontSize: 30, lineHeight: 1, letterSpacing: "1px", color: C.train1 }}>{mmss(elapsed)}</span>
          </div>
        </div>
      </Card>

      {/* Rest countdown — pinned right under Elapsed */}
      {rest && (
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <Timer size={20} color={C.train1} />
            <div className="flex flex-col" style={{ minWidth: 56 }}>
              <span className="font-mono text-xl font-bold leading-none" style={{ color: C.train1 }}>{mmss(rest.remaining)}</span>
              <span className="text-xs" style={{ color: C.faint }}>rest</span>
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: C.card3 }}>
              <div className="h-full rounded-full" style={{ width: `${(rest.remaining / rest.total) * 100}%`, background: C.train1, transition: "width 1s linear" }} />
            </div>
            <button onClick={() => setRest((r) => ({ ...r, remaining: r.remaining + 30, total: r.total + 30 }))} className="text-sm font-bold" style={{ color: C.sub }}>+30s</button>
            <button onClick={() => setRest(null)} className="text-sm font-bold" style={{ color: C.energy1 }}>Skip</button>
          </div>
        </Card>
      )}

      {/* Rest length selector */}
      <div className="flex items-center gap-2">
        <Timer size={16} color={C.sub} />
        <span className="text-sm font-semibold" style={{ color: C.sub }}>Rest</span>
        {[60, 90, 120].map((s) => (
          <button key={s} onClick={() => setRestLen(s)} className="flex-1 rounded-xl py-3 text-base font-bold"
            style={{ background: restLen === s ? C.train1 : C.card2, color: restLen === s ? "#001012" : C.sub }}>
            {s}s
          </button>
        ))}
      </div>

      <div className={liveCal > 0 ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
        <Card className="p-3"><Stat label="Volume" value={totalVol.toLocaleString()} unit={u} color={C.train1} /></Card>
        <Card className="p-3"><Stat label="Sets" value={totalSets} color={C.protein1} /></Card>
        {liveCal > 0 && <Card className="p-3"><Stat label="Est. cal" value={liveCal.toLocaleString()} color={C.energy1} /></Card>}
      </div>

      {order.map(({ ex, ei }) => {
        const hist = exHistory[ex.name];
        const lastSess = hist && hist[hist.length - 1];
        const isActiveEx = activeExId === ex.id;
        const secs = Math.round(exSeconds[ex.id] || 0);
        if (ex.muscle === "Cardio") {
          const c = ex.cardio || {};
          const unit = c.unit || "mi";
          const dist = Number(c.dist) || 0;
          const totMin = (Number(c.min) || 0) + (Number(c.sec) || 0) / 60;
          const paceMin = dist > 0 && totMin > 0 ? totMin / dist : null;
          const pace = paceMin ? `${Math.floor(paceMin)}:${String(Math.round((paceMin % 1) * 60)).padStart(2, "0")}` : null;
          const metCal = bodyKg && totMin > 0 ? Math.round(cardioMET(ex) * bodyKg * (totMin / 60)) : null;
          const elevUnit = unit === "km" ? "m" : "ft";
          const done = !!c.done;
          return (
            <SwipeRow key={ex.id} onDelete={() => delExercise(ei)} ring={isActiveEx ? C.train1 : null} contentClassName="p-4">
              <div className="mb-3 flex items-center justify-between gap-2" style={{ opacity: done ? 0.6 : 1 }}>
                <button onClick={() => focus(ei)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-bold">{ex.name}</p>
                  <p className="truncate text-xs" style={{ color: C.sub }}>Cardio{pace ? ` · ${pace}/${unit}` : ""}{c.hr ? ` · ${c.hr} bpm` : ""}</p>
                </button>
              </div>
              <div className="flex items-end gap-2" style={{ opacity: done ? 0.6 : 1 }}>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>DISTANCE</p>
                  <NumField value={c.dist ?? ""} onChange={(val) => setCardio(ei, "dist", val)} placeholder="0" />
                </div>
                <div className="mb-0.5 flex rounded-xl p-1" style={{ background: C.card2 }}>
                  {["mi", "km"].map((un) => (
                    <button key={un} onClick={() => setCardio(ei, "unit", un)} className="rounded-lg px-2.5 py-1 text-xs font-bold"
                      style={{ background: unit === un ? C.train1 : "transparent", color: unit === un ? "#001012" : C.sub }}>{un}</button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-end gap-2" style={{ opacity: done ? 0.6 : 1 }}>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>TIME (MIN : SEC)</p>
                  <div className="flex items-center gap-1">
                    <NumField value={c.min ?? ""} onChange={(val) => setCardio(ei, "min", val)} placeholder="0" />
                    <span className="font-bold" style={{ color: C.faint }}>:</span>
                    <NumField value={c.sec ?? ""} onChange={(val) => setCardio(ei, "sec", val)} placeholder="00" />
                  </div>
                </div>
                <div className="w-20">
                  <p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>INCLINE %</p>
                  <NumField value={c.incline ?? ""} onChange={(val) => setCardio(ei, "incline", val)} placeholder="0" />
                </div>
              </div>
              <div className="mt-3 flex items-end gap-2" style={{ opacity: done ? 0.6 : 1 }}>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>AVG HR (BPM)</p>
                  <NumField value={c.hr ?? ""} onChange={(val) => setCardio(ei, "hr", val)} placeholder="0" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>ELEV GAIN ({elevUnit})</p>
                  <NumField value={c.elev ?? ""} onChange={(val) => setCardio(ei, "elev", val)} placeholder="0" />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-xs font-semibold" style={{ color: C.faint }}>EST. CAL</p>
                  <NumField value={c.cal ?? ""} onChange={(val) => setCardio(ei, "cal", val)} placeholder={metCal != null ? String(metCal) : "0"} />
                </div>
              </div>
              {pace && (
                <div className="mt-3 rounded-xl px-3 py-2" style={{ background: C.card2 }}>
                  <p className="text-xs" style={{ color: C.faint }}>Pace</p>
                  <p className="font-bold" style={{ color: C.train1 }}>{pace}<span className="text-xs font-semibold" style={{ color: C.sub }}> /{unit}</span></p>
                </div>
              )}
              <button onClick={() => toggleCardioDone(ei)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold"
                style={{ background: done ? C.protein1 : C.card2, color: done ? "#06210A" : C.protein1 }}>
                <Check size={15} strokeWidth={3} /> {done ? "Completed" : "Complete"}
              </button>
            </SwipeRow>
          );
        }
        return (
          <SwipeRow key={ex.id} onDelete={() => delExercise(ei)} ring={isActiveEx ? C.train1 : null} contentClassName="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button onClick={() => focus(ei)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-bold">{ex.name}</p>
                <p className="truncate text-xs" style={{ color: C.sub }}>
                  {ex.muscle}{lastSess ? ` · last: ${lastSess.top.weight}${u}×${lastSess.top.reps}` : " · new"}
                </p>
              </button>
              <button onClick={() => focus(ei)} title={ex.done ? "Completed" : (isActiveEx ? "Timing this exercise" : "Tap to time this exercise")}
                className="flex items-center gap-1 rounded-full px-2 py-1" style={{ background: isActiveEx && !ex.done ? "rgba(0,240,200,0.15)" : C.card2 }}>
                {isActiveEx && !ex.done && <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: C.train1 }} />}
                <Timer size={12} color={ex.done ? C.faint : (isActiveEx ? C.train1 : C.faint)} />
                <span className="font-mono text-xs font-bold" style={{ color: ex.done ? C.sub : (isActiveEx ? C.train1 : C.sub) }}>{mmss(secs)}</span>
              </button>
            </div>
            <div className="mb-1 flex items-center gap-2 px-1 text-xs font-semibold" style={{ color: C.faint }}>
              <span className="w-7">SET</span>
              <span className="flex-1">WEIGHT ({u})</span>
              <span className="flex-1">REPS</span>
              <span className="w-9 text-center">✓</span>
              <span className="w-9" />
            </div>
            {ex.sets.map((st, si) => (
              <div key={si} className="mb-1.5 flex items-center gap-2" style={{ opacity: st.done ? 0.65 : 1 }}>
                <span className="w-7 text-center font-bold" style={{ color: st.done ? C.protein1 : C.sub }}>{si + 1}</span>
                <div className="flex-1"><NumField value={st.weight} onChange={(v) => setSet(ei, si, "weight", v)} placeholder="0" /></div>
                <div className="flex-1"><NumField value={st.reps} onChange={(v) => setSet(ei, si, "reps", v)} placeholder="0" /></div>
                <button onClick={() => onCheck(ei, si)} className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: st.done ? C.protein1 : C.card2 }}>
                  <Check size={18} color={st.done ? "#06210A" : C.faint} strokeWidth={3} />
                </button>
                <button onClick={() => delSet(ei, si)} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: C.card2 }}>
                  <X size={17} color={C.faint} strokeWidth={3} />
                </button>
              </div>
            ))}
            <div className="mt-1 flex gap-2">
              <button onClick={() => addSet(ei)} className="flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: C.card2, color: C.train1 }}>
                + Add Set
              </button>
              <button onClick={() => setExDone(ei, !ex.done)} className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold"
                style={{ background: ex.done ? C.protein1 : C.card2, color: ex.done ? "#06210A" : C.protein1 }}>
                <Check size={15} strokeWidth={3} /> {ex.done ? "Completed" : "Complete"}
              </button>
            </div>
          </SwipeRow>
        );
      })}

      <button onClick={addExercise} className="flex items-center justify-center gap-2 rounded-3xl py-3.5 font-bold"
        style={{ background: C.card, color: C.train1 }}>
        <Plus size={18} /> Add Exercise
      </button>

      <button onClick={finish} className="mb-2 rounded-3xl py-4 font-bold" style={{ background: C.protein1, color: "#06210A" }}>
        Finish Workout
      </button>
    </div>
  );
}

/* ---------- Exercise progress (totals / averages / max / chart) ---------- */
function ExerciseProgress({ name, history, u, onBack }) {
  const stats = useMemo(() => {
    const allSets = history.flatMap((h) => h.sets);
    if (!allSets.length) return null;
    const weights = allSets.map((s) => Number(s.weight));
    const totalVol = history.reduce((t, h) => t + h.vol, 0);
    const totalReps = allSets.reduce((t, s) => t + Number(s.reps), 0);
    const maxW = Math.max(...weights);
    const avgW = weights.reduce((a, b) => a + b, 0) / weights.length;
    const best1rm = Math.max(...history.map((h) => h.est1rm));
    return { sessions: history.length, sets: allSets.length, totalVol, totalReps, maxW, avgW, best1rm };
  }, [history]);

  const chart = history.map((h) => ({ date: shortDate(h.date), max: round(h.top.weight), e1rm: round(h.est1rm), vol: round(h.vol) }));

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex items-center gap-1 pt-1 text-sm font-semibold" style={{ color: C.train1 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-bold" style={{ letterSpacing: "-0.4px" }}>{name}</h1>

      {!stats ? <p style={{ color: C.sub }}>No logged sets yet.</p> : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4"><Stat label="Max Weight" value={round(stats.maxW)} unit={u} color={C.energy1} /></Card>
            <Card className="p-4"><Stat label="Est. 1RM" value={round(stats.best1rm)} unit={u} color={C.carb} /></Card>
            <Card className="p-4"><Stat label="Avg Weight" value={round(stats.avgW, 1)} unit={u} color={C.train1} /></Card>
            <Card className="p-4"><Stat label="Total Volume" value={round(stats.totalVol).toLocaleString()} unit={u} color={C.protein1} /></Card>
            <Card className="p-4"><Stat label="Total Sets" value={stats.sets} /></Card>
            <Card className="p-4"><Stat label="Total Reps" value={stats.totalReps} /></Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 font-bold">Top set over time <span className="text-xs font-semibold" style={{ color: C.sub }}>({u})</span></h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chart} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 12, color: C.text }} />
                <Line type="monotone" dataKey="max" stroke={C.energy1} strokeWidth={3} dot={{ r: 3, fill: C.energy1 }} name="Top set" />
                <Line type="monotone" dataKey="e1rm" stroke={C.carb} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Est 1RM" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 font-bold">Session log</h3>
            {[...history].reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between border-t py-2 text-sm" style={{ borderColor: C.line }}>
                <span className="font-semibold">{shortDate(h.date)}</span>
                <span style={{ color: C.sub }}>{h.sets.length} sets · top {h.top.weight}{u}×{h.top.reps}</span>
                <span style={{ color: C.protein1 }}>{round(h.vol).toLocaleString()} {u}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

/* ============================================================
   FOOD (MyFitnessPal-style diary)
   ============================================================ */
function MacroSplitBar({ p, c, f }) {
  const segs = [
    { label: "Protein", g: p || 0, cal: (p || 0) * 4, color: C.protein1 },
    { label: "Carbs", g: c || 0, cal: (c || 0) * 4, color: C.carb },
    { label: "Fat", g: f || 0, cal: (f || 0) * 9, color: C.fat },
  ];
  const tot = segs.reduce((t, s) => t + s.cal, 0);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.sub }}>Macro balance</p>
        <p className="text-xs font-semibold" style={{ color: C.faint }}>{Math.round(tot)} cal</p>
      </div>
      <div className="flex h-5 w-full overflow-hidden rounded-full" style={{ background: C.card2 }}>
        {tot > 0 && segs.map((s) => (s.cal > 0
          ? <div key={s.label} style={{ width: `${(s.cal / tot) * 100}%`, background: s.color, transition: "width .6s cubic-bezier(.4,0,.2,1)" }} />
          : null))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <div>
              <p className="text-xs font-bold" style={{ color: C.text }}>{s.label}</p>
              <p className="text-xs" style={{ color: C.sub }}>{Math.round(s.g)} g · {tot > 0 ? Math.round((s.cal / tot) * 100) : 0}%</p>
            </div>
          </div>
        ))}
      </div>
      {tot === 0 && <p className="mt-2 text-xs" style={{ color: C.faint }}>Log food to see your macro balance.</p>}
    </Card>
  );
}

function FoodView({ date, setDate, dayFood, nutri, settings, onAdd, onRemove, onDuplicate, onOpenLibrary, onSaveAsMeal }) {
  const remaining = settings.goalCalories - nutri.cal;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-3xl font-bold" style={{ letterSpacing: "-0.5px" }}>Food</h1>
        <button onClick={onOpenLibrary} className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold" style={{ background: C.card, color: C.carb }}>
          <BookMarked size={16} /> Library
        </button>
      </div>
      <DateNav date={date} setDate={setDate} />

      {/* calorie budget */}
      <Card className="p-5">
        <div className="flex items-center justify-between text-center">
          <div className="flex-1"><p className="text-xs font-semibold" style={{ color: C.sub }}>Goal</p><p className="text-lg font-bold">{settings.goalCalories}</p></div>
          <span style={{ color: C.faint }}>−</span>
          <div className="flex-1"><p className="text-xs font-semibold" style={{ color: C.sub }}>Food</p><p className="text-lg font-bold" style={{ color: C.energy1 }}>{nutri.cal}</p></div>
          <span style={{ color: C.faint }}>=</span>
          <div className="flex-1"><p className="text-xs font-semibold" style={{ color: C.sub }}>Remaining</p><p className="text-lg font-bold" style={{ color: remaining < 0 ? C.energy1 : C.protein1 }}>{remaining}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MacroBar label="Protein" val={nutri.p} goal={settings.goalProtein} color={C.protein1} />
          <MacroBar label="Carbs" val={nutri.c} goal={settings.goalCarbs} color={C.carb} />
          <MacroBar label="Fat" val={nutri.f} goal={settings.goalFat} color={C.fat} />
        </div>
      </Card>

      <MacroSplitBar p={nutri.p} c={nutri.c} f={nutri.f} />

      {MEALS.map((meal) => {
        const items = dayFood[meal] || [];
        const cals = round(items.reduce((t, it) => t + it.cal * it.qty, 0));
        return (
          <Card key={meal} className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-bold">{meal}</h3>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button onClick={() => onSaveAsMeal(meal, items)} title="Save as reusable meal"
                    className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold" style={{ background: C.card2, color: C.carb }}>
                    <Bookmark size={12} /> Save
                  </button>
                )}
                <span className="text-sm font-semibold" style={{ color: C.sub }}>{cals} cal</span>
              </div>
            </div>
            {items.map((it, idx) => (
              <SwipeRow key={idx} radius={12} onDelete={() => onRemove(meal, idx)} onDuplicate={() => onDuplicate(meal, it)}>
                <div className="flex items-center justify-between py-2" style={idx ? { borderTop: `1px solid ${C.line}` } : undefined}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{it.name}{it.qty !== 1 ? ` ×${it.qty}` : ""}</p>
                    <p className="text-xs" style={{ color: C.sub }}>{it.serving} · P{round(it.p * it.qty)} C{round(it.c * it.qty)} F{round(it.f * it.qty)}</p>
                  </div>
                  <span className="mr-3 text-sm font-bold">{round(it.cal * it.qty)}</span>
                  <button onClick={() => onRemove(meal, idx)}><X size={15} color={C.faint} /></button>
                </div>
              </SwipeRow>
            ))}
            <button onClick={() => onAdd(meal)} className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm font-semibold" style={{ background: C.card2, color: C.carb }}>
              <Plus size={15} /> Add Food
            </button>
          </Card>
        );
      })}
    </div>
  );
}

const MacroBar = ({ label, val, goal, color }) => {
  const pct = Math.min(val / goal, 1) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold" style={{ color: C.sub }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{val}g</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: C.card3 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

/* ============================================================
   BODY (weight + bodyfat tracking)
   ============================================================ */
function GoalBar({ label, start, cur, goal, unit, color, perWeek }) {
  const total = goal - start;
  let pct = total === 0 ? (Math.abs(cur - goal) < 0.05 ? 1 : 0) : (cur - start) / total;
  pct = Math.max(0, Math.min(1, pct));
  const reached = total < 0 ? cur <= goal : total > 0 ? cur >= goal : Math.abs(cur - goal) < 0.05;
  const toGo = Math.round(Math.abs(goal - cur) * 10) / 10;
  const dir = goal - cur;
  let eta = null;
  if (!reached && perWeek && Math.sign(perWeek) === Math.sign(dir) && Math.abs(perWeek) > 0.01) {
    const wks = Math.abs(dir) / Math.abs(perWeek);
    if (wks <= 260) eta = wks;
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-bold">{label}</span>
        {reached
          ? <span className="text-sm font-bold" style={{ color: C.protein1 }}>Goal reached</span>
          : <span className="text-sm font-bold" style={{ color }}>{toGo} {unit} to go</span>}
      </div>
      <div className="relative h-3 rounded-full" style={{ background: C.card3 }}>
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct * 100}%`, background: color, transition: "width .6s" }} />
        <div className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full" style={{ left: `calc(${pct * 100}% - 3px)`, background: C.text }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs" style={{ color: C.sub }}>
        <span>Start {start} {unit}</span>
        <span className="font-bold" style={{ color }}>{Math.round(pct * 100)}% there</span>
        <span>Goal {goal} {unit}</span>
      </div>
      {eta != null && <p className="mt-1 text-xs" style={{ color: C.faint }}>~{eta < 1 ? "<1" : Math.round(eta)} {eta < 1 || Math.round(eta) === 1 ? "week" : "weeks"} to go at your current pace</p>}
    </div>
  );
}

function GoalProgress({ body, settings, u }) {
  if (!body || body.length === 0) return null;
  const entries = [...body].sort((a, b) => a.date.localeCompare(b.date));
  const first = entries[0], lastE = entries[entries.length - 1];
  const span = Math.max(1, daysBetween(first.date, lastE.date));
  const wPerWeek = entries.length > 1 ? (lastE.weight - first.weight) / (span / 7) : 0;
  const bf = entries.filter((e) => e.bodyfat != null);
  const bfFirst = bf[0], bfLast = bf[bf.length - 1];
  const bfSpan = bf.length > 1 ? Math.max(1, daysBetween(bfFirst.date, bfLast.date)) : 1;
  const bfPerWeek = bf.length > 1 ? (bfLast.bodyfat - bfFirst.bodyfat) / (bfSpan / 7) : 0;
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2"><Trophy size={18} color={C.fat} /><h3 className="font-bold">Goal progress</h3></div>
      <div className="flex flex-col gap-4">
        <GoalBar label="Weight" start={first.weight} cur={lastE.weight} goal={settings.goalWeight} unit={u} color={C.energy1} perWeek={wPerWeek} />
        {bf.length > 0 && <GoalBar label="Body Fat" start={bfFirst.bodyfat} cur={bfLast.bodyfat} goal={settings.goalBodyfat} unit="%" color={C.carb} perWeek={bfPerWeek} />}
      </div>
    </Card>
  );
}

function BodyView({ body, settings, u, onAdd, onRemove }) {
  const [range, setRange] = useState("month");
  const [from, setFrom] = useState(addDays(today(), -29));
  const [to, setTo] = useState(today());

  const { start, end } = useMemo(() => {
    if (range === "day") return { start: today(), end: today() };
    if (range === "week") return { start: addDays(today(), -6), end: today() };
    if (range === "month") return { start: addDays(today(), -29), end: today() };
    if (range === "custom") return { start: from, end: to };
    return { start: "0000-01-01", end: "9999-12-31" };
  }, [range, from, to]);

  const entries = useMemo(() =>
    body.filter((b) => b.date >= start && b.date <= end).sort((a, b) => a.date.localeCompare(b.date)),
  [body, start, end]);

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const ws = entries.map((e) => e.weight);
    const first = entries[0], lastE = entries[entries.length - 1];
    const bf = entries.filter((e) => e.bodyfat != null);
    const span = daysBetween(first.date, lastE.date);
    return {
      n: entries.length,
      cur: lastE.weight,
      wChange: round(lastE.weight - first.weight, 1),
      wAvg: round(ws.reduce((a, b) => a + b, 0) / ws.length, 1),
      wMin: round(Math.min(...ws), 1),
      wMax: round(Math.max(...ws), 1),
      ratePerWk: span > 0 && entries.length > 1 ? round((lastE.weight - first.weight) / (span / 7), 2) : 0,
      bfCur: bf.length ? bf[bf.length - 1].bodyfat : null,
      bfChange: bf.length > 1 ? round(bf[bf.length - 1].bodyfat - bf[0].bodyfat, 1) : null,
      bfAvg: bf.length ? round(bf.reduce((a, b) => a + b.bodyfat, 0) / bf.length, 1) : null,
    };
  }, [entries]);

  const wData = entries.map((b) => ({ date: shortDate(b.date), weight: b.weight, bf: b.bodyfat }));
  const hasBf = entries.some((b) => b.bodyfat != null);
  const goodWeight = (v) => (v <= 0 ? C.protein1 : C.carb);
  const goodBf = (v) => (v <= 0 ? C.protein1 : C.carb);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-3xl font-bold" style={{ letterSpacing: "-0.5px" }}>Body</h1>
        <button onClick={onAdd} className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold" style={{ background: C.energy1, color: "#fff" }}>
          <Plus size={16} /> Log
        </button>
      </div>

      <GoalProgress body={body} settings={settings} u={u} />

      <Segmented value={range} onChange={setRange}
        options={[["day", "Day"], ["week", "Week"], ["month", "Month"], ["custom", "Custom"], ["all", "All"]]} />

      {range === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
          <span style={{ color: C.faint }}>→</span>
          <input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
        </div>
      )}

      {!stats ? (
        <Card className="p-5"><p className="text-sm" style={{ color: C.sub }}>No measurements in this range. Tap Log to add one.</p></Card>
      ) : (
        <>
          {/* Weight headline */}
          <Card className="p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Weight</p>
                <p className="font-bold" style={{ fontSize: 30, lineHeight: 1.1 }}>{stats.cur}<span className="text-base font-semibold" style={{ color: C.sub }}> {u}</span></p>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: goodWeight(stats.wChange), fontSize: 17 }}>
                  {stats.wChange > 0 ? "+" : ""}{stats.wChange} {u}
                </p>
                <p className="text-xs" style={{ color: C.sub }}>
                  {stats.ratePerWk ? `${stats.ratePerWk > 0 ? "+" : ""}${stats.ratePerWk} ${u}/wk · ` : ""}{stats.n} {stats.n === 1 ? "entry" : "entries"}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3"><Stat label="Avg" value={stats.wAvg} unit={u} color={C.energy1} /></Card>
            <Card className="p-3"><Stat label="Low" value={stats.wMin} unit={u} color={C.protein1} /></Card>
            <Card className="p-3"><Stat label="High" value={stats.wMax} unit={u} color={C.carb} /></Card>
          </div>

          {/* Body fat headline */}
          {stats.bfCur != null && (
            <Card className="p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.sub }}>Body Fat</p>
                  <p className="font-bold" style={{ fontSize: 26, lineHeight: 1.1, color: C.carb }}>{stats.bfCur}<span className="text-sm font-semibold" style={{ color: C.sub }}> %</span></p>
                </div>
                <div className="text-right">
                  {stats.bfChange != null && <p className="font-bold" style={{ color: goodBf(stats.bfChange), fontSize: 16 }}>{stats.bfChange > 0 ? "+" : ""}{stats.bfChange} %</p>}
                  {stats.bfAvg != null && <p className="text-xs" style={{ color: C.sub }}>avg {stats.bfAvg}% · goal {settings.goalBodyfat}%</p>}
                </div>
              </div>
            </Card>
          )}

          {/* Charts */}
          {entries.length >= 2 ? (
            <>
              <Card className="p-4">
                <h3 className="mb-3 font-bold">Weight <span className="text-xs" style={{ color: C.sub }}>({u})</span></h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={wData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={C.line} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                    <YAxis domain={["dataMin - 3", "dataMax + 3"]} tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 12, color: C.text }} />
                    <ReferenceLine y={settings.goalWeight} stroke={C.protein1} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="weight" stroke={C.energy1} strokeWidth={3} dot={{ r: 3, fill: C.energy1 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              {hasBf && (
                <Card className="p-4">
                  <h3 className="mb-3 font-bold">Body Fat <span className="text-xs" style={{ color: C.sub }}>(%)</span></h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={wData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={C.line} vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 12, color: C.text }} />
                      <ReferenceLine y={settings.goalBodyfat} stroke={C.protein1} strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="bf" stroke={C.carb} strokeWidth={3} dot={{ r: 3, fill: C.carb }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          ) : <Card className="p-5"><p className="text-sm" style={{ color: C.sub }}>Add another measurement in this range to see a trend line.</p></Card>}
        </>
      )}

      {/* Log */}
      <Card className="p-4">
        <h3 className="mb-1 font-bold">Log <span className="text-xs font-semibold" style={{ color: C.sub }}>{range === "all" ? "" : "· in range"}</span></h3>
        {[...entries].reverse().map((b) => (
          <div key={b.date} className="flex items-center justify-between border-t py-2 text-sm" style={{ borderColor: C.line }}>
            <span className="font-semibold">{shortDate(b.date)}</span>
            <span style={{ color: C.energy1 }}>{b.weight} {u}</span>
            <span style={{ color: C.carb }}>{b.bodyfat != null ? `${b.bodyfat}%` : "—"}</span>
            <button onClick={() => onRemove(b.date)}><Trash2 size={14} color={C.faint} /></button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm" style={{ color: C.sub }}>No entries in this range.</p>}
      </Card>
    </div>
  );
}

/* ============================================================
   STATS — window range (Day/Week/Month/Custom/All) + Muscle Focus
   ============================================================ */
function windowRange(range, from, to, allStart) {
  const t = today();
  if (range === "day") return { start: t, end: t };
  if (range === "week") return { start: addDays(t, -6), end: t };
  if (range === "month") return { start: addDays(t, -29), end: t };
  if (range === "custom") return { start: from, end: to };
  return { start: allStart, end: t };
}
function bucketize(start, end) {
  const span = Math.max(0, daysBetween(start, end));
  const out = [];
  if (span <= 31) {
    for (let d = start; ; d = addDays(d, 1)) {
      const dd = new Date(d + "T00:00:00");
      out.push({ start: d, end: d, label: `${dd.getMonth() + 1}/${dd.getDate()}` });
      if (d >= end) break;
    }
  } else if (span <= 210) {
    for (let s = mondayOf(start); s <= end; s = addDays(s, 7)) out.push({ start: s, end: addDays(s, 6), label: shortDate(s) });
  } else {
    for (let s = monthFirst(start); s <= end; s = addMonths(s, 1)) out.push({ start: s, end: lastOfMonth(s), label: new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short" }) });
  }
  return out;
}

// Per-exercise weight progression chart with its own exercise picker + date range.
function ExerciseProgressCard({ exHistory, u }) {
  const names = useMemo(
    () => Object.keys(exHistory).filter((n) => (exHistory[n] || []).some((h) => h.top && Number(h.top.weight) > 0)).sort(),
    [exHistory]
  );
  const [name, setName] = useState(names[0] || "");
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("month");
  const [from, setFrom] = useState(addDays(today(), -29));
  const [to, setTo] = useState(today());
  useEffect(() => { if (names.length && !names.includes(name)) setName(names[0]); }, [names, name]);

  const hist = exHistory[name] || [];
  const allStart = hist.length ? hist[0].date : today();
  const { start, end } = windowRange(range, from, to, allStart);
  const data = hist
    .filter((h) => h.date >= start && h.date <= end)
    .map((h) => ({ date: shortDate(h.date), weight: round(h.top.weight), e1rm: round(h.est1rm) }));

  if (!names.length) {
    return (
      <Card className="p-4">
        <h3 className="mb-1 font-bold">Exercise progress</h3>
        <p className="text-sm" style={{ color: C.sub }}>Log a few weighted sets and your weight-per-set trend will show up here.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 font-bold">Exercise progress</h3>

      <div className="relative mb-3">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 font-semibold" style={{ background: C.card2, color: C.text }}>
          <span className="truncate">{name || "Select exercise"}</span>
          <ChevronDown size={18} color={C.sub} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-xl p-1 shadow-xl" style={{ background: C.card2, border: `1px solid ${C.line}` }}>
            {names.map((n) => (
              <button key={n} onClick={() => { setName(n); setOpen(false); }} className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm font-semibold"
                style={{ background: n === name ? C.card3 : "transparent", color: n === name ? C.train1 : C.text }}>{n}</button>
            ))}
          </div>
        )}
      </div>

      <Segmented value={range} onChange={setRange} options={[["week", "Week"], ["month", "Month"], ["custom", "Custom"], ["all", "All"]]} />
      {range === "custom" && (
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
          <span style={{ color: C.faint }}>→</span>
          <input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
        </div>
      )}

      {data.length >= 2 ? (
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 12, color: C.text }} />
              <Line type="monotone" dataKey="weight" stroke={C.energy1} strokeWidth={3} dot={{ r: 3, fill: C.energy1 }} name={`Top set (${u})`} />
              <Line type="monotone" dataKey="e1rm" stroke={C.carb} strokeWidth={2} strokeDasharray="4 4" dot={false} name={`Est 1RM (${u})`} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 flex items-center justify-center gap-4 text-xs" style={{ color: C.sub }}>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: C.energy1 }} /> Top-set weight</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1 w-3 rounded-full" style={{ background: C.carb }} /> Est. 1RM</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm" style={{ color: C.sub }}>
          {data.length === 1 ? "Only one session in this range — log this lift again to see the line." : "No sessions for this exercise in the selected range."}
        </p>
      )}
    </Card>
  );
}

function StatsView({ workouts, body, food, settings, exHistory, u, onOpenExercise }) {
  const [range, setRange] = useState("week");
  const [from, setFrom] = useState(addDays(today(), -29));
  const [to, setTo] = useState(today());
  const [metric, setMetric] = useState("volume"); // volume | sets | time

  const allStart = useMemo(() => {
    const ds = [...workouts.map((w) => w.date), ...Object.keys(food), ...body.map((b) => b.date)];
    return ds.length ? ds.reduce((a, b) => (a < b ? a : b)) : today();
  }, [workouts, food, body]);

  const { start, end } = windowRange(range, from, to, allStart);
  const buckets = useMemo(() => bucketize(start, end), [start, end]);

  const chart = useMemo(() => buckets.map((b) => {
    const ws = workouts.filter((w) => w.date >= b.start && w.date <= b.end);
    return { label: b.label, vol: round(ws.reduce((t, w) => t + sessionVolume(w), 0)) };
  }), [buckets, workouts]);

  const summary = useMemo(() => {
    const kg = bodyKgOf(body, settings.units);
    let vol = 0, sets = 0, wCount = 0, burned = 0, distMi = 0;
    workouts.forEach((w) => { if (w.date >= start && w.date <= end) { vol += sessionVolume(w); sets += sessionSets(w); wCount++; burned += workoutCalories(w, kg); distMi += cardioDistanceMi(w); } });
    let calSum = 0, pSum = 0, loggedDays = 0;
    for (let d = start; d <= end && d <= today(); d = addDays(d, 1)) {
      const day = food[d]; if (!day) continue;
      let c = 0, p = 0, has = false;
      MEALS.forEach((m) => (day[m] || []).forEach((it) => { c += it.cal * it.qty; p += it.p * it.qty; has = true; }));
      if (has) { calSum += c; pSum += p; loggedDays++; }
    }
    return { vol: round(vol), sets, wCount, burned: Math.round(burned), distMi, hasKg: !!kg, avgCal: loggedDays ? round(calSum / loggedDays) : 0, avgP: loggedDays ? round(pSum / loggedDays) : 0 };
  }, [start, end, workouts, food, body, settings.units]);

  const muscle = useMemo(() => {
    const acc = {}; GROUPS.forEach((g) => (acc[g] = { volume: 0, sets: 0, time: 0 }));
    workouts.filter((w) => w.date >= start && w.date <= end).forEach((w) => {
      const tot = sessionSets(w);
      const dur = w.duration || 0;
      w.exercises.forEach((ex) => {
        const g = MUSCLE_GROUP[ex.muscle];
        if (!g) return; // cardio / unmapped — not a strength muscle group
        const ls = loggedSets(ex.sets);
        acc[g].volume += ls.reduce((s, st) => s + Number(st.weight) * Number(st.reps), 0);
        acc[g].sets += ls.length;
        if (ex.seconds != null) acc[g].time += ex.seconds / 60;            // exact (new workouts)
        else acc[g].time += tot ? dur * (ls.length / tot) : 0;            // estimate (older workouts)
      });
    });
    return acc;
  }, [workouts, start, end]);

  const mRows = GROUPS.map((g) => ({ g, value: muscle[g][metric] })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const mTotal = mRows.reduce((t, r) => t + r.value, 0);
  const mMax = mRows.length ? mRows[0].value : 1;
  const regions = mRows.reduce((o, r) => { const reg = GROUP_REGION[r.g]; o[reg] = (o[reg] || 0) + r.value; return o; }, {});
  const fmt = (v) => metric === "volume" ? `${round(v).toLocaleString()} ${u}` : metric === "sets" ? `${round(v)} sets` : `${round(v)} min`;

  const streak = useMemo(() => {
    const dates = new Set(workouts.map((w) => w.date));
    let s = 0, cur = today();
    if (!dates.has(cur)) cur = addDays(cur, -1);
    while (dates.has(cur)) { s++; cur = addDays(cur, -1); }
    return s;
  }, [workouts]);

  const prs = useMemo(() => Object.entries(exHistory).map(([name, hist]) => ({
    name, max: round(Math.max(...hist.flatMap((h) => h.sets.map((s) => Number(s.weight))))), e1rm: round(Math.max(...hist.map((h) => h.est1rm))),
  })).sort((a, b) => b.e1rm - a.e1rm), [exHistory]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="pt-1 text-3xl font-bold" style={{ letterSpacing: "-0.5px" }}>Stats</h1>

      <Segmented value={range} onChange={setRange}
        options={[["day", "Day"], ["week", "Week"], ["month", "Month"], ["custom", "Custom"], ["all", "All"]]} />
      {range === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
          <span style={{ color: C.faint }}>→</span>
          <input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><Stat label="Workouts" value={summary.wCount} color={C.train1} /></Card>
        <Card className="p-4"><Stat label="Volume" value={summary.vol.toLocaleString()} unit={u} color={C.protein1} /></Card>
        {summary.distMi > 0 && <Card className="p-4"><Stat label="Cardio dist" value={summary.distMi.toFixed(1)} unit="mi" color={C.train1} /></Card>}
        {summary.hasKg && <Card className="p-4"><Stat label="Cal burned" value={summary.burned.toLocaleString()} unit="cal" color={C.energy1} /></Card>}
        <Card className="p-4"><Stat label="Avg cal/day" value={summary.avgCal ? summary.avgCal.toLocaleString() : "—"} unit={summary.avgCal ? "cal" : ""} color={C.energy1} /></Card>
        <Card className="p-4"><Stat label="Avg protein/day" value={summary.avgP || "—"} unit={summary.avgP ? "g" : ""} color={C.protein1} /></Card>
      </div>

      <Card className="p-4">
        <h3 className="mb-3 font-bold">Training volume</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chart} margin={{ top: 5, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.faint, fontSize: 10 }} axisLine={false} tickLine={false} interval={chart.length > 10 ? Math.ceil(chart.length / 8) : 0} />
            <YAxis tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: C.card2, border: "none", borderRadius: 12, color: C.text }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="vol" fill={C.train1} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <ExerciseProgressCard exHistory={exHistory} u={u} />

      {/* Muscle focus */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Muscle Focus</h3>
        </div>
        <Segmented value={metric} onChange={setMetric}
          options={[["volume", "Weight"], ["sets", "Sets"], ["time", "Time"]]} />

        <Body3D muscle={muscle} metric={metric} />
        <div className="mb-1 mt-1 flex items-center gap-2">
          <span className="text-xs" style={{ color: C.faint }}>Less</span>
          <div className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(90deg,#2A2E37,#3B82F6,#2DD4BF,#FACC15,#FF375F)" }} />
          <span className="text-xs" style={{ color: C.faint }}>More</span>
        </div>

        {mRows.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: C.sub }}>No training logged in this range.</p>
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              {["Upper Body", "Lower Body"].map((reg) => regions[reg] ? (
                <div key={reg} className="flex-1 rounded-xl p-2 text-center" style={{ background: C.card2 }}>
                  <p className="text-xs font-semibold" style={{ color: C.sub }}>{reg}</p>
                  <p className="font-bold" style={{ fontSize: 17 }}>{mTotal ? round((regions[reg] / mTotal) * 100) : 0}%</p>
                </div>
              ) : null)}
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {mRows.map((r) => (
                <div key={r.g}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold">{r.g} <span className="text-xs font-normal" style={{ color: C.faint }}>· {GROUP_REGION[r.g] === "Upper Body" ? "Upper" : "Lower"}</span></span>
                    <span className="text-sm font-bold" style={{ color: GROUP_COLOR[r.g] }}>{fmt(r.value)} <span style={{ color: C.faint }}>· {mTotal ? round((r.value / mTotal) * 100) : 0}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: C.card3 }}>
                    <div className="h-full rounded-full" style={{ width: `${(r.value / mMax) * 100}%`, background: GROUP_COLOR[r.g], transition: "width .5s" }} />
                  </div>
                </div>
              ))}
            </div>
            {metric === "time" && <p className="mt-2 text-xs" style={{ color: C.faint }}>Time is measured per exercise during workouts. Sessions logged before this feature are estimated from total duration.</p>}
          </>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2"><Flame size={18} color={C.energy1} /><Stat label="Day Streak" value={streak} color={C.energy1} /></div>
        </Card>
        <Card className="p-4"><Stat label="All-time workouts" value={workouts.length} /></Card>
      </div>

      <Card className="p-4">
        <div className="mb-1 flex items-center gap-2"><Trophy size={18} color={C.fat} /><h3 className="font-bold">Personal Records</h3></div>
        {prs.length === 0 && <p className="text-sm" style={{ color: C.sub }}>Log workouts to build your PR board.</p>}
        {prs.slice(0, 12).map((pr) => (
          <button key={pr.name} onClick={() => onOpenExercise(pr.name)}
            className="flex w-full items-center justify-between border-t py-2 text-left" style={{ borderColor: C.line }}>
            <span className="text-sm font-semibold">{pr.name}</span>
            <span className="text-sm"><span className="font-bold" style={{ color: C.energy1 }}>{pr.max} {u}</span> <span style={{ color: C.faint }}>· 1RM {pr.e1rm}</span></span>
          </button>
        ))}
      </Card>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-2xl p-1" style={{ background: C.card }}>
      {options.map(([val, label]) => {
        const on = value === val;
        return (
          <button key={val} onClick={() => onChange(val)}
            className="flex-1 rounded-xl py-2 text-sm font-bold"
            style={{ background: on ? C.card3 : "transparent", color: on ? C.text : C.sub }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   SHEETS
   ============================================================ */
function SettingsSheet({ settings, setSettings, onClose }) {
  const [s, setS] = useState(settings);
  const field = (key) => (v) => setS((p) => ({ ...p, [key]: v === "" ? "" : Number(v) }));
  const row = (label, key, suffix) => (
    <div className="flex items-center justify-between py-2.5">
      <span className="font-semibold" style={{ color: C.text }}>{label}</span>
      <div className="w-28"><NumField value={String(s[key])} onChange={field(key)} suffix={suffix} /></div>
    </div>
  );
  return (
    <Sheet title="Goals & Settings" onClose={onClose}>
      <div className="flex items-center justify-between py-2.5">
        <span className="font-semibold">Units</span>
        <div className="flex rounded-xl p-1" style={{ background: C.card2 }}>
          {["lb", "kg"].map((un) => (
            <button key={un} onClick={() => setS((p) => ({ ...p, units: un }))}
              className="rounded-lg px-4 py-1 text-sm font-bold"
              style={{ background: s.units === un ? C.train1 : "transparent", color: s.units === un ? "#001012" : C.sub }}>{un}</button>
          ))}
        </div>
      </div>
      <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>Daily nutrition</p>
      {row("Calories", "goalCalories", "cal")}
      {row("Protein", "goalProtein", "g")}
      {row("Carbs", "goalCarbs", "g")}
      {row("Fat", "goalFat", "g")}
      <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>Training & body</p>
      {row("Daily sets target", "goalSets", "sets")}
      {row("Goal weight", "goalWeight", s.units)}
      {row("Goal body fat", "goalBodyfat", "%")}

      <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>Workout</p>
      <button onClick={() => setS((p) => ({ ...p, keepAwake: !(p.keepAwake !== false) }))} className="flex w-full items-center justify-between py-2.5 text-left">
        <div className="pr-4">
          <p className="font-semibold" style={{ color: C.text }}>Keep screen awake</p>
          <p className="text-xs" style={{ color: C.sub }}>Holds the screen on during a workout so the rest timer stays visible.</p>
        </div>
        <div className="flex h-7 w-12 flex-shrink-0 items-center rounded-full px-0.5" style={{ background: s.keepAwake !== false ? C.train1 : C.card3, justifyContent: s.keepAwake !== false ? "flex-end" : "flex-start" }}>
          <div className="h-6 w-6 rounded-full" style={{ background: "#fff" }} />
        </div>
      </button>

      <button onClick={() => { setSettings(s); onClose(); }} className="mt-4 w-full rounded-2xl py-3.5 font-bold" style={{ background: C.protein1, color: "#06210A" }}>
        Save
      </button>
    </Sheet>
  );
}

/* ---------- Open Food Facts lookup ---------- */
function mapOFF(p) {
  const n = p.nutriments || {};
  const perServing = n["energy-kcal_serving"] != null;
  const pick = (base) => (perServing ? n[base + "_serving"] : n[base + "_100g"]);
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const cal = perServing ? n["energy-kcal_serving"] : (n["energy-kcal_100g"] ?? n["energy-kcal"]);
  const serving = perServing && p.serving_size ? p.serving_size : "100 g";
  const brand = p.brands ? ` (${p.brands.split(",")[0].trim()})` : "";
  return {
    name: ((p.product_name || "Product") + brand).slice(0, 48),
    serving,
    cal: round(num(cal)),
    p: round(num(pick("proteins")), 1),
    c: round(num(pick("carbohydrates")), 1),
    f: round(num(pick("fat")), 1),
    qty: 1,
  };
}
async function fetchOFF(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,serving_size,nutriments`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("net");
  const data = await res.json();
  if (data.status !== 1 || !data.product) throw new Error("notfound");
  return mapOFF(data.product);
}

function BarcodeScanner({ meal, onAdd, onBack }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | looking | error
  const [errMsg, setErrMsg] = useState("");
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [camMsg, setCamMsg] = useState("");
  const videoRef = useRef(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window
    && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const lookup = async (c) => {
    const v = (c || "").trim();
    if (!v) return;
    setStatus("looking"); setProduct(null); setErrMsg("");
    try { const item = await fetchOFF(v); setProduct({ ...item, barcode: v, source: "scan" }); setStatus("idle"); }
    catch (e) {
      setStatus("error");
      setErrMsg(e.message === "notfound"
        ? "No product found for that barcode. Try another, or add it as a custom food."
        : "Couldn't reach the food database. Check your connection, or add the food manually.");
    }
  };

  useEffect(() => {
    if (!scanning) return;
    let stream, raf, cancelled = false, detector;
    (async () => {
      try {
        detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const tick = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length) {
              cancelled = true;
              if (raf) cancelAnimationFrame(raf);
              if (stream) stream.getTracks().forEach((t) => t.stop());
              setScanning(false); setCode(codes[0].rawValue); lookup(codes[0].rawValue);
              return;
            }
          } catch { /* keep scanning */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setCamMsg("Camera isn't available in this view — type the barcode number below instead.");
        setScanning(false);
      }
    })();
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [scanning]);

  return (
    <div className="flex flex-col gap-3 pb-2">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.carb }}>
        <ArrowLeft size={16} /> Back to search
      </button>

      {/* Camera */}
      {scanning ? (
        <div className="relative overflow-hidden rounded-2xl" style={{ background: "#000" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: 220, objectFit: "cover" }} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div style={{ width: "70%", height: 90, border: `2px solid ${C.carb}`, borderRadius: 12, boxShadow: "0 0 0 999px rgba(0,0,0,0.35)" }} />
          </div>
          <button onClick={() => setScanning(false)} className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-bold" style={{ background: C.card }}>
            Stop
          </button>
        </div>
      ) : supported ? (
        <button onClick={() => { setCamMsg(""); setScanning(true); }} className="flex items-center justify-center gap-2 rounded-2xl py-3 font-bold" style={{ background: C.carb, color: "#1a1100" }}>
          <Camera size={18} /> Scan with camera
        </button>
      ) : (
        <p className="text-xs" style={{ color: C.sub }}>Live scanning isn't supported in this browser — enter the barcode number below.</p>
      )}
      {camMsg && <p className="text-xs" style={{ color: C.fat }}>{camMsg}</p>}

      {/* Manual entry */}
      <div className="flex items-center gap-2 rounded-xl px-3" style={{ background: C.card2 }}>
        <Barcode size={18} color={C.faint} />
        <input value={code} inputMode="numeric" onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Enter barcode number" className="w-full bg-transparent py-2.5 outline-none" style={{ color: C.text }} />
      </div>
      <button onClick={() => lookup(code)} disabled={!code} className="rounded-xl py-2.5 text-sm font-bold" style={{ background: C.card3, color: C.text, opacity: code ? 1 : 0.5 }}>
        Look up
      </button>

      {status === "looking" && (
        <div className="flex items-center justify-center gap-2 py-3" style={{ color: C.sub }}>
          <Loader size={16} className="animate-spin" /> Looking up product…
        </div>
      )}
      {status === "error" && <p className="text-sm" style={{ color: C.energy1 }}>{errMsg}</p>}

      {/* Result */}
      {product && (
        <Card className="p-4" style={{ background: C.card2 }}>
          <p className="font-bold">{product.name}</p>
          <p className="text-xs" style={{ color: C.sub }}>{product.serving} · {product.cal} cal · P{product.p} C{product.c} F{product.f}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setQty((q) => Math.max(0.5, round(q - 0.5, 1)))} className="h-7 w-7 rounded-full font-bold" style={{ background: C.card3, color: C.text }}>−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button onClick={() => setQty((q) => round(q + 0.5, 1))} className="h-7 w-7 rounded-full font-bold" style={{ background: C.card3, color: C.text }}>+</button>
              <span className="text-xs" style={{ color: C.sub }}>× serving</span>
            </div>
            <button onClick={() => onAdd({ ...product, qty })} className="rounded-full px-5 py-2 text-sm font-bold" style={{ background: C.carb, color: "#1a1100" }}>
              Add to {meal}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// Lazily load the Tesseract.js OCR engine from CDN (deployed app only; needs network).
function loadTesseract() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (window.__tessPromise) return window.__tessPromise;
  window.__tessPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.async = true;
    s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR load failed")));
    s.onerror = () => reject(new Error("OCR load failed"));
    document.head.appendChild(s);
  });
  return window.__tessPromise;
}
// Pull calories / macros / serving out of OCR'd nutrition-label text (line-based, no lookbehind).
function parseNutritionText(raw) {
  const lines = (raw || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const find = (pred) => lines.find(pred) || "";
  const firstNum = (s) => { const m = s.match(/(\d{1,4}(?:\.\d+)?)/); return m ? m[1] : ""; };
  const calLine = find((l) => /calorie/i.test(l));
  let cal = "";
  { const nums = calLine.match(/\d{1,4}/g) || []; cal = nums.length ? nums[nums.length - 1] : ""; }
  if (!cal) { const i = lines.findIndex((l) => /calorie/i.test(l)); if (i >= 0 && lines[i + 1]) cal = firstNum(lines[i + 1]); }
  const fatLine = find((l) => /total\s*fat/i.test(l)) || find((l) => /\bfat\b/i.test(l) && !/saturat|trans/i.test(l));
  const carbLine = find((l) => /carb/i.test(l));
  const protLine = find((l) => /protein/i.test(l));
  const servLine = find((l) => /serving\s*size/i.test(l));
  let serving = "";
  if (servLine) serving = servLine.replace(/.*serving\s*size[:\s]*/i, "").trim();
  const satFat = firstNum(find((l) => /sat/i.test(l) && /fat/i.test(l)));
  const fiber = firstNum(find((l) => /fib(er|re)/i.test(l)));
  const sugar = firstNum(find((l) => /sugar/i.test(l) && !/added/i.test(l)));
  const sodium = firstNum(find((l) => /sodium/i.test(l)));
  // best-effort product name: a wordy line that isn't part of the panel
  const skip = /nutrition|serving|amount|calorie|fat|cholesterol|sodium|carbohydrate|fiber|fibre|sugar|protein|vitamin|calcium|iron|potassium|daily value|per container|includes|added/i;
  const nameLine = lines.find((l) => /[a-z]/i.test(l) && l.replace(/[^a-z]/gi, "").length >= 4 && !skip.test(l) && !/^\d/.test(l));
  return { cal, f: firstNum(fatLine), c: firstNum(carbLine), p: firstNum(protLine), serving, satFat, fiber, sugar, sodium, name: nameLine ? nameLine.trim().slice(0, 40) : "" };
}

// Rotate + crop a label photo before OCR (touch/pointer; improves accuracy a lot).
function LabelCropper({ file, busy, onScan, onCancel }) {
  const wrapRef = useRef(null);
  const viewRef = useRef(null);
  const baseRef = useRef(null);
  const dragRef = useRef(null);
  const [img, setImg] = useState(null);
  const [rot, setRot] = useState(0);
  const [disp, setDisp] = useState({ w: 0, h: 0, scale: 1 });
  const [box, setBox] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!img) return;
    const swap = rot === 90 || rot === 270;
    const bw = swap ? img.naturalHeight : img.naturalWidth;
    const bh = swap ? img.naturalWidth : img.naturalHeight;
    const base = document.createElement("canvas");
    base.width = bw; base.height = bh;
    const ctx = base.getContext("2d");
    ctx.save();
    ctx.translate(bw / 2, bh / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    baseRef.current = base;
    const cw = (wrapRef.current && wrapRef.current.clientWidth) || 320;
    const maxH = 340;
    let scale = cw / bw;
    if (bh * scale > maxH) scale = maxH / bh;
    const w = Math.round(bw * scale), h = Math.round(bh * scale);
    setDisp({ w, h, scale });
    setBox({ x: Math.round(w * 0.08), y: Math.round(h * 0.08), w: Math.round(w * 0.84), h: Math.round(h * 0.84) });
  }, [img, rot]);

  useEffect(() => {
    if (!baseRef.current || !viewRef.current || !disp.w) return;
    const v = viewRef.current;
    v.width = disp.w; v.height = disp.h;
    v.getContext("2d").drawImage(baseRef.current, 0, 0, disp.w, disp.h);
  }, [disp]);

  const onDown = (mode) => (e) => {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { mode, sx: e.clientX, sy: e.clientY, box: { ...box } };
    const move = (ev) => {
      const d = dragRef.current; if (!d) return;
      const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
      let { x, y, w, h } = d.box; const min = 40;
      if (d.mode === "move") { x += dx; y += dy; }
      if (d.mode.includes("l")) { x += dx; w -= dx; }
      if (d.mode.includes("r")) { w += dx; }
      if (d.mode.includes("t")) { y += dy; h -= dy; }
      if (d.mode.includes("b")) { h += dy; }
      if (w < min) { if (d.mode.includes("l")) x = d.box.x + d.box.w - min; w = min; }
      if (h < min) { if (d.mode.includes("t")) y = d.box.y + d.box.h - min; h = min; }
      x = Math.max(0, Math.min(x, disp.w - w));
      y = Math.max(0, Math.min(y, disp.h - h));
      w = Math.min(w, disp.w - x); h = Math.min(h, disp.h - y);
      setBox({ x, y, w, h });
    };
    const up = () => { dragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const doScan = () => {
    const base = baseRef.current; if (!base || !box || busy) return;
    const sx = box.x / disp.scale, sy = box.y / disp.scale, sw = box.w / disp.scale, sh = box.h / disp.scale;
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(sw)); out.height = Math.max(1, Math.round(sh));
    out.getContext("2d").drawImage(base, sx, sy, sw, sh, 0, 0, out.width, out.height);
    out.toBlob((blob) => { if (blob) onScan(blob); }, "image/png");
  };

  const hPos = (m) => ({
    left: (m.includes("l") ? box.x : box.x + box.w) - 9,
    top: (m.includes("t") ? box.y : box.y + box.h) - 9,
  });

  return (
    <div className="flex flex-col gap-3 pb-2">
      <button onClick={onCancel} className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.carb }}>
        <ArrowLeft size={16} /> Back
      </button>
      <p className="text-sm" style={{ color: C.sub }}>Rotate if needed, then drag the corners to frame just the nutrition facts.</p>
      <div ref={wrapRef} className="relative mx-auto overflow-hidden rounded-xl" style={{ width: disp.w || "100%", height: disp.h || 200, background: C.card2, touchAction: "none" }}>
        <canvas ref={viewRef} className="block" style={{ width: disp.w, height: disp.h }} />
        {box && (
          <>
            <div onPointerDown={onDown("move")} className="absolute"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h, border: `2px solid ${C.carb}`, boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)", touchAction: "none", cursor: "move" }} />
            {["tl", "tr", "bl", "br"].map((m) => (
              <div key={m} onPointerDown={onDown(m)} className="absolute"
                style={{ ...hPos(m), width: 18, height: 18, background: C.carb, borderRadius: 5, touchAction: "none" }} />
            ))}
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRot((r) => (r + 270) % 360)} className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: C.card2 }} aria-label="Rotate left"><RotateCcw size={18} color={C.text} /></button>
        <button onClick={() => setRot((r) => (r + 90) % 360)} className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: C.card2 }} aria-label="Rotate right"><RotateCw size={18} color={C.text} /></button>
        <button onClick={doScan} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl font-bold" style={{ background: busy ? C.card2 : C.carb, color: busy ? C.sub : "#1a1100" }}>
          {busy ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />}{busy ? "Reading…" : "Scan crop"}
        </button>
      </div>
    </div>
  );
}

function AddFoodSheet({ meal, customFoods = [], meals = [], onClose, onAdd, onAddMeal, onNewMeal, onRemoveCached }) {
  const [mode, setMode] = useState("search"); // search | custom | barcode
  const [tab, setTab] = useState("foods");    // foods | meals
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState({ name: "", serving: "", cal: "", p: "", c: "", f: "", fiber: "", sugar: "", sodium: "" });
  const [ocr, setOcr] = useState({ busy: false, msg: "", err: "" });
  const [labelFile, setLabelFile] = useState(null);
  const runOcr = async (imgSource) => {
    if (!imgSource) return;
    setOcr({ busy: true, msg: "Reading the label… this can take a few seconds.", err: "" });
    try {
      const T = await loadTesseract();
      const { data } = await T.recognize(imgSource, "eng");
      const parsed = parseNutritionText(data && data.text);
      const got = parsed.cal || parsed.p || parsed.c || parsed.f;
      setCustom((p) => ({
        ...p,
        name: parsed.name || p.name,
        serving: parsed.serving || p.serving,
        cal: parsed.cal || p.cal, p: parsed.p || p.p, c: parsed.c || p.c, f: parsed.f || p.f,
        fiber: parsed.fiber || p.fiber, sugar: parsed.sugar || p.sugar, sodium: parsed.sodium || p.sodium,
      }));
      setOcr({ busy: false, msg: got ? "Filled in what I could read — double-check the values below." : "", err: got ? "" : "Couldn't read the values. Try re-cropping tighter, or type them in." });
    } catch {
      setOcr({ busy: false, msg: "", err: "Couldn't run the scanner (needs an internet connection). You can still enter values manually." });
    }
  };
  const ql = q.toLowerCase();
  const mine = customFoods.filter((f) => f.name.toLowerCase().includes(ql));
  const builtins = FOODS.filter((f) => f.name.toLowerCase().includes(ql));
  const myMeals = meals.filter((m) => m.name.toLowerCase().includes(ql));

  if (mode === "barcode") {
    return (
      <Sheet title={`Scan · ${meal}`} onClose={onClose} accent={C.carb}>
        <BarcodeScanner meal={meal} onAdd={onAdd} onBack={() => setMode("search")} />
      </Sheet>
    );
  }

  if (mode === "prep" && labelFile) {
    return (
      <Sheet title="Crop label" onClose={onClose} accent={C.carb}>
        <LabelCropper file={labelFile} busy={ocr.busy}
          onCancel={() => setMode("custom")}
          onScan={async (blob) => { await runOcr(blob); setMode("custom"); }} />
      </Sheet>
    );
  }

  if (mode === "custom") {
    const setF = (k) => (v) => setCustom((p) => ({ ...p, [k]: v }));
    return (
      <Sheet title="Custom food" onClose={onClose} accent={C.carb}>
        <div className="flex flex-col gap-2 pb-2">
          <button onClick={() => setMode("search")} className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.carb }}>
            <ArrowLeft size={16} /> Back to search
          </button>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 font-bold" style={{ background: ocr.busy ? C.card2 : C.carb, color: ocr.busy ? C.sub : "#1a1100" }}>
            {ocr.busy ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />}
            {ocr.busy ? "Reading label…" : "Scan nutrition label"}
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={ocr.busy}
              onChange={(e) => { const fl = e.target.files && e.target.files[0]; e.target.value = ""; if (fl) { setOcr({ busy: false, msg: "", err: "" }); setLabelFile(fl); setMode("prep"); } }} />
          </label>
          {ocr.msg && <p className="text-xs" style={{ color: C.sub }}>{ocr.msg}</p>}
          {ocr.err && <p className="text-xs font-semibold" style={{ color: C.energy1 }}>{ocr.err}</p>}
          <p className="text-center text-xs" style={{ color: C.faint }}>or enter the values manually</p>

          <input value={custom.name} onChange={(e) => setCustom((p) => ({ ...p, name: e.target.value }))} placeholder="Name"
            className="rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text }} />
          <input value={custom.serving} onChange={(e) => setCustom((p) => ({ ...p, serving: e.target.value }))} placeholder="Serving (e.g. 1 cup)"
            className="rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text }} />
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Calories"><NumField value={custom.cal} onChange={setF("cal")} suffix="cal" /></Labeled>
            <Labeled label="Protein"><NumField value={custom.p} onChange={setF("p")} suffix="g" /></Labeled>
            <Labeled label="Carbs"><NumField value={custom.c} onChange={setF("c")} suffix="g" /></Labeled>
            <Labeled label="Fat"><NumField value={custom.f} onChange={setF("f")} suffix="g" /></Labeled>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>More (optional)</p>
          <div className="grid grid-cols-3 gap-2">
            <Labeled label="Fiber"><NumField value={custom.fiber} onChange={setF("fiber")} suffix="g" /></Labeled>
            <Labeled label="Sugars"><NumField value={custom.sugar} onChange={setF("sugar")} suffix="g" /></Labeled>
            <Labeled label="Sodium"><NumField value={custom.sodium} onChange={setF("sodium")} suffix="mg" /></Labeled>
          </div>
          <button
            onClick={() => onAdd({ name: custom.name || "Food", serving: custom.serving || "1 serving",
              cal: Number(custom.cal) || 0, p: Number(custom.p) || 0, c: Number(custom.c) || 0, f: Number(custom.f) || 0,
              fiber: Number(custom.fiber) || 0, sugar: Number(custom.sugar) || 0, sodium: Number(custom.sodium) || 0,
              source: "custom", qty: 1 })}
            className="mt-2 rounded-2xl py-3.5 font-bold" style={{ background: C.carb, color: "#1a1100" }}>
            Add to {meal}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={`Add to ${meal}`} onClose={onClose} accent={C.carb}>
      <Segmented value={tab} onChange={setTab} options={[["foods", "Foods"], ["meals", "Meals"]]} />

      {tab === "meals" ? (
        <div className="mt-3 pb-2">
          <button onClick={onNewMeal} className="mb-2 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: C.card2, color: C.carb }}>
            <Plus size={15} /> New meal
          </button>
          {myMeals.length === 0 && <p className="py-4 text-center text-sm" style={{ color: C.sub }}>No saved meals yet. Build combos you eat often and add them in one tap.</p>}
          {myMeals.map((m) => {
            const t = mealTotals(m.items);
            return (
              <div key={m.id} className="flex items-center justify-between border-t py-2.5" style={{ borderColor: C.line }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="text-xs" style={{ color: C.sub }}>{m.items.length} items · {round(t.cal)} cal · P{round(t.p)} C{round(t.c)} F{round(t.f)}</p>
                </div>
                <button onClick={() => onAddMeal(m.items)} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: C.carb, color: "#1a1100" }}>
                  Add
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="sticky top-0 mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: C.card2 }}>
            <Search size={18} color={C.faint} />
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Search foods"
              className="w-full bg-transparent py-1 outline-none" style={{ color: C.text }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setMode("barcode")} className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: C.card2, color: C.carb }}>
              <Barcode size={15} /> Scan barcode
            </button>
            <button onClick={() => setMode("custom")} className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: C.card2, color: C.carb }}>
              <Camera size={14} /> Scan / custom
            </button>
          </div>
          <div className="mt-2 pb-2">
            {mine.length > 0 && (
              <>
                <p className="mb-1 mt-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>Your foods</p>
                {mine.map((f, i) => (
                  <FoodRow key={(f.barcode || f.name) + i} f={f} onAdd={(qty) => onAdd({ ...f, qty })}
                    onRemove={() => onRemoveCached(f)}
                    badge={<span title={f.source === "scan" ? "Scanned" : "Custom"}>{f.source === "scan" ? <Barcode size={12} color={C.faint} /> : <Pencil size={11} color={C.faint} />}</span>} />
                ))}
              </>
            )}
            {builtins.length > 0 && (
              <>
                {mine.length > 0 && <p className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>Suggestions</p>}
                {builtins.map((f) => <FoodRow key={f.name} f={f} onAdd={(qty) => onAdd({ ...f, qty })} />)}
              </>
            )}
            {mine.length === 0 && builtins.length === 0 && (
              <p className="py-4 text-center text-sm" style={{ color: C.sub }}>No matches. Scan a barcode or create a custom food above.</p>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

function FoodRow({ f, onAdd, onRemove, badge }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex items-center gap-2 border-t py-2.5" style={{ borderColor: C.line }}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-semibold">{f.name}{badge}</p>
        <p className="text-xs" style={{ color: C.sub }}>{f.serving} · {f.cal} cal · P{f.p} C{f.c} F{f.f}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => setQty((q) => Math.max(0.5, round(q - 0.5, 1)))} className="h-6 w-6 rounded-full font-bold" style={{ background: C.card3, color: C.text }}>−</button>
        <span className="w-6 text-center text-sm font-bold">{qty}</span>
        <button onClick={() => setQty((q) => round(q + 0.5, 1))} className="h-6 w-6 rounded-full font-bold" style={{ background: C.card3, color: C.text }}>+</button>
      </div>
      <button onClick={() => onAdd(qty)} className="rounded-full p-1.5" style={{ background: C.carb }}><Plus size={16} color="#1a1100" /></button>
      {onRemove && <button onClick={onRemove} className="p-0.5"><Trash2 size={14} color={C.faint} /></button>}
    </div>
  );
}

const Labeled = ({ label, children }) => (
  <div><p className="mb-1 text-xs font-semibold" style={{ color: C.sub }}>{label}</p>{children}</div>
);

function AddBodySheet({ u, last, onClose, onSave }) {
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState(last ? String(last.weight) : "");
  const [bf, setBf] = useState(last && last.bodyfat != null ? String(last.bodyfat) : "");
  return (
    <Sheet title="Log measurement" onClose={onClose} accent={C.energy1}>
      <div className="flex flex-col gap-3 pb-2">
        <Labeled label="Date">
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text, colorScheme: "dark" }} />
        </Labeled>
        <Labeled label={`Weight (${u})`}><NumField value={weight} onChange={setWeight} suffix={u} placeholder="0" /></Labeled>
        <Labeled label="Body Fat % (optional)"><NumField value={bf} onChange={setBf} suffix="%" placeholder="0" /></Labeled>
        <button
          onClick={() => { if (!weight) return; onSave({ date, weight: Number(weight), bodyfat: bf === "" ? null : Number(bf) }); }}
          className="mt-2 rounded-2xl py-3.5 font-bold" style={{ background: C.energy1, color: "#fff", opacity: weight ? 1 : 0.5 }}>
          Save
        </button>
      </div>
    </Sheet>
  );
}

// Inline "create a new exercise" form, used in the exercise picker and routine builder.
function CreateExerciseRow({ query, onCreate, accent = C.train1 }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("Chest");
  useEffect(() => { if (open) setName(query || ""); }, [open]); // eslint-disable-line
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: C.card2, color: accent }}>
        <Plus size={15} /> Create new exercise
      </button>
    );
  }
  const add = () => { const n = name.trim(); if (!n) return; onCreate({ name: n, muscle }); setOpen(false); setName(""); };
  return (
    <div className="mt-2 rounded-xl p-3" style={{ background: C.card2 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Exercise name"
        className="mb-2 w-full rounded-lg px-3 py-2 font-semibold outline-none" style={{ background: C.card3, color: C.text }} />
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        {MUSCLES.map((m) => (
          <button key={m} onClick={() => setMuscle(m)} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: muscle === m ? accent : C.card3, color: muscle === m ? "#001012" : C.sub }}>{m}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setOpen(false); setName(""); }} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: C.card3, color: C.sub }}>Cancel</button>
        <button onClick={add} disabled={!name.trim()} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: accent, color: "#001012", opacity: name.trim() ? 1 : 0.5 }}>Add exercise</button>
      </div>
    </div>
  );
}

function ExercisePickerSheet({ exercises = EXERCISES, onClose, onPick, onCreate, onDelete }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("All");
  const list = exercises.filter((e) =>
    (muscle === "All" || e.muscle === muscle) && e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet title="Add exercise" onClose={onClose} accent={C.train1}>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: C.card2 }}>
        <Search size={18} color={C.faint} />
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Search exercises"
          className="w-full bg-transparent py-1 outline-none" style={{ color: C.text }} />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {["All", ...MUSCLES].map((m) => (
          <button key={m} onClick={() => setMuscle(m)} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{ background: muscle === m ? C.train1 : C.card2, color: muscle === m ? "#001012" : C.sub }}>{m}</button>
        ))}
      </div>
      {onCreate && <CreateExerciseRow query={q} onCreate={(ex) => { const e = onCreate(ex); onPick(e || ex); }} />}
      <div className="mt-2 pb-2">
        {list.map((e) => (
          <div key={e.name} className="flex items-center border-t" style={{ borderColor: C.line }}>
            <button onClick={() => onPick(e)} className="flex flex-1 items-center justify-between py-2.5 text-left">
              <span className="font-semibold">{e.name}{e.custom && <span className="ml-2 rounded px-1.5 py-0.5 font-bold" style={{ background: C.card3, color: C.faint, fontSize: 10 }}>CUSTOM</span>}</span>
              <span className="text-xs font-medium" style={{ color: C.faint }}>{e.muscle}</span>
            </button>
            {e.custom && onDelete && (
              <button onClick={() => onDelete(e.name)} className="pl-3 pr-1" aria-label="Delete exercise"><Trash2 size={15} color={C.faint} /></button>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="py-4 text-center text-sm" style={{ color: C.sub }}>No matches. Use “Create new exercise” above to add it.</p>}
      </div>
    </Sheet>
  );
}

function RoutineBuilderSheet({ initial, exercises = EXERCISES, onCreate, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [picked, setPicked] = useState(initial?.exercises ? initial.exercises.map((e) => ({ ...e })) : []);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("All");
  const colors = [C.energy1, C.train1, C.protein1, C.carb, C.fat];
  const [color, setColor] = useState(initial?.color || colors[0]);
  const list = exercises.filter((e) =>
    (muscle === "All" || e.muscle === muscle) && e.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (e) => setPicked((p) => p.find((x) => x.name === e.name) ? p.filter((x) => x.name !== e.name) : [...p, { ...e, targetSets: 4, targetReps: 8 }]);

  return (
    <Sheet title={initial ? "Edit routine" : "New routine"} onClose={onClose} accent={C.train1}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Routine name"
        className="mb-3 w-full rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text }} />
      <div className="mb-3 flex gap-2">
        {colors.map((c) => (
          <button key={c} onClick={() => setColor(c)} className="h-8 w-8 rounded-full" style={{ background: c, outline: color === c ? `2px solid ${C.text}` : "none", outlineOffset: 2 }} />
        ))}
      </div>

      {picked.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>In this routine ({picked.length}) · swipe to remove</p>
          <div className="flex flex-col gap-1.5">
            {picked.map((e) => (
              <SwipeRow key={e.name} radius={12} surface={C.card2} onDelete={() => setPicked((p) => p.filter((x) => x.name !== e.name))}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm font-semibold">{e.name}</span>
                  <span className="text-xs font-semibold" style={{ color: C.sub }}>{e.muscle}</span>
                </div>
              </SwipeRow>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: C.card2 }}>
        <Search size={18} color={C.faint} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises"
          className="w-full bg-transparent py-1 outline-none" style={{ color: C.text }} />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {["All", ...MUSCLES].map((m) => (
          <button key={m} onClick={() => setMuscle(m)} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{ background: muscle === m ? C.train1 : C.card2, color: muscle === m ? "#001012" : C.sub }}>{m}</button>
        ))}
      </div>
      {onCreate && <CreateExerciseRow query={q} onCreate={(ex) => { const e = onCreate(ex); toggle(e || ex); }} />}
      <div className="mt-2 max-h-60 overflow-y-auto">
        {list.map((e) => {
          const on = picked.find((x) => x.name === e.name);
          return (
            <button key={e.name} onClick={() => toggle(e)} className="flex w-full items-center justify-between border-t py-2.5 text-left" style={{ borderColor: C.line }}>
              <span className="font-semibold" style={{ color: on ? C.train1 : C.text }}>{e.name}{e.custom && <span className="ml-2 rounded px-1.5 py-0.5 font-bold" style={{ background: C.card3, color: C.faint, fontSize: 10 }}>CUSTOM</span>}</span>
              {on ? <Check size={18} color={C.train1} /> : <Plus size={16} color={C.faint} />}
            </button>
          );
        })}
      </div>
      <button disabled={!picked.length}
        onClick={() => onSave({ id: "r-" + Date.now(), name: name || "My Routine", color, exercises: picked })}
        className="mt-3 w-full rounded-2xl py-3.5 font-bold" style={{ background: C.train1, color: "#001012", opacity: picked.length ? 1 : 0.4 }}>
        Save routine ({picked.length})
      </button>
    </Sheet>
  );
}

/* ============================================================
   PROGRAM CARD + builders / library
   ============================================================ */
function ProgramCard({ program, routines, isActive, onStartRoutine, onSetActive, onEdit, onDelete }) {
  const rName = (id) => routines.find((r) => r.id === id)?.name;
  const rColor = (id) => routines.find((r) => r.id === id)?.color || C.train1;
  const todayId = program.schedule[todayWday()];
  const assignedCount = WDAYS.filter((d) => program.schedule[d]).length;
  return (
    <Card className="p-4" style={isActive ? { outline: `1.5px solid ${C.train1}` } : undefined}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Layers size={18} color={C.train1} />
          <p className="truncate font-bold">{program.name}</p>
          {isActive && <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: "rgba(0,240,200,0.15)", color: C.train1, fontSize: 10 }}>ACTIVE</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onSetActive} title="Set active" className="p-1.5"><Star size={15} color={isActive ? C.train1 : C.faint} fill={isActive ? C.train1 : "none"} /></button>
          <button onClick={onEdit} className="p-1.5"><Pencil size={15} color={C.faint} /></button>
          <button onClick={onDelete} className="p-1.5"><Trash2 size={15} color={C.faint} /></button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {WDAYS.map((d) => {
          const id = program.schedule[d];
          const assigned = !!id;
          const isToday = d === todayWday();
          return (
            <button key={d} disabled={!assigned} onClick={() => assigned && onStartRoutine(id)} title={assigned ? rName(id) : "Rest"}
              className="flex-1 rounded-lg py-1.5 text-center"
              style={{ background: assigned ? rColor(id) : C.card2, color: assigned ? "#001012" : C.faint, outline: isToday ? `2px solid ${C.text}` : "none", outlineOffset: 1, opacity: assigned ? 1 : 0.6 }}>
              <span className="text-xs font-bold">{d[0]}</span>
            </button>
          );
        })}
      </div>
      {assignedCount === 0
        ? <p className="mt-2 text-xs" style={{ color: C.sub }}>No routines assigned yet — tap edit to build the week.</p>
        : <p className="mt-2 text-xs" style={{ color: C.sub }}>Tap a colored day to start that routine.</p>}
      {todayId && (
        <button onClick={() => onStartRoutine(todayId)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: C.train1, color: "#001012" }}>
          <Play size={15} /> Start today · {rName(todayId)}
        </button>
      )}
    </Card>
  );
}

function LibrarySheet({ customFoods, meals, onClose, onEditFood, onDeleteFood, onNewMeal, onEditMeal, onDeleteMeal }) {
  const [tab, setTab] = useState("foods");
  return (
    <Sheet title="My Library" onClose={onClose} accent={C.carb}>
      <Segmented value={tab} onChange={setTab} options={[["foods", "Foods"], ["meals", "Meals"]]} />
      {tab === "foods" ? (
        <div className="mt-3 pb-2">
          {customFoods.length === 0 && <p className="py-4 text-center text-sm" style={{ color: C.sub }}>No saved foods yet. Scan a barcode or create a custom food to build your list.</p>}
          {customFoods.map((f, i) => (
            <SwipeRow key={(f.barcode || f.name) + i} radius={12} onDelete={() => onDeleteFood(f)}>
              <div className="flex items-center gap-1 py-2.5" style={i ? { borderTop: `1px solid ${C.line}` } : undefined}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.name}</p>
                  <p className="text-xs" style={{ color: C.sub }}>{f.serving} · {f.cal} cal · P{f.p} C{f.c} F{f.f}</p>
                </div>
                <button onClick={() => onEditFood(f)} className="p-1.5"><Pencil size={15} color={C.faint} /></button>
              </div>
            </SwipeRow>
          ))}
        </div>
      ) : (
        <div className="mt-3 pb-2">
          <button onClick={onNewMeal} className="mb-2 flex w-full items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: C.card2, color: C.carb }}>
            <Plus size={15} /> New meal
          </button>
          {meals.length === 0 && <p className="py-4 text-center text-sm" style={{ color: C.sub }}>No meals yet. Combine foods into reusable meals you can add in one tap.</p>}
          {meals.map((m, i) => {
            const t = mealTotals(m.items);
            return (
              <SwipeRow key={m.id} radius={12} onDelete={() => onDeleteMeal(m.id)}>
                <div className="flex items-center gap-1 py-2.5" style={i ? { borderTop: `1px solid ${C.line}` } : undefined}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-xs" style={{ color: C.sub }}>{m.items.length} items · {round(t.cal)} cal · P{round(t.p)} C{round(t.c)} F{round(t.f)}</p>
                  </div>
                  <button onClick={() => onEditMeal(m)} className="p-1.5"><Pencil size={15} color={C.faint} /></button>
                </div>
              </SwipeRow>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

function MealBuilderSheet({ initial, customFoods = [], onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [items, setItems] = useState(initial?.items ? initial.items.map((it) => ({ ...it })) : []);
  const [q, setQ] = useState("");
  const ql = q.toLowerCase();
  const pool = [...customFoods, ...FOODS].filter((f) => f.name.toLowerCase().includes(ql));
  const t = mealTotals(items);
  const addItem = (f) => setItems((p) => [...p, { ...f, qty: 1 }]);
  const setQty = (i, qty) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, qty } : it)));
  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i));
  return (
    <Sheet title={initial?.id ? "Edit meal" : "New meal"} onClose={onClose} accent={C.carb}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name (e.g. Chicken & Rice)"
        className="mb-2 w-full rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text }} />
      {items.length > 0 && (
        <div className="mb-2 rounded-2xl p-2" style={{ background: C.card2 }}>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{it.name}</p>
                <p className="text-xs" style={{ color: C.sub }}>{round(it.cal * it.qty)} cal · P{round(it.p * it.qty)} C{round(it.c * it.qty)} F{round(it.f * it.qty)}</p>
              </div>
              <button onClick={() => setQty(i, Math.max(0.5, round(it.qty - 0.5, 1)))} className="h-6 w-6 rounded-full font-bold" style={{ background: C.card3, color: C.text }}>−</button>
              <span className="w-6 text-center text-sm font-bold">{it.qty}</span>
              <button onClick={() => setQty(i, round(it.qty + 0.5, 1))} className="h-6 w-6 rounded-full font-bold" style={{ background: C.card3, color: C.text }}>+</button>
              <button onClick={() => removeItem(i)} className="p-0.5"><X size={14} color={C.faint} /></button>
            </div>
          ))}
          <div className="mt-1 border-t pt-1 text-right text-xs font-bold" style={{ borderColor: C.line, color: C.carb }}>
            Total {round(t.cal)} cal · P{round(t.p)} C{round(t.c)} F{round(t.f)}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: C.card2 }}>
        <Search size={18} color={C.faint} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add foods to this meal"
          className="w-full bg-transparent py-1 outline-none" style={{ color: C.text }} />
      </div>
      <div className="mt-2 overflow-y-auto" style={{ maxHeight: 208 }}>
        {pool.slice(0, 40).map((f, i) => (
          <button key={(f.barcode || f.name) + i} onClick={() => addItem(f)} className="flex w-full items-center justify-between border-t py-2 text-left" style={{ borderColor: C.line }}>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{f.name}</p><p className="text-xs" style={{ color: C.sub }}>{f.serving} · {f.cal} cal</p></div>
            <Plus size={16} color={C.carb} />
          </button>
        ))}
      </div>
      <button disabled={!items.length} onClick={() => onSave({ name: name || "My Meal", items })}
        className="mt-3 w-full rounded-2xl py-3.5 font-bold" style={{ background: C.carb, color: "#1a1100", opacity: items.length ? 1 : 0.4 }}>
        Save meal ({items.length})
      </button>
    </Sheet>
  );
}

function FoodEditorSheet({ food, onClose, onSave }) {
  const [d, setD] = useState({ name: food.name, serving: food.serving, cal: String(food.cal), p: String(food.p), c: String(food.c), f: String(food.f) });
  const setF = (k) => (v) => setD((p) => ({ ...p, [k]: v }));
  return (
    <Sheet title="Edit food" onClose={onClose} accent={C.carb}>
      <div className="flex flex-col gap-2 pb-2">
        <input value={d.name} onChange={(e) => setD((p) => ({ ...p, name: e.target.value }))} placeholder="Name"
          className="rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text }} />
        <input value={d.serving} onChange={(e) => setD((p) => ({ ...p, serving: e.target.value }))} placeholder="Serving"
          className="rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text }} />
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Calories"><NumField value={d.cal} onChange={setF("cal")} suffix="cal" /></Labeled>
          <Labeled label="Protein"><NumField value={d.p} onChange={setF("p")} suffix="g" /></Labeled>
          <Labeled label="Carbs"><NumField value={d.c} onChange={setF("c")} suffix="g" /></Labeled>
          <Labeled label="Fat"><NumField value={d.f} onChange={setF("f")} suffix="g" /></Labeled>
        </div>
        <button onClick={() => onSave({ name: d.name || "Food", serving: d.serving || "1 serving", cal: Number(d.cal) || 0, p: Number(d.p) || 0, c: Number(d.c) || 0, f: Number(d.f) || 0 })}
          className="mt-2 rounded-2xl py-3.5 font-bold" style={{ background: C.carb, color: "#1a1100" }}>
          Save changes
        </button>
      </div>
    </Sheet>
  );
}

function ProgramBuilderSheet({ initial, routines, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [schedule, setSchedule] = useState(() => ({ ...emptySchedule(), ...(initial?.schedule || {}) }));
  const setDay = (d, id) => setSchedule((p) => ({ ...p, [d]: id }));
  return (
    <Sheet title={initial ? "Edit program" : "New program"} onClose={onClose} accent={C.train1}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Program name (e.g. Bulking Dual Rotation)"
        className="mb-3 w-full rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ background: C.card2, color: C.text }} />
      {routines.length === 0 && <p className="text-sm" style={{ color: C.sub }}>Create some routines first, then assign them to days here.</p>}
      <div className="flex flex-col gap-3 pb-2">
        {WDAYS.map((d) => (
          <div key={d}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: C.sub }}>{WDAY_LONG[d]}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setDay(d, null)} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold"
                style={{ background: schedule[d] == null ? C.card3 : C.card2, color: schedule[d] == null ? C.text : C.faint }}>Rest</button>
              {routines.map((r) => (
                <button key={r.id} onClick={() => setDay(d, r.id)} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold"
                  style={{ background: schedule[d] === r.id ? (r.color || C.train1) : C.card2, color: schedule[d] === r.id ? "#001012" : C.sub }}>{r.name}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onSave({ name: name || "My Program", schedule })}
        className="mt-2 w-full rounded-2xl py-3.5 font-bold" style={{ background: C.train1, color: "#001012" }}>
        Save program
      </button>
    </Sheet>
  );
}

function ThisWeekCard({ program, routines, workouts, startRoutineById }) {
  const monday = mondayOf(today());
  const rName = (id) => routines.find((r) => r.id === id)?.name;
  const days = WDAYS.map((wd, i) => {
    const date = addDays(monday, i);
    const id = program.schedule[wd];
    return { wd, date, id, routine: id ? rName(id) : null, done: workouts.some((w) => w.date === date), isToday: date === today(), isPast: date < today() };
  });
  const scheduled = days.filter((d) => d.id);
  const doneCount = scheduled.filter((d) => d.done).length;
  const pct = scheduled.length ? (doneCount / scheduled.length) * 100 : 0;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Calendar size={18} color={C.train1} />
          <h3 className="truncate font-bold">This Week <span className="font-normal" style={{ color: C.sub }}>· {program.name}</span></h3>
        </div>
        <span className="whitespace-nowrap text-sm font-bold" style={{ color: C.train1 }}>{doneCount}/{scheduled.length} done</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full" style={{ background: C.card3 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.train1, transition: "width .5s" }} />
      </div>
      <div className="flex flex-col gap-1">
        {days.map((d) => (
          <div key={d.wd} className="flex items-center gap-3 rounded-xl px-2 py-1.5" style={{ background: d.isToday ? C.card2 : "transparent" }}>
            <span className="w-9 text-xs font-bold" style={{ color: d.isToday ? C.train1 : C.sub }}>{d.wd}</span>
            <span className="flex-1 truncate text-sm font-semibold" style={{ color: d.id ? C.text : C.faint }}>{d.routine || "Rest"}</span>
            {d.id ? (
              d.done ? (
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: C.protein1 }}><Check size={15} strokeWidth={3} /> Done</span>
              ) : d.isToday ? (
                <button onClick={() => startRoutineById(d.id)} className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: C.train1, color: "#001012" }}>Start</button>
              ) : d.isPast ? (
                <span className="text-xs font-semibold" style={{ color: C.energy1 }}>Missed</span>
              ) : (
                <span className="text-xs font-semibold" style={{ color: C.faint }}>Upcoming</span>
              )
            ) : (
              d.done ? <Check size={14} strokeWidth={3} color={C.protein1} /> : <span className="text-xs" style={{ color: C.faint }}>—</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   3D BODY HEATMAP (three.js, r128-safe primitives + manual drag)
   ============================================================ */
function heatColor(v) {
  const stops = [
    [0.0, [42, 46, 55]], [0.22, [59, 130, 246]], [0.48, [45, 212, 191]],
    [0.72, [250, 204, 21]], [1.0, [255, 55, 95]],
  ];
  v = Math.max(0, Math.min(1, v));
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i][0] && v <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const t = b[0] === a[0] ? 0 : (v - a[0]) / (b[0] - a[0]);
  return a[1].map((ch, i) => Math.round(ch + (b[1][i] - ch) * t));
}

function Body3D({ muscle, metric }) {
  const mountRef = useRef(null);
  const matsRef = useRef({});
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, rotY: 0.35, rotX: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 320, height = 360;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.3); camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.4); rim.position.set(-4, 1, -3); scene.add(rim);

    const body = new THREE.Group();
    const mats = {};
    const geos = [];
    const neutral = () => new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.7, metalness: 0.05 });
    const grpMat = (g) => { const m = new THREE.MeshStandardMaterial({ color: 0x2a2e37, roughness: 0.55, metalness: 0.08 }); (mats[g] = mats[g] || []).push(m); return m; };
    const add = (geo, mat, x, y, z, rz) => { geos.push(geo); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rz) m.rotation.z = rz; body.add(m); return m; };
    const S = (r) => new THREE.SphereGeometry(r, 24, 18);
    const Cy = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 22);
    const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);

    add(S(0.42), neutral(), 0, 1.98, 0);                 // head
    add(Cy(0.16, 0.18, 0.26), neutral(), 0, 1.64, 0);    // neck
    add(S(0.30), grpMat("Shoulders"), -0.74, 1.36, 0);
    add(S(0.30), grpMat("Shoulders"), 0.74, 1.36, 0);
    add(Bx(1.18, 0.62, 0.34), grpMat("Chest"), 0, 1.16, 0.16);
    add(Bx(1.18, 0.62, 0.32), grpMat("Back"), 0, 1.16, -0.17);
    add(Bx(0.98, 0.74, 0.30), grpMat("Abs"), 0, 0.52, 0.16);
    add(Bx(0.98, 0.74, 0.28), grpMat("Back"), 0, 0.52, -0.15);
    add(Bx(0.98, 0.42, 0.52), neutral(), 0, 0.06, 0);    // pelvis
    [-1, 1].forEach((s) => {
      add(Cy(0.17, 0.19, 0.95), grpMat("Arms"), s * 0.95, 0.86, 0, s * 0.06);
      add(Cy(0.14, 0.16, 0.82), grpMat("Arms"), s * 1.02, -0.02, 0, s * 0.04);
      add(S(0.16), neutral(), s * 1.06, -0.5, 0);
    });
    [-1, 1].forEach((s) => {
      add(Cy(0.27, 0.30, 1.15), grpMat("Legs"), s * 0.32, -0.62, 0);
      add(Cy(0.18, 0.25, 0.98), grpMat("Legs"), s * 0.32, -1.72, 0);
      add(Bx(0.3, 0.18, 0.62), neutral(), s * 0.32, -2.3, 0.14);
    });

    scene.add(body);
    matsRef.current = mats;

    let raf;
    const animate = () => {
      const dr = dragRef.current;
      if (!dr.dragging) dr.rotY += 0.005;
      body.rotation.y = dr.rotY; body.rotation.x = dr.rotX;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => { const w = mount.clientWidth || width; renderer.setSize(w, height); camera.aspect = w / height; camera.updateProjectionMatrix(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geos.forEach((g) => g.dispose());
      Object.values(mats).flat().forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const mats = matsRef.current; if (!mats) return;
    const vals = GROUPS.map((g) => muscle[g]?.[metric] || 0);
    const max = Math.max(...vals, 1);
    GROUPS.forEach((g) => {
      const [r, gr, b] = heatColor((muscle[g]?.[metric] || 0) / max);
      (mats[g] || []).forEach((m) => m.color.setRGB(r / 255, gr / 255, b / 255));
    });
  }, [muscle, metric]);

  const down = (e) => { const dr = dragRef.current; dr.dragging = true; dr.lastX = e.clientX; dr.lastY = e.clientY; };
  const move = (e) => {
    const dr = dragRef.current; if (!dr.dragging) return;
    dr.rotY += (e.clientX - dr.lastX) * 0.01;
    dr.rotX = Math.max(-0.6, Math.min(0.6, dr.rotX + (e.clientY - dr.lastY) * 0.008));
    dr.lastX = e.clientX; dr.lastY = e.clientY;
  };
  const up = () => { dragRef.current.dragging = false; };

  return (
    <div className="relative">
      <div ref={mountRef} style={{ width: "100%", height: 360, touchAction: "none", cursor: "grab" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <span className="absolute left-1 text-xs" style={{ bottom: 4, color: C.faint }}>drag to rotate · front = chest/abs, back = back</span>
    </div>
  );
}
