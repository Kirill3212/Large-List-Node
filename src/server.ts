import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";

interface Item {
  id: number;
  value: string;
  selected?: boolean;
}

interface SelectedItemsRequest {
  selectedIds: number[];
}

interface SortOrderRequest {
  sortedIds: number[];
}

interface QueryParams {
  page?: string;
  limit?: string;
  search?: string;
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// In-memory storage for selected items and sort order
let selectedItems: number[] = [];
let sortOrder: number[] = [];

// Generate initial data (1 to 1,000,000)
const generateInitialData = (): Item[] => {
  return Array.from({ length: 1000000 }, (_, i) => ({
    id: i + 1,
    value: `Item ${i + 1}`,
  }));
};

const allItems: Item[] = generateInitialData();

// Get paginated items
app.get(
  "/api/items",
  (req: Request<{}, {}, {}, QueryParams>, res: Response) => {
    const { page = "0", limit = "20", search = "" } = req.query;
    const startIndex = parseInt(page) * parseInt(limit);

    let filteredItems = allItems;

    // Apply search filter if provided
    if (search) {
      filteredItems = allItems.filter((item) =>
        item.value.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply custom sort if available
    if (sortOrder.length > 0) {
      // Create a map for quick lookup of sort positions
      const sortPositionMap = new Map<number, number>();
      sortOrder.forEach((id, index) => {
        sortPositionMap.set(id, index);
      });

      // Sort the filtered items based on the custom order
      filteredItems = [...filteredItems].sort((a, b) => {
        const aPos = sortPositionMap.has(a.id)
          ? sortPositionMap.get(a.id)!
          : Infinity;
        const bPos = sortPositionMap.has(b.id)
          ? sortPositionMap.get(b.id)!
          : Infinity;

        if (aPos === Infinity && bPos === Infinity) {
          return a.id - b.id; // Default sort by id
        }
        return aPos - bPos;
      });
    }

    // Get paginated results
    const paginatedItems = filteredItems.slice(
      startIndex,
      startIndex + parseInt(limit)
    );

    // Add selection status to each item
    const itemsWithSelection = paginatedItems.map((item) => ({
      ...item,
      selected: selectedItems.includes(item.id),
    }));

    res.json({
      items: itemsWithSelection,
      total: filteredItems.length,
    });
  }
);

// Update selected items
app.post(
  "/api/selected",
  (req: Request<{}, {}, SelectedItemsRequest>, res: Response) => {
    const { selectedIds } = req.body;
    selectedItems = selectedIds;
    res.json({ success: true, selectedItems });
  }
);

// Update sort order
app.post(
  "/api/sort",
  (req: Request<{}, {}, SortOrderRequest>, res: Response) => {
    const { sortedIds } = req.body;
    sortOrder = sortedIds;
    res.json({ success: true, sortOrder });
  }
);

// Get current state (for page reload)
app.get("/api/state", (_req: Request, res: Response) => {
  res.json({
    selectedItems,
    sortOrder,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
