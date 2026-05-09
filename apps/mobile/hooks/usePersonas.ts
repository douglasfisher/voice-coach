import { useEffect } from 'react';
import { usePersonaStore } from '../stores';
import { ChallengeStyle } from '../types/persona';

export function usePersonas() {
  const personas = usePersonaStore((s) => s.personas);
  const isLoading = usePersonaStore((s) => s.isLoading);
  const error = usePersonaStore((s) => s.error);
  const fetchPersonas = usePersonaStore((s) => s.fetchPersonas);
  const getPersonaById = usePersonaStore((s) => s.getPersonaById);
  const getPersonasByStyle = usePersonaStore((s) => s.getPersonasByStyle);

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
  const personas = usePersonaStore((s) => s.personas);
  const isLoading = usePersonaStore((s) => s.isLoading);
  const fetchPersonas = usePersonaStore((s) => s.fetchPersonas);
  const getPersonaById = usePersonaStore((s) => s.getPersonaById);

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
  const personas = usePersonaStore((s) => s.personas);
  const isLoading = usePersonaStore((s) => s.isLoading);
  const fetchPersonas = usePersonaStore((s) => s.fetchPersonas);
  const getPersonasByStyle = usePersonaStore((s) => s.getPersonasByStyle);

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
