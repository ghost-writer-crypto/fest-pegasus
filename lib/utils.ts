export { cn } from "cn";

/**
 * Validates whether a given string is a valid canonical RFC-4122 UUID.
 */
export const isUuid = (val: string | null | undefined): boolean =>
  Boolean(
    val &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val,
      ),
  );
