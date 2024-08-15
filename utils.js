import { tabProcessUpdate } from "./chromeApi.js";

const requestQueue = [];
let isProcessing = false;
let baseFactor = 1;
let multipler = 2;
const rateLimitBackoff = 10000;
let requestCount = 1;

const processQueue = async () => {
  if (isProcessing) return;
  tabProcessUpdate(false);
  isProcessing = true;
  console.log(`requestQueue.length - ${requestQueue.length}`);
  while (requestQueue.length > 0) {
    const { url, resolve, reject } = requestQueue.shift();
    try {
      let retry = 3;
      while (retry > 0) {
        multipler = multipler + requestCount / 10;
        await new Promise((placeHolder) =>
          setTimeout(placeHolder, multipler * 700)
        );
        const response = await fetch(url);
        // console.log(`Calling product api`);
        requestCount += 1;
        if (response.status == 429) {
          console.log(
            `Holding request for ${rateLimitBackoff * baseFactor} seconds`
          );
          await new Promise((placeHolder) =>
            setTimeout(placeHolder, rateLimitBackoff * baseFactor)
          );
          console.log(`increased baseFactor - ${baseFactor}`);
          baseFactor *= 2;
          retry -= 1;
          multipler += 1;
        } else if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        } else {
          baseFactor = 1;
          const html = await response.text();
          resolve(html);
          break;
        }
      }
      if (retry == 0) {
        console.log(`Stopping request due to rate limit`);
      }
    } catch (error) {
      console.error("Error fetching HTML:", error);
      reject(error);
    }
  }
  tabProcessUpdate(true);
};

export const fetchAndParseHtml = async (url) => {
  const html = await new Promise((resolve, reject) => {
    requestQueue.push({ url, resolve, reject });
    processQueue();
  });
  return html;
};

// Periodically update process of pop
setInterval(function () {
  if (requestQueue.length > 0) {
    processQueue();
  }
}, 10 * 1000); // Run cleanup every 10 seconds

export const findUPC = (html) => {
  const upcRegex = /<tr>\s*<td>UPC:&nbsp;<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/i;
  const match = html.match(upcRegex);
  return match ? match[1].trim() : null;
};

export const getCurrentTabId = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTabId = tabs[0].id;
  console.log(`Current tab ID:${currentTabId} - ${typeof currentTabId}`);
  return currentTabId;
};

export const round = async (value) => {
  return Math.round(value * 100) / 100;
};

export function getElementByXPathFor(elementPath, baseElementObj) {
  return getElementByXPathForNode(
    elementPath,
    baseElementObj,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE
  );
}

export function getElementByXPathForNode(
  elementPath,
  baseElementObj,
  xPathResult
) {
  return document.evaluate(
    elementPath,
    baseElementObj,
    null,
    xPathResult,
    null
  );
}

export const findMinMaxPricePerPiece = async (document) => {
  // XPath expression to find the Price Per Piece cells, excluding those with <strike> tags
  const xpathOfPriceTable = `//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/table[1]/tbody/tr[3]/td/table/tbody/tr`;
  // Evaluate the XPath expression
  const priceTableRows = getElementByXPathFor(xpathOfPriceTable, document);
  let priceRow = priceTableRows.iterateNext();
  let rowCount = 0;
  const prices = [];
  while (priceRow) {
    if (rowCount != 0) {
      // console.log(priceRow);
      // This is for sale price
      let priceTag = "NA";
      let productPriceEntry = getElementByXPathFor("./td[3]/font", priceRow);
      let salepriceTag = productPriceEntry.iterateNext();
      if (!salepriceTag) {
        // if sale is not there then this is for normal price
        productPriceEntry = getElementByXPathFor("./td[3]", priceRow);
        priceTag = productPriceEntry.iterateNext();
        // console.log(priceTag);
      } else {
        priceTag = salepriceTag;
      }
      if (!priceTag) {
        console.log(
          `Not able to find price -> salesPrice : ${salepriceTag}, priceTag : ${priceTag}`
        );
        // console.log(priceRow);
        // console.log(priceTag);
      }
      // console.log(priceTag);
      if (priceTag && priceTag.textContent) {
        let price = parseFloat(priceTag.textContent.trim().substring(1));
        if (!isNaN(price)) {
          prices.push(price);
        }
      }
    }
    priceRow = priceTableRows.iterateNext();
    rowCount += 1;
  }

  // Find the minimum and maximum prices
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return { minPrice, maxPrice };
};

export const isBundleProduct = async (document) => {
  const bundleUpcCodesTable = [
    '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/table[1]/tbody/tr[5]/td/font[2]/table[1]/tbody/tr[1]',
    '//*[@id="main-table"]/tbody/tr/td/font/table/tbody/tr/td[2]/table[1]/tbody/tr/td[1]/table[1]/tbody/tr[6]/td/font[2]/table[1]/tbody/tr[2]',
  ];
  for (let index = 0; index < bundleUpcCodesTable.length; index += 1) {
    // console.log(document);
    const metaDataTable = getElementByXPathFor(
      bundleUpcCodesTable[index],
      document
    );
    let row = metaDataTable.iterateNext();
    if (row) {
      console.log("This is a bundle of products");
      return true;
    }
  }
  return false;
};
