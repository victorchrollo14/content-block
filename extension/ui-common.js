(() => {
  const DEFAULTS = {
    blockedSites: [],
    limitedSites: [],
    limitSeconds: 30
  };

  function normalizeDomain(input) {
    let value = String(input || "").trim().toLowerCase();
    if (!value) {
      return "";
    }

    if (value.includes("://")) {
      try {
        value = new URL(value).hostname.toLowerCase();
      } catch {
        return "";
      }
    }

    return value.replace(/^\.+/, "").replace(/\/+$/, "");
  }

  function normalizeDomainList(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    return [...new Set(list.map(normalizeDomain).filter(Boolean))].sort();
  }

  function normalizeImageList(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    return list.map((value) => String(value || "").trim()).filter(Boolean);
  }

  function normalizeImageUrl(input) {
    const value = String(input || "").trim();
    if (!value) {
      return "";
    }

    if (!/^https?:\/\//i.test(value)) {
      return "";
    }

    return value;
  }

  window.KaizenCommon = {
    DEFAULTS,
    normalizeDomain,
    normalizeDomainList,
    normalizeImageList,
    normalizeImageUrl
  };
})();
