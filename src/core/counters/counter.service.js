import Counter from "./counter.model.js";

/**
 * Atomic sequential code: ENQ-1043, PRJ-0039, QT-5236, TSK-0004, WFL-0006, VND-0003
 * @param {string} counterId - e.g. ENQ, PRJ
 * @param {string} prefix - display prefix e.g. ENQ-
 * @param {number} pad - zero-pad width for numeric part
 * @param {number} [startAt] - minimum sequence (seed alignment)
 */
export async function nextCode(counterId, prefix, pad = 4, startAt = 1) {
  const doc = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const num = Math.max(doc.seq, startAt);
  if (num !== doc.seq) {
    await Counter.findByIdAndUpdate(counterId, { seq: num });
  }
  return `${prefix}${String(num).padStart(pad, "0")}`;
}

/** Preview next code without incrementing the counter (for forms). */
export async function peekCode(counterId, prefix, pad = 4, startAt = 1) {
  const doc = await Counter.findById(counterId);
  const num = Math.max((doc?.seq ?? 0) + 1, startAt);
  return `${prefix}${String(num).padStart(pad, "0")}`;
}

/** Set counter after seed so next auto-code continues from max existing */
export async function syncCounterFromMax(counterId, maxSeq) {
  const existing = await Counter.findById(counterId);
  if (!existing || existing.seq < maxSeq) {
    await Counter.findByIdAndUpdate(
      counterId,
      { seq: maxSeq },
      { upsert: true },
    );
  }
}
