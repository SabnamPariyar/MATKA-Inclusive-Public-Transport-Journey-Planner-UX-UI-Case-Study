(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const from = $("#from");
  const to = $("#to");
  const departure = $("#departure");
  const accessible = $("#accessible");
  const routesContainer = $("#route-results");
  const savedRoutes = new Set();
  let selectedLine = "B7";

  const destinations = {
    "University of Oulu": { time: 18, brief: "University", points: ["City Centre", "Tuira", "University"] },
    "Oulu University Hospital": { time: 14, brief: "Hospital", points: ["City Centre", "Raksila", "Hospital"] },
    "Nallikari Beach": { time: 21, brief: "Nallikari", points: ["City Centre", "Hietasaari", "Nallikari"] },
    "Railway Station": { time: 8, brief: "Railway Station", points: ["City Centre", "Market Square", "Station"] },
    "Oulu City Centre": { time: 12, brief: "City Centre", points: ["Start", "Tuira", "City Centre"] },
    "Tuira": { time: 10, brief: "Tuira", points: ["City Centre", "Bridge", "Tuira"] }
  };

  const variants = [
    { line: "B7", name: "Direct connection", offset: 0, transfers: 0, stepFree: true, comfort: "Easy boarding", status: "RECOMMENDED", description: "A direct, straightforward choice with clear boarding and arrival guidance." },
    { line: "6", name: "Via interchange", offset: 5, transfers: 1, stepFree: false, comfort: "Short walk", status: "ALTERNATIVE", description: "An alternative connection with one easy-to-follow interchange." },
    { line: "18", name: "Relaxed journey", offset: 11, transfers: 0, stepFree: true, comfort: "More time", status: "STEP-FREE", description: "More time to travel, fewer decisions along the way." }
  ];

  const mapPaths = [
    "M110 219 C160 214 166 120 264 125 S417 181 490 120 S585 110 627 76",
    "M110 219 L173 174 L274 174 L360 208 L474 142 L550 142 L627 76",
    "M110 219 C158 272 256 257 324 210 C398 154 450 195 505 145 S589 81 627 76"
  ];

  function currentRoutes() {
    return accessible.checked ? variants.filter((route) => route.stepFree) : variants;
  }

  function activeRoute() {
    return currentRoutes().find((route) => route.line === selectedLine) || currentRoutes()[0];
  }

  function durationFor(route) {
    const base = (destinations[to.value] || destinations["University of Oulu"]).time;
    const originOffset = from.value === "Oulu City Centre" ? 0 : 3;
    return base + route.offset + originOffset;
  }

  function departureLabel() {
    return departure.value === "morning" ? "08:00" : departure.value === "evening" ? "18:00" : "Now";
  }

  function ensureOption(select, value) {
    if (!Array.from(select.options).some((option) => option.value === value)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.add(option);
    }
  }

  function renderRoutes() {
    const routes = currentRoutes();
    if (!routes.some((route) => route.line === selectedLine)) selectedLine = routes[0].line;
    $("#result-subtitle").textContent = from.value + " → " + to.value + " · " + departureLabel();
    $("#result-count").textContent = routes.length + (routes.length === 1 ? " OPTION" : " OPTIONS");
    routesContainer.innerHTML = "";

    routes.forEach((route) => {
      const selected = selectedLine === route.line;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "route-option" + (selected ? " selected" : "");
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", "Select route " + route.line + ", " + durationFor(route) + " minutes, " + (route.transfers ? "one transfer" : "direct"));

      const head = document.createElement("div");
      head.className = "route-option-head";
      head.innerHTML = '<div><span class="route-id">' + route.line + '</span><span class="route-name">' + route.name + '</span></div><div class="route-duration">' + durationFor(route) + ' min</div>';

      const foot = document.createElement("div");
      foot.className = "route-option-foot";
      const badges = document.createElement("div");
      badges.className = "route-highlights";
      const firstBadge = document.createElement("span");
      firstBadge.textContent = route.transfers === 0 ? "Direct" : "1 transfer";
      badges.appendChild(firstBadge);
      const secondBadge = document.createElement("span");
      secondBadge.textContent = route.stepFree ? "♿ Step-free" : "Transfer";
      badges.appendChild(secondBadge);
      foot.appendChild(badges);
      const status = document.createElement("strong");
      status.textContent = route.status;
      foot.appendChild(status);
      button.append(head, foot);
      button.addEventListener("click", () => {
        selectedLine = route.line;
        renderRoutes();
      });
      routesContainer.appendChild(button);
    });
    updateDetails();
  }

  function updateDetails() {
    const route = activeRoute();
    $("#detail-title").textContent = "Route " + route.line + " · " + durationFor(route) + " min";
    $("#detail-description").textContent = route.description;
    $("#map-route-label").textContent = from.value.replace("Oulu ", "") + " → " + (destinations[to.value]?.brief || to.value);
    const path = mapPaths[variants.findIndex((r) => r.line === route.line)];
    $("#map-route-path").setAttribute("d", path);
    $("#map-route-dash").setAttribute("d", path);
    const stops = destinations[to.value]?.points || destinations["University of Oulu"].points;
    const stopsContainer = $("#detail-stops");
    stopsContainer.innerHTML = "";
    stops.forEach((stop, index) => {
      if (index !== 0) {
        const connector = document.createElement("span");
        connector.className = "stop-connector";
        connector.setAttribute("aria-hidden", "true");
        stopsContainer.appendChild(connector);
      }
      const el = document.createElement("span");
      el.className = "detail-stop";
      const dot = document.createElement("span");
      dot.setAttribute("aria-hidden", "true");
      el.appendChild(dot);
      el.appendChild(document.createTextNode(stop));
      stopsContainer.appendChild(el);
    });
    const key = favoriteKey();
    const isSaved = savedRoutes.has(key);
    const save = $("#save-route");
    save.textContent = (isSaved ? "♥ Saved" : "♡ Save route");
    save.classList.toggle("saved", isSaved);
    save.setAttribute("aria-pressed", String(isSaved));
  }

  function favoriteKey() {
    return from.value + "|" + to.value + "|" + activeRoute().line;
  }

  function switchView(id) {
    if (!document.getElementById(id)) return;
    $$(".view").forEach((view) => view.classList.toggle("active-view", view.id === id));
    $$(".nav-link").forEach((button) => {
      const on = button.dataset.view === id;
      button.classList.toggle("active", on);
      if (on) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    $("#topbar-current").textContent = id === "prototype" ? "Interactive prototype" : id === "case-study" ? "Case study" : "Design system";
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $$("[data-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    switchView("prototype");
  });
  $("#hero-plan").addEventListener("click", () => $("#planner").scrollIntoView({ behavior: "smooth", block: "start" }));
  $("#journey-form").addEventListener("submit", (event) => {
    event.preventDefault();
    renderRoutes();
    $("#results-title").focus?.();
    document.querySelector(".results-card").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#swap-route").addEventListener("click", () => {
    const origin = from.value;
    const destination = to.value;
    ensureOption(from, destination);
    ensureOption(to, origin);
    from.value = destination;
    to.value = origin;
    renderRoutes();
  });
  accessible.addEventListener("change", renderRoutes);
  [from, to, departure].forEach((input) => input.addEventListener("change", renderRoutes));
  $("#save-route").addEventListener("click", () => {
    const key = favoriteKey();
    if (savedRoutes.has(key)) savedRoutes.delete(key);
    else savedRoutes.add(key);
    updateDetails();
  });
  $("#system-demo-button").addEventListener("click", () => {
    $("#system-feedback").textContent = "✓ Action selected. Buttons use clear labels and visible state feedback.";
    $("#system-feedback").style.color = "#2c7154";
  });
  renderRoutes();
  if (["#prototype", "#case-study", "#design-system"].includes(window.location.hash)) switchView(window.location.hash.slice(1));
})();
