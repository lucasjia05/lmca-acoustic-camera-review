(() => {
  const root = document.getElementById("experiment-benchmark");
  const picker = root?.querySelector(".curve-picker");
  if (!picker) return;
  const boxes = [...picker.querySelectorAll('input[type="checkbox"]')];
  const select = picker.querySelector("select");
  function redraw(updateUrl = true) {
    const selected = new Set(boxes.filter(box => box.checked).map(box => box.value));
    for (const group of root.querySelectorAll("[data-curve]"))
      group.style.display = selected.has(group.dataset.curve) ? "" : "none";
    for (const row of root.querySelectorAll("[data-result]"))
      row.hidden = !selected.has(row.dataset.result);
    select.value = [...select.options].find(option => {
      const keys = option.value.split(" ");
      return keys.length === selected.size && keys.every(key => selected.has(key));
    })?.value || "custom";
    if (updateUrl) {
      const url = new URL(location.href);
      if (select.selectedOptions[0]?.defaultSelected) url.searchParams.delete("compare");
      else url.searchParams.set("compare", [...selected].join(","));
      history.replaceState(history.state, "", url);
    }
    root.querySelector("[data-empty-selection]").hidden = selected.size > 0;
  }
  select.addEventListener("change", () => {
    if (select.value === "custom") return;
    const keys = new Set(select.value.split(" "));
    boxes.forEach(box => { box.checked = keys.has(box.value); });
    redraw();
  });
  picker.addEventListener("change", event => { if (event.target.matches("input")) redraw(); });
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
