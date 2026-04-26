(() => {
  const STORAGE_KEY = "simple-alarm.alarms.v1";

  const clockEl = document.getElementById("clock");
  const timeInput = document.getElementById("time-input");
  const addBtn = document.getElementById("add-btn");
  const listEl = document.getElementById("alarm-list");
  const emptyMsg = document.getElementById("empty-msg");
  const ringingEl = document.getElementById("ringing");
  const ringingTimeEl = document.getElementById("ringing-time");
  const stopBtn = document.getElementById("stop-btn");

  let alarms = loadAlarms();
  let lastFiredKey = null;
  let audioCtx = null;
  let oscillator = null;
  let gainNode = null;
  let beepInterval = null;

  function loadAlarms() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (a) => typeof a?.id === "string" && /^\d{2}:\d{2}$/.test(a?.time),
      );
    } catch {
      return [];
    }
  }

  function saveAlarms() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  }

  function pad(n) {
    return n.toString().padStart(2, "0");
  }

  function updateClock() {
    const now = new Date();
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    clockEl.textContent = `${hh}:${mm}:${ss}`;

    const key = `${hh}:${mm}`;
    const secondKey = `${key}:${ss}`;
    if (ss === "00" && secondKey !== lastFiredKey) {
      const due = alarms.find((a) => a.enabled && a.time === key);
      if (due) {
        lastFiredKey = secondKey;
        triggerAlarm(due);
      }
    }
  }

  function render() {
    listEl.innerHTML = "";
    if (alarms.length === 0) {
      emptyMsg.classList.remove("hidden");
    } else {
      emptyMsg.classList.add("hidden");
    }

    const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
    for (const alarm of sorted) {
      const li = document.createElement("li");
      li.className = "alarm-item" + (alarm.enabled ? "" : " off");

      const timeSpan = document.createElement("span");
      timeSpan.className = "alarm-time";
      timeSpan.textContent = alarm.time;

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "toggle";
      toggleLabel.setAttribute("aria-label", "アラームの有効/無効");

      const toggleInput = document.createElement("input");
      toggleInput.type = "checkbox";
      toggleInput.checked = alarm.enabled;
      toggleInput.addEventListener("change", () => {
        alarm.enabled = toggleInput.checked;
        saveAlarms();
        render();
      });

      const slider = document.createElement("span");
      slider.className = "toggle-slider";

      toggleLabel.append(toggleInput, slider);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-btn";
      deleteBtn.setAttribute("aria-label", "削除");
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", () => {
        alarms = alarms.filter((a) => a.id !== alarm.id);
        saveAlarms();
        render();
      });

      li.append(timeSpan, toggleLabel, deleteBtn);
      listEl.appendChild(li);
    }
  }

  function addAlarm() {
    const value = timeInput.value;
    if (!/^\d{2}:\d{2}$/.test(value)) {
      timeInput.focus();
      return;
    }
    if (alarms.some((a) => a.time === value)) {
      timeInput.value = "";
      return;
    }
    alarms.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      time: value,
      enabled: true,
    });
    saveAlarms();
    render();
    timeInput.value = "";
  }

  function startBeep() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.0001;
      gainNode.connect(audioCtx.destination);

      oscillator = audioCtx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      oscillator.connect(gainNode);
      oscillator.start();

      const beepOn = () => {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(t);
        gainNode.gain.setValueAtTime(0.0001, t);
        gainNode.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      };
      beepOn();
      beepInterval = setInterval(beepOn, 800);
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  }

  function stopBeep() {
    if (beepInterval) {
      clearInterval(beepInterval);
      beepInterval = null;
    }
    if (oscillator) {
      try { oscillator.stop(); } catch {}
      oscillator.disconnect();
      oscillator = null;
    }
    if (gainNode) { gainNode.disconnect(); gainNode = null; }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  }

  function triggerAlarm(alarm) {
    ringingTimeEl.textContent = alarm.time;
    ringingEl.classList.remove("hidden");
    startBeep();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("アラーム", { body: alarm.time });
      } catch {}
    }
  }

  function dismissAlarm() {
    ringingEl.classList.add("hidden");
    stopBeep();
  }

  addBtn.addEventListener("click", addAlarm);
  timeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addAlarm();
  });
  stopBtn.addEventListener("click", dismissAlarm);

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }

  render();
  updateClock();
  setInterval(updateClock, 1000);
})();
