'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { initConfig, updateConfig, getBom } from '@/lib/logik';

function buildFieldMap(fieldsArray) {
  const map = {};
  for (const f of fieldsArray) map[f.variableName] = f;
  return map;
}

export function useConfigurator() {
  const [fields, setFields]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [messages, setMessages] = useState([]);
  const [uuid, setUuid]         = useState(null);
  // The BOM (bill of materials) — the list of priced line items for the
  // current configuration. `products`/`total` on the init/update response
  // itself are unreliable (Logik often returns `products: null` and no
  // `total` on ordinary field updates) — always refresh via the dedicated
  // GET /api/{uuid}/bom endpoint (see lib/logik.js `getBom`) instead.
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(null);
  const fieldsRef               = useRef({});

  useEffect(() => {
    const productId   = process.env.NEXT_PUBLIC_LOGIK_PRODUCT_ID;
    const pricebookId = process.env.NEXT_PUBLIC_LOGIK_PRICEBOOK_ID || undefined;

    initConfig(productId, pricebookId)
      .then(async (data) => {
        const map = buildFieldMap(data.fields ?? []);
        fieldsRef.current = map;
        setFields(map);
        setUuid(data.uuid);
        const bom = await getBom(data.uuid).catch(() => null);
        setProducts(bom?.products ?? data.products ?? []);
        setTotal(bom?.total ?? data.total ?? null);
      })
      .catch(() => setMessages([{ type: 'error', message: 'Failed to initialize.' }]))
      .finally(() => setLoading(false));
  }, []);

  const applyResponse = useCallback(async (data) => {
    const next = { ...fieldsRef.current };
    for (const f of data.fields ?? []) next[f.variableName] = f;
    fieldsRef.current = next;
    setFields({ ...next });
    setMessages(data.messages ?? []);

    const bom = await getBom(data.uuid).catch(() => null);
    if (bom) {
      setProducts(bom.products ?? []);
      setTotal(bom.total ?? null);
    }
    // If the BOM fetch itself fails, keep showing the last known-good BOM
    // rather than clearing it — don't fall back to data.products/data.total
    // here, since those are the unreliable inline values this exists to avoid.
  }, []);

  const update = useCallback(async (variableName, value) => {
    if (!uuid) return;
    setLoading(true);
    try {
      const data = await updateConfig(uuid, [{ variableName, value }]);
      await applyResponse(data);
    } finally {
      setLoading(false);
    }
  }, [uuid, applyResponse]);

  const updatePickerSelect = useCallback(async (selectVarName, selected, pickerVarName, rowIndex) => {
    if (!uuid) return;

    const current = fieldsRef.current[pickerVarName];
    if (current?.rows?.content?.[rowIndex] !== undefined) {
      const rows = current.rows.content.map((r, i) =>
        i !== rowIndex ? r : { ...r, [selectVarName]: { value: selected, userEdited: true } }
      );
      const updated = { ...current, rows: { ...current.rows, content: rows } };
      fieldsRef.current = { ...fieldsRef.current, [pickerVarName]: updated };
      setFields({ ...fieldsRef.current });
    }

    try {
      const data = await updateConfig(uuid, [
        { variableName: selectVarName, value: selected, set: pickerVarName, index: rowIndex },
      ]);
      await applyResponse(data);
    } catch (err) {
      console.error('Picker select error', err);
    }
  }, [uuid, applyResponse]);

  return { fields, loading, messages, uuid, products, total, update, updatePickerSelect };
}
