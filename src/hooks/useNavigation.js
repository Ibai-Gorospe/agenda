import { useState, useEffect, useCallback, useMemo } from "react";
import { todayStr, getWeekStart, dateAdd, pad, formatWeekRange } from "../helpers";
import { useSwipeNav } from "./useSwipeNav";
import { CalendarDays, CalendarRange, Calendar, LayoutGrid, Scale } from "lucide-react";

export function useNavigation() {
  const today = todayStr();
  const [activeView, setActiveView] = useState(() => localStorage.getItem("agenda-activeView") || "day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));

  useEffect(() => { localStorage.setItem("agenda-activeView", activeView); }, [activeView]);

  const prevMonth = useCallback(() => {
    calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);
  }, [calMonth]);

  const prevWeek = useCallback(() => {
    const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() - 7);
    setWeekStart(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, [weekStart]);

  const nextWeek = useCallback(() => {
    const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() + 7);
    setWeekStart(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, [weekStart]);

  const goToThisWeek = useCallback(() => setWeekStart(getWeekStart(todayStr())), []);
  const isThisWeek = weekStart === getWeekStart(todayStr());

  const swipeHandlers = useSwipeNav({
    onSwipeLeft: () => activeView === "day" && setSelectedDate(prev => dateAdd(prev, 1)),
    onSwipeRight: () => activeView === "day" && setSelectedDate(prev => dateAdd(prev, -1)),
  });

  const navItems = useMemo(() => [
    { key: "day", icon: CalendarDays, label: "Hoy" },
    { key: "week", icon: CalendarRange, label: "Semana" },
    { key: "month", icon: Calendar, label: "Mes" },
    { key: "year", icon: LayoutGrid, label: "Año" },
    { key: "weight", icon: Scale, label: "Peso" },
  ], []);

  return {
    today, activeView, setActiveView, selectedDate, setSelectedDate,
    calMonth, setCalMonth, calYear, weekStart, setWeekStart,
    prevMonth, nextMonth, prevWeek, nextWeek,
    goToThisWeek, isThisWeek,
    swipeHandlers, navItems,
    formatWeekRange: () => formatWeekRange(weekStart),
  };
}
