import { Facet } from '@codemirror/state';

export function createUseLastOrThrow(message: string) {
  const fallback = new Proxy(
    {},
    {
      get() {
        throw new Error(message);
      },
    },
  );

  return function useLastOrThrow<T>(values: readonly T[]): T {
    return values.at(-1) ?? (fallback as T);
  };
}

export const documentUri = Facet.define<string, string>({
  combine: createUseLastOrThrow(
    'No document URI provided. Either pass a one into the extension or use documentUri.of().',
  ),
});

export const languageId = Facet.define<string, string>({
  combine: createUseLastOrThrow(
    'No language ID provided. Either pass a one into the extension or use languageId.of().',
  ),
});
