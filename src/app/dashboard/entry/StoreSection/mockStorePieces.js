// Development-only sample garments for previewing the Store Hub without live store data.
// Shaped like GET /api/v1/store/pieces rows; only used when NODE_ENV is "development".
export const MOCK_STORE_ENABLED = process.env.NODE_ENV === "development";

export const MOCK_STORE_PIECES = [
  {
    id: "mock-piece-01", code: "PC-100231", style_name: "SUEDE JACKET", order_number: "BO27P082901", color: "BEIGE", size: "L",
    store_state: "received", holding: "HOLDING BOTH", leather_in: true, lining_in: true, accessories_in: true,
    needs_lining: true, complete: true, sent: false, next_action: "Ready to send to line stitching.",
  },
  {
    id: "mock-piece-02", code: "PC-100232", style_name: "SUEDE JACKET", order_number: "BO27P082901", color: "BEIGE", size: "M",
    store_state: "holding_both", holding: "HOLDING BOTH", leather_in: true, lining_in: true, accessories_in: false,
    needs_lining: true, complete: false, sent: false, next_action: "Waiting for its accessories — scan the kit to issue them.",
  },
  {
    id: "mock-piece-03", code: "PC-100233", style_name: "SUEDE JACKET", order_number: "BO27P082901", color: "BEIGE", size: "XL",
    store_state: "holding_leather", holding: "HOLDING LEATHER", leather_in: true, lining_in: false, accessories_in: false,
    needs_lining: true, complete: false, sent: false, next_action: "Waiting for its lining.",
  },
  {
    id: "mock-piece-04", code: "PC-100240", style_name: "SUEDE BLOUSON", order_number: "BO27P082702", color: "TAUPE", size: "S",
    store_state: "holding_lining", holding: "HOLDING LINING", leather_in: false, lining_in: true, accessories_in: false,
    needs_lining: true, complete: false, sent: false, next_action: "Waiting for its leather.",
  },
  {
    id: "mock-piece-05", code: "PC-100241", style_name: "SUEDE BLOUSON", order_number: "BO27P082702", color: "TAUPE", size: "M",
    store_state: "sended", holding: "HOLDING BOTH", leather_in: true, lining_in: true, accessories_in: true,
    needs_lining: true, complete: true, sent: true, next_action: null,
  },
  {
    id: "mock-piece-06", code: "PC-100250", style_name: "LEATHER BIKER", order_number: "BO27P083115", color: "BLACK", size: "L",
    store_state: "received", holding: "HOLDING LEATHER", leather_in: true, lining_in: false, accessories_in: true,
    needs_lining: false, complete: true, sent: false, next_action: "Ready to send to line stitching.",
  },
  {
    id: "mock-piece-07", code: "PC-100251", style_name: "LEATHER BIKER", order_number: "BO27P083115", color: "BLACK", size: "XL",
    store_state: "holding_leather", holding: "HOLDING LEATHER", leather_in: true, lining_in: false, accessories_in: false,
    needs_lining: false, complete: false, sent: false, next_action: "Waiting for its accessories — scan the kit to issue them.",
  },
  {
    id: "mock-piece-08", code: "PC-100252", style_name: "LEATHER BIKER", order_number: "BO27P083115", color: "BLACK", size: "2XL",
    store_state: "merged", holding: "EMPTY", leather_in: false, lining_in: false, accessories_in: false,
    needs_lining: false, complete: false, sent: false, next_action: "Waiting for its leather.",
  },
  {
    id: "mock-piece-09", code: "PC-100260", style_name: "SUEDE BOMBER", order_number: "BO27P083230", color: "TAUPE", size: "M",
    store_state: "received", holding: "HOLDING BOTH", leather_in: true, lining_in: true, accessories_in: true,
    needs_lining: true, complete: true, sent: false, next_action: "Ready to send to line stitching.",
  },
  {
    id: "mock-piece-10", code: "PC-100261", style_name: "SUEDE BOMBER", order_number: "BO27P083230", color: "TAUPE", size: "L",
    store_state: "waiting", holding: "EMPTY", leather_in: false, lining_in: false, accessories_in: false,
    needs_lining: true, complete: false, sent: false, next_action: "Not merged yet.",
  },
];
