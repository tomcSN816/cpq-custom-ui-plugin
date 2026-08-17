'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { initConfig, updateConfig } from '@/lib/logik';

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
  const fieldsRef               = useRef({});

  useEffect(() => {
    const productId   = process.env.NEXT_PUBLIC_LOGIK_PRODUCT_ID;
    const pricebookId = process.env.NEXT_PUBLIC_LOGIK_PRICEBOOK_ID || undefined;

    initConfig(productId, pricebookId)
      .then((data) => {
        const map = buildFieldMap(data.fields ?? []);
        fieldsRef.current = map;
        setFields(map);
        setUuid(data.uuid);
      })
      .catch(() => setMessages([{ type: 'error', message: 'Failed to initialize.' }]))
      .finally(() => setLoading(false));
  }, []);

  const applyResponse = useCallback((data) => {
    const next = { ...fieldsRef.current };
    for (const f of data.fields ?? []) next[f.variableName] = f;
    fieldsRef.current = next;
    setFields({ ...next });
    setMessages(data.messages ?? []);
  }, []);

  const update = useCallback(async (variableName, value) => {
    if (!uuid) return;
    setLoading(true);
    try {
      const data = await updateConfig(uuid, [{ variableName, value }]);
      applyResponse(data);
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
      applyResponse(data);
    } catch (err) {
      console.error('Picker select error', err);
    }
  }, [uuid, applyResponse]);

  return { fields, loading, messages, uuid, update, updatePickerSelect };
}
