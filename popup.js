import { getCurrentTabId, round } from "./utils.js";
let shouldRefreshPopup = true;

document.addEventListener("DOMContentLoaded", function () {
  // Get the current active tab ID
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    const activeTabUrl = activeTab.url;
    console.log(`activeTabUrl = ${activeTabUrl}`);
    let tabId = tabs[0].id;
    // console.log(`popup.js tabId - ${tabId}`);
    if (
      activeTabUrl.includes("eedistribution.com/hitlist") ||
      activeTabUrl.includes("eedistribution.com/prodinfo")
    ) {
      document.getElementById("eedist-container").hidden = false;
      // Retrieve the productlist associated with the current tab ID
      processProductsFor(tabId);
    } else {
      document.getElementById("eedist-container").hidden = true;
      // console.log("Analyser not enabled");
    }
  });
});

// Adding dashboard redirection
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("popup-dashboard-btn")
    .addEventListener("click", () => {
      // console.log("open new window");
      window.open("../dashboard/index.html", "_blank");
    });
});

async function processProductsFor(tabId) {
  console.log(`loading popup for tab - ${tabId}`);
  chrome.storage.local.get("productlist_" + tabId, function (result) {
    let data = result["productlist_" + tabId];
    if (data && data.productlist) {
      console.log(`productlist length - ${data.productlist.length}`);
      displayProducts(
        data.productlist,
        data.productCount,
        tabId,
        data.analysisDone
      );
    } else {
      console.log("No valid data found for this tab.");
    }
  });
}

async function displayProducts(
  productlist,
  productCount,
  tabId,
  isAnalysisDone
) {
  let currentTabId = await getCurrentTabId();
  if (tabId != currentTabId) {
    console.log(
      `Ignoring entry as tab ids not equal - ${tabId} != ${currentTabId}`
    );
    return;
  }
  let percent = 0;
  if (productCount && productCount > 0) {
    percent = await round((productlist.length * 100) / productCount);
  }
  console.log(
    `productlist.length - ${productlist.length}, productCount : ${productCount}`
  );
  if (isAnalysisDone || percent == 100) {
    console.log(`Updating percent - ${percent}`);
    // Updating percentage
    let percentAnalysisText = document.getElementById("percent-text");
    percentAnalysisText.innerHTML = `Analyses Completed! (100%)`;
    let progressBar = document.getElementById("progress-bar");
    progressBar.style.width = `100%`;
    shouldRefreshPopup = false;
  } else {
    // console.log(`Updating percent - ${percent}`);
    // Updating percentage
    let percentAnalysisText = document.getElementById("percent-text");
    percentAnalysisText.innerHTML = `Analysing... (${percent}%) - ${
      productlist[productlist.length - 1]?.productCode || "NA"
    }`;
    console.log(percentAnalysisText.innerHTML);
    let progressBar = document.getElementById("progress-bar");
    progressBar.style.width = `${percent}%`;
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(
    `request.action - ${request.action} -> ${JSON.stringify(sender)}`
  );
  if (request.action === "refresh_popup") {
    console.log("executing refresh_popup");
    const tabId = sender.tab?.id;
    if (tabId) {
      processProductsFor(tabId);
    } else {
      console.log(`tabId not found for request - ${request}`);
    }
  }
  return true; // Indicate that we will respond asynchronously
});

// Periodically update process of pop
setInterval(function () {
  if (!shouldRefreshPopup) return;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let tabId = tabs[0].id;
    console.log(`popup.js tabId - ${tabId}`);
    // Retrieve the productlist associated with the current tab ID
    processProductsFor(tabId);
  });
}, 1000); // Run cleanup every 10 seconds

const processingProblems = async (productlist) => {
  // Comparision to be done on page product codes and not dashboard list. Need to
  chrome.storage.local.get("dashboard_productlist", function (result) {
    const fullProductList = result["dashboard_productlist"];
    productlist.array.forEach((element) => {
      const processed = fullProductList.some(
        (product) => product.productCode === element.productCode
      );
      if (!processed) {
        console.log(`Product missed - ${element}`);
      }
    });
  });
};
