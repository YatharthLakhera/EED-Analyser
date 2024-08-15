// Function to fetch existing product list from chrome.storage.local
export async function persistProduct(newProduct, action, listProductCount) {
  addProductToList("dashboard_productlist", newProduct, null);
  chrome.runtime.sendMessage({ action: action }, function (response) {
    if (response && response.tabId) {
      let tabId = response.tabId;
      console.log(
        `adding product in tab - ${tabId} -> listProductCount : ${listProductCount}`
      );
      addProductToList("productlist_" + tabId, newProduct, listProductCount);
    }
  });
}

export async function tabProcessUpdate(analysisDone) {
  chrome.runtime.sendMessage(
    { action: "tab_process_udpate" },
    function (response) {
      // console.log(`response - ${response}`);
      if (response && response.tabId) {
        let tabId = response.tabId;
        // console.log(`tabProcessUpdate - ${tabId}`);
        const storageKey = "productlist_" + tabId;
        chrome.storage.local.get(storageKey, function (result) {
          let tabData = result[storageKey];
          let data = {};
          data[storageKey] = {
            productlist: tabData?.productlist || [],
            expiration: Date.now() + 60 * 60 * 1000,
            productCount: tabData?.productlist?.length || 0,
            analysisDone: analysisDone,
          };
          // console.log(`tabProcessUpdate - ${data[storageKey].analysisDone}`);
          chrome.storage.local.set(data, function () {
            console.log(`tabId ${tabId} processed`);
          });
        });
      }
    }
  );
}

async function addProductToList(storageKey, newProduct, listProductCount) {
  chrome.storage.local.get(storageKey, function (result) {
    let existingProductList = result[storageKey]?.productlist || [];
    let productCount =
      listProductCount || result[storageKey]?.productCount || 0;

    if (newProduct?.isFirstProduct) {
      // Remove current tab data to restart from begining
      existingProductList = [];
    }
    // Add new product to the existing list
    let isDuplicate = existingProductList.some(
      (product) => product.productCode === newProduct.productCode
    );
    if (!isDuplicate) {
      existingProductList.push(newProduct);

      // Create an expiration time (e.g., 1 hour from now)
      let expiration = Date.now() + 60 * 60 * 1000;

      // Save updated product list back to chrome.storage.local
      let data = {};
      data[storageKey] = {
        productlist: existingProductList,
        expiration: expiration,
        productCount: productCount,
      };
      chrome.storage.local.set(data, function () {
        console
          .log
          // `Updated product list saved for tab - ${JSON.stringify(data)}`
          ();
      });
    }
  });
}

export async function deleteStorageDataFor(storageKey) {
  chrome.storage.local.get(storageKey, () => {
    let data = {};
    data[storageKey] = {
      productlist: [],
      expiration: 0,
      productCount: 0,
    };
    chrome.storage.local.set(data, function () {
      console.log("Clearning tab data");
    });
  });
}
