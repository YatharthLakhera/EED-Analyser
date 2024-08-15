(async () => {
  const {
    fetchAndParseHtml,
    findUPC,
    getElementByXPathFor,
    getElementByXPathForNode,
    findMinMaxPricePerPiece,
  } = await import(chrome.runtime.getURL("../../utils.js"));
  const { persistProduct } = await import(
    chrome.runtime.getURL("../../chromeApi.js")
  );

  const totalProductCount = calculateProductCount();
  getProductCodes();
  const mainTableXpathList = [
    '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table/tbody/tr/td/table[2]/tbody/tr/td/nobr/form/table[3]/tbody',
    '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[2]/tbody/tr/td/table[2]/tbody/tr/td/nobr/form/table[3]/tbody',
    '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[2]/tbody/tr/td/table[4]/tbody',
    '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table/tbody/tr/td/table[4]/tbody',
  ];

  const pageAnalyser = async () => {
    // Fetching main product table
    // console.log("testing contentscript");
    let isFirstProduct = true;
    for (let index = 0; index < mainTableXpathList.length; index += 1) {
      const productTableXpath = mainTableXpathList[index];
      const productTable = getElementByXPathForNode(
        productTableXpath,
        document,
        XPathResult.FIRST_ORDERED_NODE_TYPE
      ).singleNodeValue;
      if (productTable) {
        // Processing product rows
        const productRows = getElementByXPathFor("./tr", productTable);
        let productRow = productRows.iterateNext();
        // processing product row
        while (productRow) {
          // Process the current product element
          let productColumns = getElementByXPathFor("./td", productRow);
          let productColumn = productColumns.iterateNext();
          while (productColumn) {
            // Parsing product details in this function
            // productProcessor(productColumn, productsCount == currentProductIndex);
            productProcessor(productColumn, isFirstProduct);
            productColumn = productColumns.iterateNext();
            isFirstProduct = false;
          }
          // Get the next tr element
          productRow = productRows.iterateNext();
          // break; // -------- Breaking ------------
        }
        return;
      } else {
        console.log("productTable not found");
      }
    }
  };

  const productProcessor = async (productElementTable, isFirstProduct) => {
    const productRows = getElementByXPathFor(
      "./table/tbody/tr[4]/td/table/tbody/tr[3]/td/table/tbody/tr[1]",
      productElementTable
    );
    let productRow = productRows.iterateNext();
    if (!productRow) {
      console.log(`Product row not found for - ${productRows.toString()}`);
      return;
    }
    const productLink = getDataFor(productRow, "a", "href", "number");
    const productName = getDataFor(productRow, "img", "alt", null);
    const productImage =
      "https://www.eedistribution.com/prodimage.asp?path=" +
      getDataFor(productRow, "img", "src", null);
    // Create a URL object
    let urlObject = new URL(productLink);
    // Get the value of the 'number' parameter
    let productCode = urlObject.searchParams.get("number");
    const productDetails = await productPageProcessor(productLink, {
      productLink,
      productName,
      productImage,
      productCode,
    });
    // console.log(`Product Details - ${JSON.stringify(productDetails)}`);
    persistProduct(
      { ...productDetails, isFirstProduct },
      "add_list_product",
      totalProductCount
    );
  };

  const productPageProcessor = async (productUrl, productDetails) => {
    const productDetailsHtml = await fetchAndParseHtml(productUrl);
    // const isBundle = await isBundleProduct(productDetailsHtml);
    const upcCode = findUPC(productDetailsHtml);
    // console.log(`upcCode - ${upcCode}`);
    const { minPrice, maxPrice } = await findMinMaxPrice(productDetailsHtml);
    const info = getProductInventoryStatus();
    return { ...productDetails, upcCode, minPrice, maxPrice, info };
  };

  const getDataFor = (productRow, tagName, attributeName, includesValue) => {
    const tagElements = productRow.querySelectorAll(tagName);
    if (tagElements) {
      for (let i = 0; i < tagElements.length; i++) {
        const tagElement = tagElements[i];
        const attributeValue = tagElement.getAttribute(attributeName);
        if (
          attributeValue &&
          (!includesValue || attributeValue.includes(includesValue))
        ) {
          //   console.log("attributeValue:", attributeValue);
          return attributeValue;
        }
      }
    }
    // Return null or some default value if no matching attribute is found
    return null;
  };

  const findMinMaxPrice = (html) => {
    // Create a DOM parser
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(html, "text/html");
    return findMinMaxPricePerPiece(htmlDocument);
  };

  function getProductInventoryStatus() {
    const productStatusXpath =
      '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table/tbody/tr/td/table[2]/tbody/tr/td/nobr/form/table[3]/tbody/tr[1]/td[1]/table/tbody/tr[4]/td/table/tbody/tr[3]/td/table/tbody/tr[1]/td[3]/table/tbody/tr[2]/td/a';
    const productStatusElement = getElementByXPathForNode(
      productStatusXpath,
      document,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue;
    return productStatusElement?.innerText;
  }

  pageAnalyser();
})();

function calculateProductCount() {
  // Define the keyword to search for
  const keyword = "Item Number: ";
  // Get the HTML content of the page
  const pageContent = document.body.innerText;
  // Use a regular expression to match all occurrences of the keyword
  const regex = new RegExp(keyword, "g");
  const matches = pageContent.match(regex);
  // Count the number of matches
  const count = matches ? matches.length : 0;
  return count;
}

function getProductCodes() {
  // Define the keyword to search for
  const keyword = "Item Number: ";
  // Get the HTML content of the page
  const pageContent = document.body.innerText;
  // Use a regular expression to match all occurrences of the keyword followed by the value
  const regex = new RegExp(`${keyword}(\\S+)`, "g");
  const matches = [];
  let match;
  while ((match = regex.exec(pageContent)) !== null) {
    matches.push(match[1]); // Capture the value after "Item Number: "
  }
  console.log(`getProductNumbers: ${matches}`);
  return matches;
}
