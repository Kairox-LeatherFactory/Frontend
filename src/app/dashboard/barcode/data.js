// ─── SEED PRODUCTION ORDER DATASET ───────────────────────────────────────────
export const initialOrdersStore = {
  KL_1: {
    orderId: 'KL_1',
    client: 'John Peter S.R.L.',
    styles: {
      'ADELE KNIT': {
        color: 'DARK BROWN',
        material: 'Lambskin Leather & Wool',
        sizes: {
          38: { ordered: 59, generated: 0, remaining: 59 },
          40: { ordered: 45, generated: 0, remaining: 45 },
          42: { ordered: 60, generated: 0, remaining: 60 },
          44: { ordered: 30, generated: 0, remaining: 30 },
          46: { ordered: 25, generated: 0, remaining: 25 },
        },
      },
      'ADELE KNIT + DETACH': {
        color: 'COGNAC TAN',
        material: 'Nappa Leather with Detachable Hood',
        sizes: {
          38: { ordered: 30, generated: 0, remaining: 30 },
          40: { ordered: 40, generated: 0, remaining: 40 },
          42: { ordered: 45, generated: 0, remaining: 45 },
        },
      },
      CARNABY: {
        color: 'CHARCOAL',
        material: 'Vintage Distressed Calfskin',
        sizes: {
          40: { ordered: 35, generated: 0, remaining: 35 },
          42: { ordered: 50, generated: 0, remaining: 50 },
          44: { ordered: 40, generated: 0, remaining: 40 },
        },
      },
      CLERMONT: {
        color: 'ESPRESSO BROWN',
        material: 'Italian Suede Leather',
        sizes: {
          38: { ordered: 25, generated: 0, remaining: 25 },
          40: { ordered: 35, generated: 0, remaining: 35 },
          42: { ordered: 40, generated: 0, remaining: 40 },
          44: { ordered: 30, generated: 0, remaining: 30 },
        },
      },
      'FLAVIO KNIT': {
        color: 'DARK BROWN',
        material: 'Lambskin Biker with Knit Ribbing',
        sizes: {
          38: { ordered: 40, generated: 0, remaining: 40 },
          40: { ordered: 50, generated: 0, remaining: 50 },
          42: { ordered: 55, generated: 0, remaining: 55 },
        },
      },
      'FRANCIS KNIT': {
        color: 'VINTAGE CHESTNUT',
        material: 'Soft Nappa Flight Jacket',
        sizes: {
          38: { ordered: 35, generated: 0, remaining: 35 },
          40: { ordered: 45, generated: 0, remaining: 45 },
          42: { ordered: 50, generated: 0, remaining: 50 },
        },
      },
      ISLAY: {
        color: 'BLACK LEATHER',
        material: 'Heavyweight Bullhide Overcoat',
        sizes: {
          40: { ordered: 25, generated: 0, remaining: 25 },
          42: { ordered: 35, generated: 0, remaining: 35 },
          44: { ordered: 45, generated: 0, remaining: 45 },
        },
      },
    },
  },
  JP_88: {
    orderId: 'JP_88',
    client: 'Leather Co',
    styles: {
      'TUSCANY BIKER': {
        color: 'COGNAC TAN',
        material: 'Full Grain Calfskin',
        sizes: {
          38: { ordered: 40, generated: 0, remaining: 40 },
          40: { ordered: 50, generated: 0, remaining: 50 },
          42: { ordered: 55, generated: 0, remaining: 55 },
        },
      },
      'MILANO RIDER': {
        color: 'BLACK LEATHER',
        material: 'Perforated Racing Leather',
        sizes: {
          38: { ordered: 30, generated: 0, remaining: 30 },
          40: { ordered: 40, generated: 0, remaining: 40 },
          42: { ordered: 50, generated: 0, remaining: 50 },
        },
      },
    },
  },
  SE_42: {
    orderId: 'SE_42',
    client: 'Venezia Apparel',
    styles: {
      'MILANO OVERCOAT': {
        color: 'ESPRESSO BROWN',
        material: 'Italian Suede Leather',
        sizes: {
          40: { ordered: 30, generated: 0, remaining: 30 },
          42: { ordered: 40, generated: 0, remaining: 40 },
          44: { ordered: 50, generated: 0, remaining: 50 },
        },
      },
    },
  },
  MR_19: {
    orderId: 'MR_19',
    client: 'Moda Italia',
    styles: {
      'ROMA BLAZER': {
        color: 'VINTAGE CHESTNUT',
        material: 'Nappa Sheepskin',
        sizes: {
          38: { ordered: 25, generated: 0, remaining: 25 },
          40: { ordered: 35, generated: 0, remaining: 35 },
          42: { ordered: 45, generated: 0, remaining: 45 },
        },
      },
    },
  },
};

// Builds a fresh, independent copy of the store plus a pre-populated ADELE KNIT
// batch so the Print Center and History tabs aren't empty on first load.
export function buildInitialState() {
  const ordersStore = JSON.parse(JSON.stringify(initialOrdersStore));
  const generatedBarcodesStore = [];
  const batchHistoryStore = [];

  const kl1Data = ordersStore.KL_1;
  const adeleStyle = kl1Data.styles['ADELE KNIT'];
  const batchId = 'BATCH-2026-0723';

  Object.keys(adeleStyle.sizes).forEach((sz) => {
    const qty = adeleStyle.sizes[sz].ordered;
    for (let i = 1; i <= qty; i++) {
      const serialStr = String(i).padStart(3, '0');
      const pieceCode = `KL_1-ADELE_KNIT-DARK_BROWN-${sz}-${serialStr}`;

      generatedBarcodesStore.push({
        pieceCode,
        orderId: 'KL_1',
        client: kl1Data.client,
        style: 'ADELE KNIT',
        color: adeleStyle.color,
        size: sz,
        serial: i,
        serialStr,
        batchNo: batchId,
        createdDate: '2026-07-23 15:45',
        generatedBy: 'ASMATH',
        printStatus: i <= Math.floor(qty * 0.7) ? 'PRINTED' : 'PENDING',
        printCount: i <= Math.floor(qty * 0.7) ? 1 : 0,
      });
    }
    adeleStyle.sizes[sz].generated = qty;
    adeleStyle.sizes[sz].remaining = 0;
  });

  batchHistoryStore.push({
    batchNo: batchId,
    orderId: 'KL_1',
    client: kl1Data.client,
    style: 'ADELE KNIT',
    color: adeleStyle.color,
    size: '38-46',
    qty: 219,
    generatedBy: 'ASMATH',
    createdDate: '2026-07-23 15:45',
    printStatus: 'PARTIAL',
  });

  return { ordersStore, generatedBarcodesStore, batchHistoryStore };
}
