import { useState, useCallback } from 'react';
import {
  validateEmail,
  validatePhone,
  validateProductTitle,
  validateProductDescription,
  validatePrice,
  validateUrl,
  type VALIDATION_RULES,
} from '@/lib/security';

type ValidationRule<T> = {
  validator: (value: T) => { valid: boolean; error?: string };
  required?: boolean;
};

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

/**
 * Generic form validation hook
 */
export function useValidation<T extends Record<string, unknown>>(
  rules: ValidationRules<T>
) {
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);

  const validateField = useCallback(
    (field: keyof T, value: unknown): string | undefined => {
      const rule = rules[field];
      if (!rule) return undefined;

      if (rule.required && (value === undefined || value === null || value === '')) {
        return 'This field is required';
      }

      if (value !== undefined && value !== null && value !== '') {
        const result = rule.validator(value as T[keyof T]);
        return result.error;
      }

      return undefined;
    },
    [rules]
  );

  const validateAll = useCallback(
    (data: T): { valid: boolean; errors: ValidationErrors<T> } => {
      const newErrors: ValidationErrors<T> = {};
      let isValid = true;

      for (const field of Object.keys(rules) as Array<keyof T>) {
        const error = validateField(field, data[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      }

      setErrors(newErrors);
      return { valid: isValid, errors: newErrors };
    },
    [rules, validateField]
  );

  const handleBlur = useCallback(
    (field: keyof T, value: unknown) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField]
  );

  const handleChange = useCallback(
    (field: keyof T, value: unknown) => {
      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [touched, validateField]
  );

  const clearError = useCallback((field: keyof T) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({} as Record<keyof T, boolean>);
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAll,
    handleBlur,
    handleChange,
    clearError,
    clearAllErrors,
    reset,
  };
}

/**
 * Pre-configured validation hooks for common forms
 */

export function useProductValidation() {
  return useValidation<{
    title: string;
    description: string;
    price: number;
    category: string;
  }>({
    title: {
      validator: validateProductTitle,
      required: true,
    },
    description: {
      validator: validateProductDescription,
      required: false,
    },
    price: {
      validator: validatePrice,
      required: true,
    },
    category: {
      validator: (value: string) => ({
        valid: value.length > 0,
        error: value.length > 0 ? undefined : 'Category is required',
      }),
      required: true,
    },
  });
}

export function useCheckoutValidation() {
  return useValidation<{
    email: string;
    phone: string;
    address: string;
    city: string;
  }>({
    email: {
      validator: validateEmail,
      required: true,
    },
    phone: {
      validator: validatePhone,
      required: true,
    },
    address: {
      validator: (value: string) => ({
        valid: value.length >= 5,
        error: value.length >= 5 ? undefined : 'Address must be at least 5 characters',
      }),
      required: true,
    },
    city: {
      validator: (value: string) => ({
        valid: value.length >= 2,
        error: value.length >= 2 ? undefined : 'City is required',
      }),
      required: true,
    },
  });
}

export function useUrlValidation() {
  return useValidation<{ url: string }>({
    url: {
      validator: validateUrl,
      required: true,
    },
  });
}
