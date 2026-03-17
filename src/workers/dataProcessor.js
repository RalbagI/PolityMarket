/**
 * Web Worker for heavy data processing.
 * Offloads SMA computation, date range filtering, and sorting
 * from the main UI thread to keep chart animations smooth.
 */

function computeSMA(values, window) {
  return values.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1).filter((v) => v != null);
    if (slice.length === 0) return null;
    return parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
  });
}

function buildChartData(data, dates, politicians, smaMode) {
  const raw = dates.map((date) => {
    const row = { date };
    let totalVolume = 0;
    for (const name of politicians) {
      const entry = data.find((d) => d.date === date && d.name === name);
      if (entry) {
        row[`${name}_raw`] = entry.overall_score;
        totalVolume += entry.media_volume;
      }
    }
    row.totalVolume = totalVolume;
    return row;
  });

  if (smaMode === "raw") {
    return raw.map((row) => {
      const out = { ...row };
      for (const name of politicians) {
        out[name] = out[`${name}_raw`];
      }
      return out;
    });
  }

  const window = smaMode === "sma7" ? 7 : 14;
  const result = raw.map((r) => ({ ...r }));

  for (const name of politicians) {
    const rawValues = raw.map((r) => r[`${name}_raw`]);
    const smoothed = computeSMA(rawValues, window);
    smoothed.forEach((val, i) => {
      result[i][name] = val;
    });
  }

  return result;
}

function filterByDateRange(data, startDate, endDate) {
  return data.filter((d) => d.date >= startDate && d.date <= endDate);
}

function sortByField(data, field, ascending = true) {
  return [...data].sort((a, b) => {
    const diff = (a[field] ?? 0) - (b[field] ?? 0);
    return ascending ? diff : -diff;
  });
}

self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case "buildChartData": {
      const result = buildChartData(
        payload.data,
        payload.dates,
        payload.politicians,
        payload.smaMode
      );
      self.postMessage({ type: "chartDataResult", payload: result });
      break;
    }
    case "filterByDateRange": {
      const result = filterByDateRange(payload.data, payload.startDate, payload.endDate);
      self.postMessage({ type: "filterResult", payload: result });
      break;
    }
    case "sortByField": {
      const result = sortByField(payload.data, payload.field, payload.ascending);
      self.postMessage({ type: "sortResult", payload: result });
      break;
    }
    default:
      self.postMessage({ type: "error", payload: `Unknown message type: ${type}` });
  }
};
