export const extractModuleSpecifierParts = (specifier: string) => {
  const parts = specifier.split('/');
  const pkgName = parts[0][0] === '@' ? parts.splice(0, 2).join('/') : parts.shift();
  return {
    pkgName,
    filepath: parts.join('/'),
  };
};

export const isModuleSpecifier = (specifier: string): boolean => {
  return /^(\w|@\w|@-)/.test(specifier);
};
