// Clean up data when a tab is closed
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.local.remove("productlist_" + tabId, function () {
    console.log(
      `Cleaned up data for tab ${tabId} - ${JSON.stringify(removeInfo)}`
    );
  });
});

// Periodically clean up expired data
setInterval(function () {
  chrome.storage.local.get(null, function (items) {
    let now = Date.now();
    for (let key in items) {
      if (items[key].expiration && items[key].expiration < now) {
        chrome.storage.local.remove(key, function () {
          console.log("Removed expired data:", key);
        });
      }
    }
  });
}, 5 * 60 * 1000); // Run cleanup every 5 minute

// This listener update chrome storage via callback function and update the popup as well with new item
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(
    `request.action - ${request.action} -> ${JSON.stringify(sender)}`
  );
  if (
    request.action === "tab_process_udpate" ||
    request.action === "add_list_product" ||
    request.action === "add_single_product"
  ) {
    console.log("executing callback");
    const tabId = sender.tab.id;
    sendResponse({ tabId });
    chrome.runtime.sendMessage({ action: "refresh_popup" }, () => {});
  }
  return true; // Indicate that we will respond asynchronously
});
