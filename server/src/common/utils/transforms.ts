// "true"/"1" → true, "false"/"0" → false. Reads the raw query value: the
// global implicit conversion would already have turned "false" into true.
export const toBool = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) => {
  const value = obj[key];
  return value === true || value === 'true' || value === '1'
    ? true
    : value === false || value === 'false' || value === '0'
      ? false
      : value;
};
