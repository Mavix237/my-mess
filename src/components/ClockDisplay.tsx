import { useEffect, useState } from "react";
import styles from "./ClockDisplay.module.css";

function formatNow(date: Date) {
  const day = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    date,
  );
  const dateStr = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return { day, dateStr, time, iso: date.toISOString() };
}

export function ClockDisplay() {
  const [now, setNow] = useState(() => formatNow(new Date()));

  useEffect(() => {
    const tick = () => setNow(formatNow(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time className={styles.clock} dateTime={now.iso}>
      <span className={styles.day}>{now.day}</span>
      <span className={styles.meta}>
        {now.dateStr}
        <span className={styles.sep} aria-hidden>
          {" "}
          ·{" "}
        </span>
        {now.time}
      </span>
    </time>
  );
}
