;(function () {
  // The palette is fixed by design: always the dark "Elhadry" theme.
  var background = "#151517"

  document.documentElement.dataset.theme = "oc-2"
  document.documentElement.dataset.colorScheme = "dark"
  document.documentElement.style.backgroundColor = background

  // Update theme-color meta tag to match app color scheme
  var metas = document.querySelectorAll("meta[name='theme-color']")
  if (metas.length > 0) metas[0].setAttribute("content", background)
})()
