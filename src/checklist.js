export function getChecklistMeta(items = [], previewLimit = 2) {
  const checklistItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const pendingItems = checklistItems.filter(item => !item.done);
  const completedItems = checklistItems.filter(item => item.done);
  const previewSource = pendingItems.length > 0 ? pendingItems : completedItems;
  const previewItems = previewSource
    .map(item => (typeof item?.text === "string" ? item.text.trim() : ""))
    .filter(Boolean)
    .slice(0, previewLimit);

  return {
    total: checklistItems.length,
    completed: completedItems.length,
    pending: pendingItems.length,
    pendingItems,
    completedItems,
    previewText: previewItems.join(" • "),
    remainingPreviewCount: Math.max(previewSource.length - previewItems.length, 0),
  };
}
