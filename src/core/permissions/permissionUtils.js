import { PERMISSION_TREE } from "./permissionTree.js";

/** Collect all leaf permission IDs under a node */
export function collectLeafIds(node, out = []) {
  if (!node.children?.length) {
    if (node.id && !node.children) out.push(node.id);
    return out;
  }
  for (const child of node.children) {
    if (child.children?.length) collectLeafIds(child, out);
    else if (child.id) out.push(child.id);
  }
  return out;
}

/** Flatten entire tree to all leaf permission IDs */
export function getAllPermissionIds() {
  const ids = [];
  for (const root of PERMISSION_TREE) {
    walk(root, ids);
  }
  return [...new Set(ids)];
}

function walk(node, ids) {
  if (!node.children?.length) {
    if (node.id) ids.push(node.id);
    return;
  }
  for (const child of node.children) walk(child, ids);
}

/** Expand stored permissions: if parent checked, include all descendant leaves */
export function expandPermissions(selectedIds) {
  if (selectedIds.includes("*")) return getAllPermissionIds();

  const expanded = new Set(selectedIds);
  const visit = (node) => {
    if (selectedIds.includes(node.id) && node.children?.length) {
      collectLeafIds(node).forEach((id) => expanded.add(id));
    }
    node.children?.forEach(visit);
  };
  PERMISSION_TREE.forEach(visit);
  return [...expanded];
}

/** Check single permission (supports wildcard admin) */
export function hasPermission(userPermissions, requiredId) {
  if (!requiredId) return true;
  if (!userPermissions?.length) return false;
  if (userPermissions.includes("*")) return true;
  const set = new Set(expandPermissions(userPermissions));
  return set.has(requiredId);
}

/** Checkbox tree state: is node fully checked */
export function isNodeChecked(nodeId, selectedIds) {
  if (selectedIds.includes("*")) return true;
  return selectedIds.includes(nodeId);
}

/** Indeterminate if some but not all leaves selected */
export function isNodeIndeterminate(node, selectedIds) {
  if (!node.children?.length) return false;
  const leaves = collectLeafIds(node);
  if (!leaves.length) return false;
  const selected = leaves.filter((id) => selectedIds.includes(id));
  return selected.length > 0 && selected.length < leaves.length;
}

/** Toggle parent: select all leaves or clear all leaves */
export function toggleNodeSelection(node, selectedIds, checked) {
  const leaves = node.children?.length ? collectLeafIds(node) : [node.id];
  const next = new Set(selectedIds.filter((id) => id !== "*"));
  if (checked) leaves.forEach((id) => next.add(id));
  else leaves.forEach((id) => next.delete(id));
  return [...next];
}
