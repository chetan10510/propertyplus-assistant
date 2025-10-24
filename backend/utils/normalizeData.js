// utils/normalizeData.js
export function normalizeListings(rawResults = []) {
  return rawResults.map((item) => {
    const title = item.title?.trim() || item.name || "Unknown Property";
    const content = item.content || item.snippet || "";
    const priceMatch =
      content.match(/₹\s?[\d,.]+|Rs\.?\s?[\d,.]+|\$\s?[\d,.]+/)?.[0] || "N/A";
    const bhkMatch = content.match(/\b\d\s?BHK\b/i)?.[0] || "";
    const sqftMatch = content.match(/[\d,.]+\s?sq\.?\s?ft/i)?.[0] || "";
    const locMatch =
      content.match(/\b[A-Z][a-z]+(?:,?\s[A-Z][a-z]+)*\b/)?.[0] || "N/A";

    return {
      title,
      type: bhkMatch ? "Residential" : "Property",
      price: priceMatch,
      location: locMatch,
      area: bhkMatch + (sqftMatch ? `, ${sqftMatch}` : ""),
      source: item.url || "Unknown Source",
      description: content.slice(0, 200) + "...",
    };
  });
}