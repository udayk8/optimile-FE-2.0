import {
  InventoryStockStatus,
  InventoryTransaction,
  InventoryTransactionType,
  Part,
  PartInventoryItem,
} from '../../../types';

const inwardTypes: InventoryTransactionType[] = ['INWARD', 'RETURN', 'REVERSAL'];
const outwardTypes: InventoryTransactionType[] = ['OUTWARD'];

export function getPartId(part: Pick<PartInventoryItem, 'id' | 'partId'> | Pick<Part, 'partId'>) {
  return 'id' in part ? part.partId ?? part.id : part.partId;
}

export function calculateCurrentStock(partId: string, transactions: InventoryTransaction[]) {
  return transactions
    .filter((transaction) => transaction.partId === partId)
    .reduce((stock, transaction) => stock + signedQuantity(transaction), 0);
}

export function calculateStockByPart(transactions: InventoryTransaction[]) {
  return transactions.reduce<Record<string, number>>((stockByPart, transaction) => {
    stockByPart[transaction.partId] = (stockByPart[transaction.partId] ?? 0) + signedQuantity(transaction);
    return stockByPart;
  }, {});
}

export function getInventoryStockStatus(part: Pick<Part, 'currentStock' | 'minimumStockLevel' | 'status'>): InventoryStockStatus {
  if (part.status === 'Inactive') return 'Inactive';
  if (part.currentStock <= 0) return 'Out of Stock';
  if (part.currentStock <= part.minimumStockLevel) return 'Low Stock';
  return 'In Stock';
}

export function getInventoryItemStockStatus(item: PartInventoryItem, currentStock = item.currentStock ?? item.stockOnHand): InventoryStockStatus {
  if ((item.partStatus ?? 'Active') === 'Inactive') return 'Inactive';
  if (currentStock <= 0) return 'Out of Stock';
  if (currentStock <= (item.minimumStockLevel ?? item.reorderPoint)) return 'Low Stock';
  return 'In Stock';
}

export function canIssueStock({
  allowNegativeStock = false,
  currentStock,
  quantity,
}: {
  allowNegativeStock?: boolean;
  currentStock: number;
  quantity: number;
}) {
  if (quantity <= 0) {
    return { allowed: false, reason: 'Quantity must be greater than zero.' };
  }

  if (!allowNegativeStock && quantity > currentStock) {
    return { allowed: false, reason: 'Requested quantity exceeds available stock.' };
  }

  return { allowed: true, reason: null };
}

export function isDuplicatePartName(
  parts: Array<Pick<PartInventoryItem, 'id' | 'partName' | 'category'>>,
  candidate: Pick<PartInventoryItem, 'partName' | 'category'>,
  existingId?: string,
) {
  const name = normalize(candidate.partName);
  const category = normalize(candidate.category ?? '');

  return parts.some((part) => part.id !== existingId && normalize(part.partName) === name && normalize(part.category ?? '') === category);
}

export function buildPartFromInventoryItem(item: PartInventoryItem, transactions: InventoryTransaction[] = []): Part {
  const partId = item.partId ?? item.id;
  const transactionStock = calculateCurrentStock(partId, transactions);
  const hasTransactions = transactions.some((transaction) => transaction.partId === partId);

  return {
    partId,
    partName: item.partName,
    category: item.category ?? 'Unclassified',
    unit: item.unit ?? 'unit',
    minimumStockLevel: item.minimumStockLevel ?? item.reorderPoint,
    currentStock: hasTransactions ? transactionStock : item.currentStock ?? item.stockOnHand,
    status: item.partStatus ?? 'Active',
    partNumber: item.partNumber,
    unitCost: item.unitCost,
    vendorId: item.vendorId,
    vendorName: item.vendorName,
  };
}

function signedQuantity(transaction: InventoryTransaction) {
  if (inwardTypes.includes(transaction.type)) return transaction.quantity;
  if (outwardTypes.includes(transaction.type)) return -transaction.quantity;
  return transaction.quantity;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
