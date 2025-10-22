import { useCallback, useMemo, useState } from 'react';

export type FormErrors<TField extends string> = Partial<Record<TField, string>>;

export const useFormValidation = <TField extends string>() => {
  const [errors, setErrors] = useState<FormErrors<TField>>({});

  const setError = useCallback((field: TField, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field: TField) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const resetErrors = useCallback(() => setErrors({}), []);

  const getError = useCallback(
    (field: TField) => errors[field],
    [errors]
  );

  const require = useCallback(
    (field: TField, value: unknown, message: string) => {
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        setError(field, message);
        return false;
      }

      clearError(field);
      return true;
    },
    [clearError, setError]
  );

  const validate = useCallback(
    (field: TField, predicate: () => boolean, message: string) => {
      const isValid = predicate();
      if (!isValid) {
        setError(field, message);
        return false;
      }
      clearError(field);
      return true;
    },
    [clearError, setError]
  );

  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);

  return {
    errors,
    setError,
    clearError,
    resetErrors,
    getError,
    require,
    validate,
    hasErrors,
  };
};

export default useFormValidation;
