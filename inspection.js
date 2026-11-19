(() => {
  const directory = "assets/inspection-study/";
  const get = id => document.getElementById(id);
  const experimentButtons = Array.from(document.querySelectorAll("[data-experiment]"));
  const architectureButtons = Array.from(document.querySelectorAll("[data-arch-view]"));
  const query = () => new URLSearchParams(location.search);

  function choose(buttons, active) {
    const selected = active || buttons[0];
    for (const button of buttons) {
      const on = button === selected;
      button.setAttribute("aria-pressed", String(on));
      get(button.getAttribute("aria-controls")).hidden = !on;
    }
  }

  function sync() {
    const params = query();
    choose(experimentButtons, experimentButtons.find(b => b.dataset.experiment === params.get("study")));
    choose(architectureButtons, architectureButtons.find(b => b.dataset.archView === params.get("view")));
  }

  function navigate(section, key, value) {
    const url = new URL(location.href);
    url.hash = section;
    url.searchParams.set(key, value);
    history.pushState(null, "", url);
    get("tab-" + section).click();
    sync();
  }
  experimentButtons.forEach(b => b.addEventListener("click", () => navigate("experiments", "study", b.dataset.experiment)));
  architectureButtons.forEach(b => b.addEventListener("click", () => navigate("architecture", "view", b.dataset.archView)));
  document.querySelectorAll("[data-arch-link]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault(); navigate("architecture", "view", "savings"); get("tab-architecture").focus();
  }));
  document.querySelectorAll("[data-study-link]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault(); navigate("experiments", "study", a.dataset.studyTarget || "map-quality");
    const target = get(a.dataset.studyAnchor || "experiment-map-quality");
    const details = target?.closest("details");
    if (details) details.open = true;
    target?.scrollIntoView({block:"start"});
  }));
  document.querySelectorAll("[data-parameter-link]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault(); get("tab-parameters").click();
    const row = get(a.dataset.parameterLink);
    if (row) { row.open = true; row.scrollIntoView({block:"start"}); }
  }));
  window.addEventListener("popstate", () => {
    get("tab-" + location.hash.slice(1))?.click(); sync();
  });
  function updateGate() {
    const choice = get("gate-choice").selectedOptions[0];
    const src = directory + "gates-" + choice.value + ".svg";
    get("gate-chart").src = src; get("gate-chart").alt = choice.text + ". " + choice.dataset.caption;
    get("gate-full").href = src; get("gate-caption").textContent = choice.dataset.caption;
  }
  function updateMaps() {
    const choice = get("map-choice").selectedOptions[0];
    document.querySelectorAll("[data-map-design]").forEach(link => {
      const src = directory + "map-" + choice.value + "-" + link.dataset.mapDesign + ".svg";
      link.href = src; link.firstElementChild.src = src;
      link.firstElementChild.alt = choice.text + ", " + link.dataset.label;
    });
    get("scene-caption").textContent = choice.dataset.caption;
  }
  get("gate-choice").addEventListener("change", updateGate);
  get("map-choice").addEventListener("change", updateMaps);
  sync(); updateGate(); updateMaps();
})();
