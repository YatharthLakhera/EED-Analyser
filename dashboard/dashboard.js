const getTableEntryFor = (pid, product) => {
  let rowColor = "bg-white";
  if (!product.upcCode || !product.minPrice) {
    rowColor = "bg-red-300";
    if (!product.upcCode) {
      product.upcCode = "NA";
    }
    if (!product.minPrice) {
      product.minPrice = "NA";
    }
  }
  return `<tr class="${rowColor}">
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800"
                      >
                        ${pid}
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 hover:underline"
                      >
                        <a href="${product.productLink}">${product.productName}</a>
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                      >
                      <a href="https://www.eedistribution.com/prodinfo.asp?number=${product.productCode}">${product.upcCode}</a>
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                      >
                      ${product.minPrice}
                      </td>
                       <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                      >
                      ${product.maxPrice}
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                      >
                      ${product.info}
                      </td>
                      <td
                        class="px-6 py-4 whitespace-nowrap text-end text-sm font-medium"
                      >
                        <button
                          type="button"
                          id="delete-${product.productCode}"
                          class="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-blue-600 hover:text-blue-800 focus:outline-none focus:text-blue-800 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>`;
};

document.addEventListener("DOMContentLoaded", function () {
  // Get the current active tab ID
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let tabId = tabs[0].id;
    console.log(`dashboard.js tabId - ${tabId}`);
    // Retrieve the productlist associated with the current tab ID
    chrome.storage.local.get("dashboard_productlist", function (result) {
      let data = result["dashboard_productlist"];
      // console.log(`Data in dashboard - ${JSON.stringify(data)}`);
      if (data && data.productlist) {
        addDataToTableFor(data.productlist);
        let productCount = document.getElementById("product-count");
        productCount.innerHTML = `- Analyzed ${data.productlist.length} products`;
      } else {
        console.log("No valid data found for this tab.");
        // updateElementFor("empty-product-list-body", "display", "none");
      }
    });
  });
});

async function addDataToTableFor(productlist) {
  let container = document.getElementById("product-table-body");
  container.innerHTML = ""; // Clear any existing content
  let productId = 1;
  productlist.forEach((product) => {
    if (product.productName) {
      const rowHtml = getTableEntryFor(productId, product);
      container.insertAdjacentHTML("beforeend", rowHtml);
      document.getElementById(`delete-${product.productCode}`).onclick = () =>
        deleteProduct(product.productCode);
      productId += 1;
    }
  });
}

// Downloading excel on button click
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("download-button")
    .addEventListener("click", downloadExcel);
});

function downloadExcel() {
  const inStockCheckbox = document.getElementById(
    "download-in-stock-checkbox"
  ).checked;
  console.log(`inStockCheckbox - ${inStockCheckbox}`);
  // Fetch the product list from storage using the tab ID
  chrome.storage.local.get(`dashboard_productlist`, function (result) {
    if (result[`dashboard_productlist`]) {
      const productList = result[`dashboard_productlist`].productlist;

      // Convert product list to a worksheet
      const ws = XLSX.utils.json_to_sheet(
        productList
          .filter(
            (product) =>
              product.upcCode &&
              product.minPrice &&
              product.upcCode !== "Possibly Product Bundle" &&
              (!inStockCheckbox || product.info === "In Stock")
          )
          .map((product) => {
            return {
              UPC: product.upcCode,
              COGS: product.minPrice,
            };
          })
      );

      // Create a new workbook and append the worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");

      // Generate a file and trigger a download
      XLSX.writeFile(wb, "eedist_product_list.xlsx");
    } else {
      console.log("No product list found for this tab.");
    }
  });
}

function deleteProduct(productCode) {
  console.log(`delete product - ${productCode}`);
  chrome.storage.local.get(`dashboard_productlist`, function (result) {
    if (result[`dashboard_productlist`]) {
      const fullData = result[`dashboard_productlist`];
      let productList = fullData.productlist;
      if (!productList) return;
      productList = productList.filter(
        (product) => product.productCode !== productCode
      );
      let productId = 1;
      productList = productList.map((product) => {
        product.productId = productId;
        productId += 1;
        return product;
      });
      console.log(`productList - ${JSON.stringify(productList)}`);
      // Save updated product list back to local storage
      let data = {};
      data["dashboard_productlist"] = {
        productlist: productList,
        expiration: fullData.expiration,
        productCount: fullData.productCount,
      };
      chrome.storage.local.set(data, function () {
        console.log("Updated product list saved for tab " + data);
      });
      const row = document.getElementById(`delete-${productCode}`).parentNode
        .parentNode;
      row.parentNode.removeChild(row);
    } else {
      console.log("No product list found for this tab.");
    }
  });
}

// Downloading excel on button click
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("delete-all-button")
    .addEventListener("click", deleteAllProducts);
});

function deleteAllProducts() {
  console.log(`deleting all product`);
  chrome.storage.local.get(`dashboard_productlist`, function (result) {
    if (result[`dashboard_productlist`]) {
      let data = {};
      data["dashboard_productlist"] = {
        productlist: [],
        expiration: 0,
        productCount: 0,
      };
      chrome.storage.local.set(data, function () {
        console.log("Updated product list saved for tab " + data);
      });
      const tableBody = document.getElementById("product-table-body");
      tableBody.innerHTML = "";
    } else {
      console.log("No product list found for this tab.");
    }
  });
}

// Downloading excel on button click
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("contact-button").addEventListener("click", () => {
    document.getElementById("contant-popup").hidden = false;
  });
  document
    .getElementById("contact-pop-close-btn")
    .addEventListener("click", () => {
      document.getElementById("contant-popup").hidden = true;
    });
});
