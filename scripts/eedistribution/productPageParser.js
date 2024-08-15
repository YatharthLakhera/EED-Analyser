(async () => {
  const {
    getElementByXPathFor,
    getElementByXPathForNode,
    findMinMaxPricePerPiece,
    isBundleProduct,
  } = await import(chrome.runtime.getURL("../../utils.js"));
  const { persistProduct, tabProcessUpdate } = await import(
    chrome.runtime.getURL("../../chromeApi.js")
  );

  const getProductInventoryStatus = async (document) => {
    const productStatusXpath =
      '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/table[1]/tbody/tr[2]/td[2]/span[1]';
    const productStatusElement = getElementByXPathForNode(
      productStatusXpath,
      document,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue;
    // console.log(productStatusElement);
    return productStatusElement?.innerText;
  };

  const productPageProcessor = async () => {
    tabProcessUpdate(false);
    const productLink = window.location.href;
    const productName = await getProductName();
    const productImage = await getProductImage();
    const info = await getProductInventoryStatus(document);
    console.log(`info - ${info}`);
    let urlObject = new URL(productLink);
    const productCode = urlObject.searchParams.get("number");
    let upcCode = await getUpcCode();
    if (!upcCode) {
      const isBundle = await isBundleProduct(document);
      if (isBundle) {
        upcCode = "Possibly Product Bundle";
      }
    }
    console.log(`upcCode - ${upcCode}`);
    const { minPrice, maxPrice } = await findMinMaxPricePerPiece(document);
    const productDetails = {
      productLink,
      productName,
      productImage,
      productCode,
      upcCode,
      minPrice,
      maxPrice,
      info,
    };
    console.log(`productDetails - ${JSON.stringify(productDetails)}`);
    persistProduct(productDetails, "add_single_product", 1);
    tabProcessUpdate(true);
  };

  const getUpcCode = async () => {
    const upcXpath =
      '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/table[1]/tbody/tr[5]/td/font[2]/table/tbody/tr';
    const metaDataTable = getElementByXPathFor(upcXpath, document);
    let row = metaDataTable.iterateNext();
    let upcCode = null;
    while (row) {
      if (row.textContent.includes("UPC")) {
        // console.log(`row.textContent - ${row.textContent}`);
        upcCode = row.textContent.split(":")[1];
        if (upcCode) {
          upcCode = upcCode.trim();
        }
      }
      if (upcCode) break;
      row = metaDataTable.iterateNext();
    }
    return upcCode;
  };

  const getProductImage = async () => {
    const productImageXpath =
      '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/table[1]/tbody/tr[2]/td[1]/table/tbody/tr/td/div/div[1]/div/div/div/div[1]/div/a/img';
    const productImageElement = getElementByXPathForNode(
      productImageXpath,
      document,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue;
    return productImageElement?.src;
  };

  const getProductName = async () => {
    const productNameXpath =
      '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/table[1]/tbody/tr[1]/td/h1';
    const productNameElement = getElementByXPathForNode(
      productNameXpath,
      document,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue;
    return productNameElement.innerText;
  };

  productPageProcessor();
})();
