chrome.commands.onCommand.addListener((command) => {
  if (command !== "focus-app-filter") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const id = tabs[0]?.id;
    if (id == null) return;
    chrome.tabs.sendMessage(id, { type: "softr-ext-focus-filter" }).catch(() => {});
  });
});
