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
        isWorking = !isWorking;
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

function deleteCycle(index) {
  const cycles = JSON.parse(localStorage.getItem("cycles") || "[]");
  cycles.splice(index, 1);
  localStorage.setItem("cycles", JSON.stringify(cycles));
  displayCycles();
}

function displayCycles() {
  const cycles = JSON.parse(localStorage.getItem("cycles") || "[]");
  const historyList = document.getElementById("history-list");
  const previousExpandedDates = new Set(expandedDates); // Store current state
  historyList.innerHTML = "";

  if (cycles.length === 0) {
    const noCyclesMessage = document.createElement("li");
    noCyclesMessage.textContent = "Ingen sykluser fullført ennå.";
    historyList.appendChild(noCyclesMessage);
    expandedDates.clear();
    return;
  }

  const today = new Date().toLocaleDateString();
  const cyclesByDate = {};
  cycles.forEach((cycle, index) => {
    if (cycle.isWorking) {
      const date = new Date(cycle.completedAt).toLocaleDateString();
      if (!cyclesByDate[date]) cyclesByDate[date] = [];
      cyclesByDate[date].push({ ...cycle, index });
    }
  });

  for (const date in cyclesByDate) {
    const dateItem = document.createElement("li");
    dateItem.classList.add("date-header");
    const dateObj = new Date(date);
    const weekday = dateObj.toLocaleDateString(undefined, { weekday: "long" });
    const totalWorkMinutes = cyclesByDate[date].reduce(
      (total, cycle) => total + Math.floor(cycle.duration / 60),
      0
    );
    const dateText = date === today ? "I dag" : `${weekday}, ${date}`;
    dateItem.textContent = `${dateText} - Totalt: ${totalWorkMinutes} min`;

    // Restore expanded state if it was previously expanded
    if (previousExpandedDates.has(date)) {
      dateItem.classList.add("expanded");
      expandedDates.add(date);
    }

    dateItem.addEventListener("click", () => {
      dateItem.classList.toggle("expanded");
      if (dateItem.classList.contains("expanded")) {
        expandedDates.add(date);
      } else {
        expandedDates.delete(date);
      }
    });

    const cycleList = document.createElement("ul");
    cyclesByDate[date].forEach((cycle, index) => {
      const cycleItem = document.createElement("li");
      cycleItem.style.setProperty("--item-index", index); // Add this line
      const time = new Date(cycle.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const minutes = Math.floor(cycle.duration / 60);
      cycleItem.innerHTML = `${time} - ${
        cycle.task || "Ukjent oppgave"
      } (${minutes} min) <button class="delete-cycle-btn" onclick="deleteCycle(${
        cycle.index
      })">X</button>`;
      cycleList.appendChild(cycleItem);
    });

    historyList.appendChild(dateItem);
    historyList.appendChild(cycleList);
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
