const timer = document.getElementById("timer");
const status = document.getElementById("status");
const workTimeInput = document.getElementById("workTime");
const breakTimeInput = document.getElementById("breakTime");
const toggleBtn = document.getElementById("toggleBtn");
const resetBtn = document.getElementById("resetBtn");
const timerContainer = document.getElementById("timer-container");
const deleteDataBtn = document.getElementById("deleteDataBtn");

let intervalId = null;
let timeLeft;
let isWorking = true;
let isPaused = true;
let expandedDates = new Set();
let startTime;
let endTime;

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
  if (!status.value.trim()) {
    status.value = isWorking ? "Arbeidstid" : "Pause";
  }
  document.body.style.backgroundColor = isWorking ? "#FF5C5C" : "#ADD8E6";
}

function initializeTimer() {
  timeLeft = isWorking
    ? parseInt(workTimeInput.value, 10) * 60
    : parseInt(breakTimeInput.value, 10) * 60;
  updateDisplay();
}

function startTimer() {
  if (isPaused) {
    isPaused = false;
    startTime = Date.now();
    endTime = startTime + timeLeft * 1000;
    intervalId = setInterval(() => {
      updateTimeLeft();
      if (timeLeft > 0) {
        updateDisplay();
      } else {
        clearInterval(intervalId);
        cycleCompleted();
        initializeTimer();
        startTime = Date.now();
        endTime = startTime + timeLeft * 1000;
      }
    }, 1000);
    toggleBtn.textContent = "Pause";
    toggleBtn.classList.add("pause-state");
  } else {
    pauseTimer();
  }
}

function pauseTimer() {
  if (!isPaused) {
    clearInterval(intervalId);
    isPaused = true;
    updateTimeLeft();
    toggleBtn.textContent = "Fortsett";
    toggleBtn.classList.remove("pause-state");
  }
}

function resetTimer() {
  clearInterval(intervalId);
  isPaused = true;
  isWorking = true;
  toggleBtn.textContent = "Start";
  toggleBtn.classList.remove("pause-state");
  initializeTimer();
}

function cycleCompleted() {
  const duration =
    (isWorking
      ? parseInt(workTimeInput.value, 10)
      : parseInt(breakTimeInput.value, 10)) * 60;
  const completedAt = Date.now();
  saveCycle(completedAt, duration, isWorking);

  clearInterval(intervalId); // Ensure the current interval is cleared
  isWorking = !isWorking; // Toggle the state before initializing the next timer
  initializeTimer(); // Set the new timeLeft based on the toggled state
  startTime = Date.now();
  endTime = startTime + timeLeft * 1000;

  intervalId = setInterval(() => {
    updateTimeLeft();
    if (timeLeft > 0) {
      updateDisplay();
    } else {
      clearInterval(intervalId);
      cycleCompleted();
    }
  }, 1000);

  toggleBtn.textContent = isWorking ? "Pause" : "Fortsett";
  toggleBtn.classList.toggle("pause-state", !isWorking);

  displayCycles();
}

function saveCycle(completedAt, duration, isWorking) {
  const cycles = JSON.parse(localStorage.getItem("cycles") || "[]");
  const task = status.value.trim() || "Arbeidstid"; // Default if no task specified
  cycles.push({ completedAt, duration, isWorking, task });
  localStorage.setItem("cycles", JSON.stringify(cycles));
}

function deleteCycle(completedAt) {
  const cycles = JSON.parse(localStorage.getItem("cycles") || "[]");
  const updatedCycles = cycles.filter(
    (cycle) => cycle.completedAt !== completedAt
  );
  localStorage.setItem("cycles", JSON.stringify(updatedCycles));
  displayCycles();
}

function displayCycles() {
  const cycles = JSON.parse(localStorage.getItem("cycles") || "[]");
  const historyList = document.getElementById("history-list");
  const previousExpandedDates = new Set(expandedDates);
  historyList.innerHTML = "";
  expandedDates.clear();

  if (cycles.length === 0) {
    const noCyclesMessage = document.createElement("li");
    noCyclesMessage.textContent = "Ingen sykluser fullført ennå.";
    historyList.appendChild(noCyclesMessage);
    return;
  }

  // Sort cycles with newest first
  cycles.sort((a, b) => b.completedAt - a.completedAt);

  const todayString = new Date().toLocaleDateString();
  const todayCycles = [];
  const olderCycles = {};

  cycles.forEach((cycle) => {
    if (cycle.isWorking) {
      const cycleDate = new Date(cycle.completedAt);
      const dateString = cycleDate.toLocaleDateString();

      if (dateString === todayString) {
        todayCycles.push(cycle);
      } else {
        if (!olderCycles[dateString]) olderCycles[dateString] = [];
        olderCycles[dateString].push(cycle);
      }
    }
  });

  // Calculate total work minutes for today
  const totalWorkMinutesToday = todayCycles.reduce(
    (total, cycle) => total + Math.floor(cycle.duration / 60),
    0
  );

  // Display 'I dag' cycles
  if (todayCycles.length > 0) {
    const todayItem = document.createElement("li");
    todayItem.classList.add("date-header");
    // Restore expanded state if it was previously expanded
    if (previousExpandedDates.has("today")) {
      todayItem.classList.add("expanded");
      expandedDates.add("today");
    }

    todayItem.textContent = `I dag - Totalt: ${totalWorkMinutesToday} min`;

    todayItem.addEventListener("click", () => {
      todayItem.classList.toggle("expanded");
      if (todayItem.classList.contains("expanded")) {
        expandedDates.add("today");
      } else {
        expandedDates.delete("today");
      }
    });

    const todayList = document.createElement("ul");

    todayCycles.forEach((cycle, index) => {
      const cycleItem = document.createElement("li");
      cycleItem.style.setProperty("--item-index", index);
      const time = new Date(cycle.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const minutes = Math.floor(cycle.duration / 60);
      cycleItem.innerHTML = `${time} - ${
        cycle.task || "Ukjent oppgave"
      } (${minutes} min)
        <button class="delete-cycle-btn" onclick="deleteCycle(${
          cycle.completedAt
        })">X</button>`;
      todayList.appendChild(cycleItem);
    });

    historyList.appendChild(todayItem);
    historyList.appendChild(todayList);
  }

  // Display 'Tidligere' cycles in a collapsible section
  if (Object.keys(olderCycles).length > 0) {
    const olderItem = document.createElement("li");
    olderItem.classList.add("date-header");
    olderItem.textContent = "Tidligere";

    // Restore expanded state if it was previously expanded
    if (previousExpandedDates.has("Older")) {
      olderItem.classList.add("expanded");
      expandedDates.add("Older");
    }

    olderItem.addEventListener("click", () => {
      olderItem.classList.toggle("expanded");
      if (olderItem.classList.contains("expanded")) {
        expandedDates.add("Older");
      } else {
        expandedDates.delete("Older");
      }
    });

    const olderListContainer = document.createElement("div");
    olderListContainer.classList.add("older-list-container");

    // Get dates sorted, newest first
    const dates = Object.keys(olderCycles).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB - dateA;
    });

    dates.forEach((date) => {
      // Calculate total work minutes for the date
      const totalWorkMinutes = olderCycles[date].reduce(
        (total, cycle) => total + Math.floor(cycle.duration / 60),
        0
      );

      const dateObj = new Date(date);
      const weekday = dateObj.toLocaleDateString(undefined, {
        weekday: "long",
      });
      const dateText = `${weekday}, ${date} - Totalt: ${totalWorkMinutes} min`;

      const dateItem = document.createElement("li");
      dateItem.classList.add("date-header");

      // Restore expanded state if it was previously expanded
      if (previousExpandedDates.has(date)) {
        dateItem.classList.add("expanded");
        expandedDates.add(date);
      }

      dateItem.textContent = dateText;

      dateItem.addEventListener("click", () => {
        dateItem.classList.toggle("expanded");
        if (dateItem.classList.contains("expanded")) {
          expandedDates.add(date);
        } else {
          expandedDates.delete(date);
        }
      });

      const cycleList = document.createElement("ul");

      olderCycles[date].forEach((cycle, index) => {
        const cycleItem = document.createElement("li");
        cycleItem.style.setProperty("--item-index", index);
        const time = new Date(cycle.completedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const minutes = Math.floor(cycle.duration / 60);
        cycleItem.innerHTML = `${time} - ${
          cycle.task || "Ukjent oppgave"
        } (${minutes} min)
          <button class="delete-cycle-btn" onclick="deleteCycle(${
            cycle.completedAt
          })">X</button>`;
        cycleList.appendChild(cycleItem);
      });

      olderListContainer.appendChild(dateItem);
      olderListContainer.appendChild(cycleList);
    });

    historyList.appendChild(olderItem);
    historyList.appendChild(olderListContainer);
  }
}

// Call displayCycles() on page load
document.addEventListener("DOMContentLoaded", () => {
  displayCycles();
  initializeTimer();
});

toggleBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", resetTimer);

workTimeInput.addEventListener("change", () => {
  if (isPaused && isWorking) {
    timeLeft = parseInt(workTimeInput.value, 10) * 60;
    updateDisplay();
  }
});

breakTimeInput.addEventListener("change", () => {
  if (isPaused && !isWorking) {
    timeLeft = parseInt(breakTimeInput.value, 10) * 60;
    updateDisplay();
  }
});

let hideTimeout;
document.addEventListener("mousemove", () => {
  if (!intervalId) return;
  timerContainer.classList.remove("hidden");
  deleteDataBtn.classList.remove("hidden");
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    timerContainer.classList.add("hidden");
    deleteDataBtn.classList.add("hidden");
  }, 3000);
});

deleteDataBtn.addEventListener("click", () => {
  if (confirm("Er du sikker på at du vil slette alle data?")) {
    localStorage.removeItem("cycles");
    displayCycles();
  }
});

updateDisplay();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then((registration) => {
      console.log("Service Worker registrert med omfang:", registration.scope);
    })
    .catch((error) => {
      console.log("Service Worker registrering mislyktes:", error);
    });
}

function updateTimeLeft() {
  timeLeft = Math.ceil((endTime - Date.now()) / 1000);
}
