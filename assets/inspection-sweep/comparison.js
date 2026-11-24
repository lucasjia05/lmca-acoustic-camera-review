(() => {
  const root = document.getElementById("experiment-benchmark");
  const picker = root?.querySelector(".curve-picker");
  if (!picker) return;
  const boxes = [...picker.querySelectorAll('input[type="checkbox"]')];
  const allBoxes = [...root.querySelectorAll(".curve-picker input")];
  function redraw(updateUrl = true) {
    const selected = new Set(boxes.filter(box => box.checked).map(box => box.value));
    for (const group of root.querySelectorAll("[data-curve]"))
      group.style.display = selected.has(group.dataset.curve) ? "" : "none";
    for (const row of root.querySelectorAll("[data-result]"))
      row.hidden = !selected.has(row.dataset.result);
    allBoxes.forEach(box => { box.checked = selected.has(box.value); });
    if (updateUrl) {
      const url = new URL(location.href);
      if (selected.size === boxes.length) url.searchParams.delete("compare");
      else url.searchParams.set("compare", [...selected].join(","));
      history.replaceState(history.state, "", url);
    }
    root.querySelectorAll("[data-empty-selection]").forEach(note => { note.hidden = selected.size > 0; });
  }
  root.addEventListener("change", event => {
    if (!event.target.matches(".curve-picker input")) return;
    boxes.find(box => box.value === event.target.value).checked = event.target.checked;
    redraw();
  });
  if (document.fullscreenEnabled) {
    for (const button of root.querySelectorAll("[data-enlarge-plot]")) {
      const figure = button.closest("figure");
      const toggle = () => document.fullscreenElement ? document.exitFullscreen() : figure.requestFullscreen();
      button.hidden = false;
      button.addEventListener("click", toggle);
      figure.querySelector("svg").addEventListener("click", toggle);
      document.addEventListener("fullscreenchange", () => {
        button.textContent = document.fullscreenElement === figure ? "Exit enlarged view" : "Enlarge plot";
      });
    }
  }
  const shared = new URL(location.href).searchParams.get("compare");
  if (shared !== null) {
    const keys = new Set(shared.split(","));
    if (!shared || boxes.some(box => keys.has(box.value)))
      boxes.forEach(box => { box.checked = keys.has(box.value); });
  }
  redraw(false);
})();
