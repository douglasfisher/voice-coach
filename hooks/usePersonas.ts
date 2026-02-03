import { useEffect } from 'react';
import { usePersonaStore } from '../stores';
import { ChallengeStyle } from '../types/persona';

export function usePersonas() {
  const { personas, isLoading, error, fetchPersonas, getPersonaById, getPersonasByStyle } =
    usePersonaStore();

  useEffect(() => {
    if (personas.length === 0) {
      fetchPersonas();
    }
  }, [personas.length, fetchPersonas]);

  return {
    personas,
    isLoading,
    error,
    getPersonaById,
    getPersonasByStyle,
    refresh: fetchPersonas,
  };
}

export function usePersona(id: string | undefined) {
  const { personas, isLoading, fetchPersonas, getPersonaById } = usePersonaStore();

  useEffect(() => {
    if (personas.length === 0) {
      fetchPersonas();
    }
  }, [personas.length, fetchPersonas]);

  return {
    persona: id ? getPersonaById(id) : undefined,
    isLoading,
  };
}

export function usePersonasByStyle(style: ChallengeStyle) {
  const { personas, isLoading, fetchPersonas, getPersonasByStyle } = usePersonaStore();

  useEffect(() => {
    if (personas.length === 0) {
      fetchPersonas();
    }
  }, [personas.length, fetchPersonas]);

  return {
    personas: getPersonasByStyle(style),
    isLoading,
  };
}
